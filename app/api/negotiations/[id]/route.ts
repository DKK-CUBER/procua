import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockNegotiationsStore } from '@/lib/server/dataStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const session = mockNegotiationsStore.find(
    (n) => n.id === id || n.sessionCode?.toLowerCase() === id.toLowerCase() || n.supplierId === id || n.id.includes(id)
  ) || mockNegotiationsStore[0];

  return NextResponse.json({
    success: true,
    data: session
  });
}
