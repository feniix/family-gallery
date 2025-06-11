import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getIsAdmin } from '@/lib/server-auth';
import { getMediaDb, usersDb, mediaIndexDb, withRetry } from '@/lib/json-db';
import { apiLogger } from '@/lib/logger';
import type { MediaMetadata, UsersData } from '@/types/media';

/**
 * GET /api/admin/stats
 * Get comprehensive statistics for admin dashboard
 */
export async function GET() {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!(await getIsAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    apiLogger.info('Admin statistics requested', { userId });

    // Initialize statistics object
    const stats = {
      media: {
        total: 0,
        images: 0,
        videos: 0,
        byYear: {} as Record<string, number>,
        recentUploads: [] as Array<{
          id: string;
          filename: string;
          uploadedAt: string;
          uploadedBy: string;
          type: 'photo' | 'video';
        }>
      },
      users: {
        total: 0,
        admins: 0,
        regular: 0,
        recentUsers: [] as Array<{
          id: string;
          email: string;
          name: string;
          role: 'admin' | 'user';
          created: string;
          lastLogin?: string;
        }>
      },
      storage: {
        totalFiles: 0,
        estimatedSize: '0 MB',
        years: [] as number[]
      },
      system: {
        version: '4.3.0',
        lastIndexUpdate: new Date().toISOString(),
        dbStatus: 'healthy' as 'healthy' | 'warning' | 'error'
      }
    };

    // Get media statistics
    try {
      const index = await withRetry(() => mediaIndexDb.read());
      stats.storage.years = index.years || [];
      stats.system.lastIndexUpdate = index.lastUpdated || new Date().toISOString();
      
      // Collect all media from all years
      const allMedia: (MediaMetadata & { year: number })[] = [];
      let totalEstimatedSize = 0;

      for (const year of index.years) {
        try {
          const yearDb = getMediaDb(year);
          const yearData = await withRetry(() => yearDb.read());
          
          if (yearData.media && yearData.media.length > 0) {
            stats.media.byYear[year.toString()] = yearData.media.length;
            
            // Add year to each media item for sorting
            const mediaWithYear = yearData.media.map(media => ({ ...media, year }));
            allMedia.push(...mediaWithYear);

            // Estimate size (rough calculation)
            for (const media of yearData.media) {
              if (media.metadata?.size) {
                totalEstimatedSize += media.metadata.size;
              } else {
                // Rough estimate: 3MB for photos, 50MB for videos
                totalEstimatedSize += media.type === 'photo' ? 3 * 1024 * 1024 : 50 * 1024 * 1024;
              }
            }
          }
        } catch (error) {
          apiLogger.warn(`Error reading year ${year}`, { 
            error: error instanceof Error ? error.message : error 
          });
          stats.system.dbStatus = 'warning';
        }
      }

      // Calculate media totals
      stats.media.total = allMedia.length;
      stats.media.images = allMedia.filter(m => m.type === 'photo').length;
      stats.media.videos = allMedia.filter(m => m.type === 'video').length;
      stats.storage.totalFiles = allMedia.length;

      // Format estimated size
      if (totalEstimatedSize > 1024 * 1024 * 1024) {
        stats.storage.estimatedSize = `${(totalEstimatedSize / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      } else if (totalEstimatedSize > 1024 * 1024) {
        stats.storage.estimatedSize = `${(totalEstimatedSize / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        stats.storage.estimatedSize = `${(totalEstimatedSize / 1024).toFixed(1)} KB`;
      }

      // Get recent uploads (last 10)
      const sortedMedia = allMedia
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(0, 10);

      stats.media.recentUploads = sortedMedia.map(media => ({
        id: media.id,
        filename: media.originalFilename,
        uploadedAt: media.uploadedAt,
        uploadedBy: media.uploadedBy,
        type: media.type as 'photo' | 'video'
      }));

    } catch (error) {
      apiLogger.error('Error gathering media statistics', { 
        error: error instanceof Error ? error.message : error 
      });
      stats.system.dbStatus = 'error';
    }

    // Get user statistics
    try {
      const usersData: UsersData = await withRetry(() => usersDb.read());
      const users = Object.values(usersData.users || {});
      
      stats.users.total = users.length;
      stats.users.admins = users.filter(u => u.role === 'admin').length;
      stats.users.regular = users.filter(u => u.role === 'user').length;

      // Get recent users (last 10)
      const sortedUsers = users
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, 10);

      stats.users.recentUsers = sortedUsers.map(user => ({
        id: user.email, // Using email as ID for display
        email: user.email,
        name: user.name || 'Unknown',
        role: user.role,
        created: user.created,
        lastLogin: undefined // Not tracked currently
      }));

    } catch (error) {
      apiLogger.error('Error gathering user statistics', { 
        error: error instanceof Error ? error.message : error 
      });
      stats.system.dbStatus = 'warning';
    }

    apiLogger.info('Admin statistics generated successfully', {
      mediaTotal: stats.media.total,
      userTotal: stats.users.total,
      yearsWithData: stats.storage.years.length,
      dbStatus: stats.system.dbStatus
    });

    return NextResponse.json(stats);

  } catch (error) {
    apiLogger.error('Error in admin stats endpoint', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Failed to generate statistics' },
      { status: 500 }
    );
  }
} 