import { useState, useEffect, useCallback, useRef } from 'react';
import { authenticatedFetch } from '@/lib/api-client';

interface SignedUrlResponse {
  signedUrl: string;
  expiresIn: number;
  expiresAt: string;
  mediaId: string;
  filename: string;
  isThumbnail: boolean;
}

interface SignedUrlCache {
  url: string;
  expiresAt: Date;
  mediaId: string;
  isThumbnail: boolean;
}

// Global cache for signed URLs
const signedUrlCache = new Map<string, SignedUrlCache>();

// Cache cleanup interval (every 5 minutes)
setInterval(() => {
  const now = new Date();
  for (const [key, cached] of signedUrlCache.entries()) {
    if (cached.expiresAt <= now) {
      signedUrlCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface UseSignedUrlOptions {
  mediaId: string;
  isThumbnail?: boolean;
  expiresIn?: number; // seconds
  enabled?: boolean;
  refreshBuffer?: number; // seconds before expiry to refresh (default: 300 = 5 minutes)
}

interface UseSignedUrlResult {
  url: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSignedUrl({
  mediaId,
  isThumbnail = false,
  expiresIn = 3600, // 1 hour default
  enabled = true,
  refreshBuffer = 300 // 5 minutes
}: UseSignedUrlOptions): UseSignedUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate cache key
  const cacheKey = `${mediaId}_${isThumbnail ? 'thumb' : 'full'}`;

  const fetchSignedUrl = useCallback(async () => {
    if (!enabled || !mediaId) return;

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = signedUrlCache.get(cacheKey);
      const now = new Date();
      
      if (cached && cached.expiresAt > new Date(now.getTime() + refreshBuffer * 1000)) {
        setUrl(cached.url);
        setLoading(false);
        
        // Schedule refresh before expiry
        const timeUntilRefresh = cached.expiresAt.getTime() - now.getTime() - (refreshBuffer * 1000);
        if (timeUntilRefresh > 0) {
          refreshTimeoutRef.current = setTimeout(() => fetchSignedUrl(), timeUntilRefresh);
        }
        return;
      }

      // Fetch new signed URL
      const params = new URLSearchParams();
      if (isThumbnail) params.set('thumbnail', 'true');
      if (expiresIn !== 3600) params.set('expires', expiresIn.toString());

      const response = await authenticatedFetch(
        `/api/media/signed-url/${mediaId}?${params.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to get signed URL (${response.status}): ${errorText}`);
      }

      const data: SignedUrlResponse = await response.json();
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Signed URL generated:', {
          mediaId,
          isThumbnail,
          signedUrl: data.signedUrl,
          expiresAt: data.expiresAt
        });
      }
      
      // Cache the result
      const expiresAt = new Date(data.expiresAt);
      signedUrlCache.set(cacheKey, {
        url: data.signedUrl,
        expiresAt,
        mediaId: data.mediaId,
        isThumbnail: data.isThumbnail
      });

      setUrl(data.signedUrl);
      
      // Schedule refresh before expiry
      const timeUntilRefresh = expiresAt.getTime() - Date.now() - (refreshBuffer * 1000);
      if (timeUntilRefresh > 0) {
        refreshTimeoutRef.current = setTimeout(() => fetchSignedUrl(), timeUntilRefresh);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get signed URL';
      setError(errorMessage);
      console.error('Error fetching signed URL:', err);
    } finally {
      setLoading(false);
    }
  }, [mediaId, isThumbnail, expiresIn, enabled, cacheKey, refreshBuffer]);

  const refresh = useCallback(async (): Promise<void> => {
    // Clear cache for this item
    signedUrlCache.delete(cacheKey);
    
    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    await fetchSignedUrl();
  }, [cacheKey, fetchSignedUrl]);

  // Initial fetch
  useEffect(() => {
    fetchSignedUrl();
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchSignedUrl]);

  return {
    url,
    loading,
    error,
    refresh
  };
}

// Utility function to preload signed URLs using batch API for better performance
export async function preloadSignedUrls(
  mediaIds: string[], 
  options: { isThumbnail?: boolean; expiresIn?: number } = {}
): Promise<void> {
  const { isThumbnail = false, expiresIn = 3600 } = options;
  
  // Filter out already cached URLs
  const uncachedIds = mediaIds.filter(mediaId => {
    const cacheKey = `${mediaId}_${isThumbnail ? 'thumb' : 'full'}`;
    const cached = signedUrlCache.get(cacheKey);
    return !cached || cached.expiresAt <= new Date(Date.now() + 300 * 1000);
  });

  if (uncachedIds.length === 0) {
    return; // All URLs are already cached
  }

  // Use batch API for efficiency
  if (uncachedIds.length > 1) {
    try {
      const requests = uncachedIds.map(mediaId => ({
        mediaId,
        isThumbnail,
        expiresIn
      }));

      const response = await authenticatedFetch('/api/media/signed-url/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Cache successful results
        for (const result of data.results) {
          if (result.signedUrl && !result.error) {
            const cacheKey = `${result.mediaId}_${result.isThumbnail ? 'thumb' : 'full'}`;
            signedUrlCache.set(cacheKey, {
              url: result.signedUrl,
              expiresAt: new Date(result.expiresAt),
              mediaId: result.mediaId,
              isThumbnail: result.isThumbnail
            });
          }
        }
      }
    } catch (error) {
      console.warn('Batch preload failed, falling back to individual requests:', error);
      
      // Fallback to individual requests
      await preloadSignedUrlsIndividually(uncachedIds, options);
    }
  } else {
    // Single URL, use individual API
    await preloadSignedUrlsIndividually(uncachedIds, options);
  }
}

// Fallback function for individual preloading
async function preloadSignedUrlsIndividually(
  mediaIds: string[],
  options: { isThumbnail?: boolean; expiresIn?: number } = {}
): Promise<void> {
  const { isThumbnail = false, expiresIn = 3600 } = options;
  
  const promises = mediaIds.map(async (mediaId) => {
    try {
      const params = new URLSearchParams();
      if (isThumbnail) params.set('thumbnail', 'true');
      if (expiresIn !== 3600) params.set('expires', expiresIn.toString());

      const response = await authenticatedFetch(
        `/api/media/signed-url/${mediaId}?${params.toString()}`
      );

      if (response.ok) {
        const data: SignedUrlResponse = await response.json();
        const cacheKey = `${mediaId}_${isThumbnail ? 'thumb' : 'full'}`;
        signedUrlCache.set(cacheKey, {
          url: data.signedUrl,
          expiresAt: new Date(data.expiresAt),
          mediaId: data.mediaId,
          isThumbnail: data.isThumbnail
        });
      }
    } catch (error) {
      console.warn(`Failed to preload signed URL for ${mediaId}:`, error);
    }
  });

  await Promise.allSettled(promises);
}

// Utility function to clear cache (useful for logout or manual cache clearing)
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
} 