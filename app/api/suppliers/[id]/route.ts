import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockSuppliersDatabase } from '@/lib/server/dataStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id.toLowerCase();

  const supplier = mockSuppliersDatabase.find(
    (s) => s.id === id || s.name.toLowerCase().includes(id)
  );

  if (!supplier) {
    return NextResponse.json(
      { error: 'Supplier not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(supplier);
}
