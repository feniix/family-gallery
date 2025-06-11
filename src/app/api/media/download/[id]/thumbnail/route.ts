import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/media/download/[id]/thumbnail
 * Redirect to main download endpoint with thumbnail handling
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Redirect to the main download endpoint which handles thumbnails
  const { id } = await params;
  const url = new URL(request.url);
  url.pathname = `/api/media/download/${id}`;
  url.searchParams.set('thumbnail', 'true');
  
  return NextResponse.redirect(url);
} 