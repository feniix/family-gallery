import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb } from '@/lib/json-db';
import { getIsAdmin } from '@/lib/server-auth';
import { apiLogger } from '@/lib/logger';

interface BulkOperationRequest {
  action: 'delete' | 'add-tags' | 'remove-tags' | 'set-tags';
  mediaIds: string[];
  tags?: string[];
}

/**
 * POST /api/media/bulk
 * Perform bulk operations on media items (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdminUser = await getIsAdmin();
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body: BulkOperationRequest = await request.json();
    const { action, mediaIds, tags } = body;

    if (!action || !mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ 
        error: 'Action and mediaIds array required' 
      }, { status: 400 });
    }

    switch (action) {
      case 'delete':
        return await handleBulkDelete(mediaIds);
      
      case 'add-tags':
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({ error: 'Tags array required for add-tags action' }, { status: 400 });
        }
        return await handleBulkTagOperation(mediaIds, tags, 'add');
      
      case 'remove-tags':
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({ error: 'Tags array required for remove-tags action' }, { status: 400 });
        }
        return await handleBulkTagOperation(mediaIds, tags, 'remove');
      
      case 'set-tags':
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({ error: 'Tags array required for set-tags action' }, { status: 400 });
        }
        return await handleBulkTagOperation(mediaIds, tags, 'set');
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    apiLogger.error('Error in bulk operation', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleBulkDelete(mediaIds: string[]) {
  const currentYear = new Date().getFullYear();
  const yearsToCheck = Array.from({ length: 20 }, (_, i) => currentYear - i + 5);
  let deletedCount = 0;
  const errors: string[] = [];

  for (const year of yearsToCheck) {
    try {
      const yearDb = getMediaDb(year);
      const yearData = await yearDb.read();
      
      const originalCount = yearData.media.length;
      yearData.media = yearData.media.filter(media => !mediaIds.includes(media.id));
      const deletedInYear = originalCount - yearData.media.length;
      
      if (deletedInYear > 0) {
        await yearDb.write(yearData);
        deletedCount += deletedInYear;
        
        apiLogger.info('Bulk delete completed for year', {
          year,
          deletedCount: deletedInYear
        });
      }
    } catch (error) {
      const errorMsg = `Failed to delete from year ${year}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      apiLogger.error('Error in bulk delete for year', { year, error });
    }
  }

  return NextResponse.json({
    success: true,
    deletedCount,
    errors: errors.length > 0 ? errors : undefined
  });
}

async function handleBulkTagOperation(
  mediaIds: string[], 
  tags: string[], 
  operation: 'add' | 'remove' | 'set'
) {
  const normalizedTags = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
  const currentYear = new Date().getFullYear();
  const yearsToCheck = Array.from({ length: 20 }, (_, i) => currentYear - i + 5);
  let updatedCount = 0;
  const errors: string[] = [];

  for (const year of yearsToCheck) {
    try {
      const yearDb = getMediaDb(year);
      const yearData = await yearDb.read();
      
      let yearUpdated = false;
      
      yearData.media.forEach(media => {
        if (mediaIds.includes(media.id)) {
          const originalTags = media.tags || [];
          
          switch (operation) {
            case 'add':
              const newTags = [...new Set([...originalTags, ...normalizedTags])];
              if (newTags.length !== originalTags.length) {
                media.tags = newTags;
                yearUpdated = true;
                updatedCount++;
              }
              break;
              
            case 'remove':
              const filteredTags = originalTags.filter(tag => !normalizedTags.includes(tag));
              if (filteredTags.length !== originalTags.length) {
                media.tags = filteredTags;
                yearUpdated = true;
                updatedCount++;
              }
              break;
              
            case 'set':
              media.tags = normalizedTags;
              yearUpdated = true;
              updatedCount++;
              break;
          }
        }
      });

      if (yearUpdated) {
        await yearDb.write(yearData);
        
        apiLogger.info('Bulk tag operation completed for year', {
          year,
          operation,
          tags: normalizedTags
        });
      }
    } catch (error) {
      const errorMsg = `Failed to update tags for year ${year}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      apiLogger.error('Error in bulk tag operation for year', { year, operation, error });
    }
  }

  return NextResponse.json({
    success: true,
    updatedCount,
    operation,
    tags: normalizedTags,
    errors: errors.length > 0 ? errors : undefined
  });
} 