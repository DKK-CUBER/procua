import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockDocumentsStore } from '@/lib/server/dataStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const doc = mockDocumentsStore.find(
    (d) => d.id === id || d.documentNumber?.toLowerCase() === id.toLowerCase() || d.id.includes(id)
  ) || mockDocumentsStore[0];

  return NextResponse.json({
    success: true,
    data: doc
  });
}
