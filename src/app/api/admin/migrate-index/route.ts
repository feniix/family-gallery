import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getIsAdmin } from '@/lib/server-auth';
import { buildMediaIndexFromExistingData } from '@/lib/json-db';
import { apiLogger } from '@/lib/logger';

/**
 * POST /api/admin/migrate-index
 * Build media index from existing data (admin only)
 */
export async function POST() {
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

    apiLogger.info('Starting media index migration');
    
    // Run the migration
    const result = await buildMediaIndexFromExistingData();
    
    apiLogger.info('Media index migration completed', result);

    return NextResponse.json({
      success: true,
      message: 'Media index migration completed successfully',
      ...result
    });

  } catch (error) {
    apiLogger.error('Error during index migration', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed' 
      },
      { status: 500 }
    );
  }
} 