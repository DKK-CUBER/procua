import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockOffersDatabase } from '@/lib/server/dataStore';

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  let results = [...mockOffersDatabase];
  if (requestId) {
    results = results.filter((o) => o.requestId === requestId);
  }

  return NextResponse.json({
    success: true,
    data: results
  });
}
