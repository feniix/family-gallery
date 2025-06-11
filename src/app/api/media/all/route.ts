import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, mediaIndexDb, withRetry } from '@/lib/json-db';
import type { MediaMetadata } from '@/types/media';

/**
 * GET /api/media/all
 * Retrieve all media metadata across all years
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get all media using the index system - much faster than checking all years
    const allMedia: MediaMetadata[] = [];
    
    try {
      // Read the media index to get which years have data
      const index = await withRetry(() => mediaIndexDb.read());
      console.log(`[MEDIA ALL] Found ${index.years.length} years with media in index:`, index.years);
      
      if (index.years.length === 0) {
        console.log('[MEDIA ALL] No years found in index, returning empty result');
        return NextResponse.json({
          success: true,
          media: [],
          total: 0,
          pagination: { limit, offset: 0, hasMore: false },
        });
      }
      
      // Check only the indexed years in parallel
      const yearPromises = index.years.map(async (year) => {
        try {
          const mediaDb = getMediaDb(year);
          const mediaData = await withRetry(() => mediaDb.read());
          console.log(`[MEDIA ALL] Year ${year}: found ${mediaData.media?.length || 0} media items`);
          return mediaData.media || [];
        } catch (error) {
          console.log(`[MEDIA ALL] Error reading year ${year}:`, error);
          return [];
        }
      });
      
      // Wait for all year checks to complete
      const yearResults = await Promise.allSettled(yearPromises);
      
      // Collect all successful results
      yearResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allMedia.push(...result.value);
        } else if (result.status === 'rejected') {
          console.log(`[MEDIA ALL] Failed to load year ${index}:`, result.reason);
        }
      });
      
    } catch (error) {
      console.error('[MEDIA ALL] Error reading media index, falling back to comprehensive search:', error);
      
      // Fallback: check a limited range if index fails
      const currentYear = new Date().getFullYear();
      const fallbackYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
      
      for (const year of fallbackYears) {
        try {
          const mediaDb = getMediaDb(year);
          const mediaData = await withRetry(() => mediaDb.read());
          if (mediaData.media && mediaData.media.length > 0) {
            allMedia.push(...mediaData.media);
          }
        } catch {
          // Continue with next year
        }
      }
    }

    // If no media found, return empty result immediately
    if (allMedia.length === 0) {
      return NextResponse.json({
        success: true,
        media: [],
        total: 0,
        pagination: {
          limit,
          offset: 0,
          hasMore: false,
        },
      });
    }

    // Sort all media by takenAt date (newest first)
    allMedia.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());

    // Apply pagination
    const paginatedMedia = allMedia.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      media: paginatedMedia,
      total: allMedia.length,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < allMedia.length,
      },
    });

  } catch (error) {
    console.error('Error retrieving all media:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve media' },
      { status: 500 }
    );
  }
} 