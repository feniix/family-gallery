import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import MediaAccessControl, { createUserPermissions, UserPermissions } from '@/lib/access-control';
import { getAllMediaAcrossYears } from '@/lib/json-db';
import { dbLogger } from '@/lib/logger';
import { MediaMetadata } from '@/types/media';

const accessControl = new MediaAccessControl();

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'accessible-media':
        return await handleGetAccessibleMedia(userId, searchParams);
      
      case 'analytics':
        return await handleGetAnalytics(userId, searchParams);
      
      case 'tag-suggestions':
        return await handleGetTagSuggestions(userId, searchParams);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    dbLogger.error('Error in access control API:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'advanced-search':
        return await handleAdvancedSearch(userId, body);
      
      case 'bulk-update':
        return await handleBulkUpdate(userId, body);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    dbLogger.error('Error in access control API POST:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGetAccessibleMedia(userId: string, searchParams: URLSearchParams) {
  const role = searchParams.get('role') as UserPermissions['role'] || 'family';
  const tags = searchParams.get('tags')?.split(',').filter(Boolean);
  const subjects = searchParams.get('subjects')?.split(',').filter(Boolean);
  const visibility = searchParams.get('visibility')?.split(',').filter(Boolean);
  const search = searchParams.get('search') || undefined;
  
  const dateStart = searchParams.get('dateStart');
  const dateEnd = searchParams.get('dateEnd');
  const dateRange = dateStart && dateEnd ? { start: dateStart, end: dateEnd } : undefined;

  const userPermissions = createUserPermissions(userId, role);
  const allMedia = await getAllMediaAcrossYears();

  const accessibleMedia = await accessControl.getAccessibleMedia(
    userId,
    userPermissions,
    allMedia.map((media: MediaMetadata) => ({
      ...media,
      visibility: 'family' as const // Default visibility for existing media
    })),
    {
      tags,
      subjects,
      dateRange,
      visibility,
      search
    }
  );

  return NextResponse.json({
    media: accessibleMedia,
    count: accessibleMedia.length
  });
}

async function handleGetAnalytics(userId: string, searchParams: URLSearchParams) {
  const role = searchParams.get('role') as UserPermissions['role'] || 'family';
  const userPermissions = createUserPermissions(userId, role);
  const allMedia = await getAllMediaAcrossYears();

  const analytics = await accessControl.getMediaAnalytics(
    userId,
    userPermissions,
    allMedia.map((media: MediaMetadata) => ({
      ...media,
      visibility: 'family' as const
    }))
  );

  return NextResponse.json(analytics);
}

async function handleGetTagSuggestions(userId: string, searchParams: URLSearchParams) {
  const role = searchParams.get('role') as UserPermissions['role'] || 'family';
  const query = searchParams.get('query') || undefined;
  
  const userPermissions = createUserPermissions(userId, role);
  const allMedia = await getAllMediaAcrossYears();

  const suggestions = await accessControl.getTagSuggestions(
    userId,
    userPermissions,
    allMedia.map((media: MediaMetadata) => ({
      ...media,
      visibility: 'family' as const
    })),
    query
  );

  return NextResponse.json({ suggestions });
}

async function handleAdvancedSearch(userId: string, body: { role?: string; searchParams: Record<string, unknown> }) {
  const { role = 'family', searchParams } = body;
  const userPermissions = createUserPermissions(userId, role as UserPermissions['role']);
  const allMedia = await getAllMediaAcrossYears();

  const results = await accessControl.advancedSearch(
    userId,
    userPermissions,
    allMedia.map((media: MediaMetadata) => ({
      ...media,
      visibility: 'family' as const
    })),
    searchParams
  );

  return NextResponse.json({
    results,
    count: results.length
  });
}

async function handleBulkUpdate(userId: string, body: { role?: string; mediaIds: string[]; updates: Record<string, unknown> }) {
  const { role = 'family', mediaIds, updates } = body;
  const userPermissions = createUserPermissions(userId, role as UserPermissions['role']);

  const result = await accessControl.bulkUpdatePermissions(
    userId,
    userPermissions,
    mediaIds,
    updates
  );

  return NextResponse.json(result);
} 