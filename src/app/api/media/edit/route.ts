import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, withRetry, removeYearFromIndex, updateIndexMediaCount } from '@/lib/json-db';
import { getIsAdmin } from '@/lib/server-auth';
import { apiLogger } from '@/lib/logger';
import type { MediaMetadata } from '@/types/media';

interface MediaUpdateRequest {
  mediaId: string;
  updates: Partial<MediaMetadata>;
}

/**
 * PUT /api/media/edit
 * Edit media metadata (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdminUser = await getIsAdmin();
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body: MediaUpdateRequest = await request.json();
    const { mediaId, updates } = body;

    if (!mediaId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ 
        error: 'Media ID and updates object required' 
      }, { status: 400 });
    }

    // Handle date changes specially as they might require moving between year databases
    if (updates.takenAt) {
      return await handleDateUpdate(mediaId, updates);
    }

    // Handle regular metadata updates
    return await handleMetadataUpdate(mediaId, updates);

  } catch (error) {
    apiLogger.error('Error editing media', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleDateUpdate(mediaId: string, updates: Partial<MediaMetadata>) {
  const newDate = new Date(updates.takenAt!);
  if (isNaN(newDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  const newYear = newDate.getFullYear();
  
  // Find the media item across all years
  const currentYear = new Date().getFullYear();
  const yearsToCheck = Array.from({ length: 20 }, (_, i) => currentYear - i + 5);
  let foundMedia: MediaMetadata | null = null;
  let oldYear: number | null = null;

  for (const year of yearsToCheck) {
    try {
      const yearDb = getMediaDb(year);
      const yearData = await yearDb.read();
      
      const mediaIndex = yearData.media.findIndex(media => media.id === mediaId);
      if (mediaIndex !== -1) {
        foundMedia = { ...yearData.media[mediaIndex] };
        oldYear = year;
        
        // Remove from old year database
        yearData.media.splice(mediaIndex, 1);
        await yearDb.write(yearData);
        
        // If this year now has no media, remove it from the index
        if (yearData.media.length === 0) {
          await removeYearFromIndex(year);
        }
        
        break;
      }
    } catch {
      // Year database doesn't exist, continue
      continue;
    }
  }

  if (!foundMedia || !oldYear) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // Update the media with new data
  const updatedMedia: MediaMetadata = {
    ...foundMedia,
    ...updates,
    takenAt: newDate.toISOString(),
    dateInfo: {
      source: 'upload-time',
      confidence: 'high'
    }
  };

  // Add to new year database
  await withRetry(() =>
    getMediaDb(newYear).update((current) => {
      // Check for duplicates in the new year
      const existingIndex = current.media.findIndex(m => m.id === mediaId);
      
      if (existingIndex !== -1) {
        // Update existing
        current.media[existingIndex] = updatedMedia;
      } else {
        // Add new
        current.media.push(updatedMedia);
      }

      // Sort by takenAt date (newest first)
      current.media.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
      
      return current;
    })
  );

  // Update media index
  await updateIndexMediaCount();

  apiLogger.info('Media date updated', {
    mediaId,
    oldYear,
    newYear,
    oldDate: foundMedia.takenAt,
    newDate: newDate.toISOString()
  });

  return NextResponse.json({
    success: true,
    mediaId,
    oldYear,
    newYear,
    updatedMedia
  });
}

async function handleMetadataUpdate(mediaId: string, updates: Partial<MediaMetadata>) {
  // Find the media item across all years
  const currentYear = new Date().getFullYear();
  const yearsToCheck = Array.from({ length: 20 }, (_, i) => currentYear - i + 5);
  let found = false;

  for (const year of yearsToCheck) {
    try {
      const yearDb = getMediaDb(year);
      const yearData = await yearDb.read();
      
      const mediaIndex = yearData.media.findIndex(media => media.id === mediaId);
      if (mediaIndex !== -1) {
        // Update the metadata
        const currentMedia = yearData.media[mediaIndex];
        const updatedMedia = {
          ...currentMedia,
          ...updates
        };
        
        yearData.media[mediaIndex] = updatedMedia;
        
        // Save back to database
        await yearDb.write(yearData);
        
        apiLogger.info('Media metadata updated', {
          mediaId,
          updates,
          year
        });
        
        found = true;
        
        return NextResponse.json({
          success: true,
          mediaId,
          updatedMedia
        });
      }
    } catch {
      // Year database doesn't exist, continue
      continue;
    }
  }

  if (!found) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // This should never be reached due to early return above
  return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
} 