import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, mediaIndexDb, withRetry } from '@/lib/json-db';
import { apiLogger } from '@/lib/logger';
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
      apiLogger.info('Fetching all media using index', { 
        yearsInIndex: index.years.length, 
        years: index.years,
        requestedOffset: offset,
        requestedLimit: limit
      });
      
      if (index.years.length === 0) {
        apiLogger.info('No years found in index, returning empty result');
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
          const itemCount = mediaData.media?.length || 0;
          if (itemCount > 0) {
            apiLogger.debug(`Loaded media for year ${year}`, { count: itemCount });
          }
          return mediaData.media || [];
        } catch (error) {
          apiLogger.warn(`Error reading year ${year}`, { error: error instanceof Error ? error.message : error });
          return [];
        }
      });
      
      // Wait for all year checks to complete
      const yearResults = await Promise.allSettled(yearPromises);
      
      // Collect all successful results
      yearResults.forEach((result, yearIndex) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allMedia.push(...result.value);
        } else if (result.status === 'rejected') {
          apiLogger.error(`Failed to load year at index ${yearIndex}`, { reason: result.reason });
        }
      });
      
    } catch (error) {
      apiLogger.error('Error reading media index, falling back to comprehensive search', { 
        error: error instanceof Error ? error.message : error 
      });
      
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

    apiLogger.info('Media fetch completed', {
      totalFound: allMedia.length,
      returned: paginatedMedia.length,
      pagination: { limit, offset, hasMore: offset + limit < allMedia.length }
    });

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
    apiLogger.error('Error retrieving all media', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to retrieve media' },
      { status: 500 }
    );
  }
} 