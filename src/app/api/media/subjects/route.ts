import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, configDb } from '@/lib/json-db';
import { MediaMetadata } from '@/types/media';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/media/subjects
 * Get available subjects and optionally filter media by subjects
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // Comma-separated list of subjects
    const action = searchParams.get('action') || 'list'; // 'list' or 'filter'

    apiLogger.debug('Subjects API request', { action, filter, userId });

    // Get available subjects from config
    const config = await configDb.read();
    const availableSubjects = config.subjects || ['rufina', 'bernabe'];

    if (action === 'list') {
      // Just return available subjects
      return NextResponse.json({
        subjects: availableSubjects
      });
    }

    if (action === 'filter') {
      // Filter media by subjects
      const selectedSubjects = filter ? filter.split(',').map(s => s.trim().toLowerCase()) : [];
      
      if (selectedSubjects.length === 0) {
        return NextResponse.json({
          subjects: availableSubjects,
          media: [],
          totalCount: 0
        });
      }

      // Get all media from all years
      const currentYear = new Date().getFullYear();
      const yearsToCheck = [currentYear, currentYear - 1, currentYear - 2]; // Check current and last 2 years
      const allFilteredMedia: MediaMetadata[] = [];

      for (const year of yearsToCheck) {
        try {
          const yearDb = getMediaDb(year);
          const yearData = await yearDb.read();
          
          // Filter media by subjects
          const filteredMedia = yearData.media.filter(media => {
            if (!media.subjects || media.subjects.length === 0) {
              return false;
            }
            
            // Check if any of the selected subjects are in the media's subjects
            return selectedSubjects.some(selectedSubject => 
              media.subjects.some(mediaSubject => 
                mediaSubject.toLowerCase() === selectedSubject
              )
            );
          });

          allFilteredMedia.push(...filteredMedia);
        } catch {
          // Year database doesn't exist or is empty, continue
          apiLogger.debug(`No media found for year ${year}`);
        }
      }

      // Sort by takenAt date (newest first)
      allFilteredMedia.sort((a, b) => 
        new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
      );

      apiLogger.info('Media filtered by subjects', {
        selectedSubjects,
        totalCount: allFilteredMedia.length,
        userId
      });

      return NextResponse.json({
        subjects: availableSubjects,
        selectedSubjects,
        media: allFilteredMedia,
        totalCount: allFilteredMedia.length
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    apiLogger.error('Error in subjects API', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media/subjects
 * Update subjects for a media item (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, allow any authenticated user to tag subjects
    // In the future, we might want to restrict this to admins
    
    const body = await request.json();
    const { mediaId, subjects } = body;

    if (!mediaId || !Array.isArray(subjects)) {
      return NextResponse.json(
        { error: 'Missing required fields: mediaId, subjects' },
        { status: 400 }
      );
    }

    // Validate subjects against available subjects
    const config = await configDb.read();
    const availableSubjects = config.subjects || ['rufina', 'bernabe'];
    
    const invalidSubjects = subjects.filter(subject => 
      !availableSubjects.includes(subject.toLowerCase())
    );
    
    if (invalidSubjects.length > 0) {
      return NextResponse.json(
        { error: `Invalid subjects: ${invalidSubjects.join(', ')}. Available: ${availableSubjects.join(', ')}` },
        { status: 400 }
      );
    }

    // Find the media item across all years
    const currentYear = new Date().getFullYear();
    const yearsToCheck = [currentYear, currentYear - 1, currentYear - 2];
    let found = false;

    for (const year of yearsToCheck) {
      try {
        const yearDb = getMediaDb(year);
        const yearData = await yearDb.read();
        
        const mediaIndex = yearData.media.findIndex(media => media.id === mediaId);
        if (mediaIndex !== -1) {
          // Update the subjects
          yearData.media[mediaIndex].subjects = subjects.map(s => s.toLowerCase());
          
          // Save back to database
          await yearDb.write(yearData);
          
          apiLogger.info('Media subjects updated', {
            mediaId,
            subjects,
            year,
            userId
          });
          
          found = true;
          break;
        }
              } catch {
          // Year database doesn't exist, continue
          continue;
        }
    }

    if (!found) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      mediaId,
      subjects
    });

  } catch (error) {
    apiLogger.error('Error updating media subjects', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 