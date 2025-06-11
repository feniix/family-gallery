import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getIsAdmin } from '@/lib/server-auth';
import { buildMediaIndexFromExistingData } from '@/lib/json-db';

/**
 * POST /api/admin/migrate-index
 * Build media index from existing data (admin only)
 */
export async function POST(request: NextRequest) {
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

    console.log('[MIGRATE INDEX] Starting media index migration...');
    
    // Run the migration
    const result = await buildMediaIndexFromExistingData();
    
    console.log('[MIGRATE INDEX] Migration completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Media index migration completed',
      yearsFound: result.yearsFound,
      totalMedia: result.totalMedia,
    });

  } catch (error) {
    console.error('Error during index migration:', error);
    return NextResponse.json(
      { error: 'Failed to migrate index' },
      { status: 500 }
    );
  }
} 