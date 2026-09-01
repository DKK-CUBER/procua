import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockSuppliersDatabase } from '@/lib/server/dataStore';
import { SupplierDTO } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const source = searchParams.get('source');
  const minReliability = searchParams.get('minReliability');

  let results = [...mockSuppliersDatabase];

  if (location) {
    results = results.filter((s) => s.location.toLowerCase() === location.toLowerCase());
  }
  if (source) {
    results = results.filter((s) => s.source.toLowerCase().includes(source.toLowerCase()));
  }
  if (minReliability) {
    const minVal = parseFloat(minReliability);
    if (!isNaN(minVal)) {
      results = results.filter((s) => s.reliability >= minVal);
    }
  }

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const suppliersToAdd: SupplierDTO[] = Array.isArray(body) ? body : [body];

    for (const sup of suppliersToAdd) {
      const existingIdx = mockSuppliersDatabase.findIndex((s) => s.id === sup.id);
      if (existingIdx >= 0) {
        mockSuppliersDatabase[existingIdx] = { ...mockSuppliersDatabase[existingIdx], ...sup };
      } else {
        mockSuppliersDatabase.unshift(sup);
      }
    }

    return NextResponse.json({
      success: true,
      count: suppliersToAdd.length,
      suppliers: mockSuppliersDatabase
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'INVALID_PAYLOAD', message: err.message },
      { status: 400 }
    );
  }
}
