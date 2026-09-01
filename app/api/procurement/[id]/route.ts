import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockRequestsStore } from '@/lib/server/dataStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id;
  const req = mockRequestsStore.find((r) => r.id === id || r.referenceNumber === id);

  if (!req) {
    return NextResponse.json(
      { error: 'Procurement request not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: req
  });
}
