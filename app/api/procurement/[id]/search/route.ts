import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { providerRegistry } from '@/lib/server/providers';
import { rankSuppliers } from '@/lib/server/ai/ranker';
import { mockRequestsStore } from '@/lib/server/dataStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = requireAuth(request, 'PROCUREMENT_EXECUTIVE');
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id;
  const req = mockRequestsStore.find((r) => r.id === id || r.referenceNumber === id);

  const queryProduct = req?.title || 'Ergonomic task chair';
  const queryQty = req?.quantity || 500;
  const queryLoc = req?.deliveryLocation || 'Chennai';
  const queryBudget = req?.maxUnitPrice || 750;

  try {
    // 1. Query all connected providers
    const { suppliers: rawSuppliers, sourceStatus } = await providerRegistry.searchAll({
      product: queryProduct,
      quantity: queryQty,
      location: queryLoc,
      budget: queryBudget,
      deliveryDeadline: req?.deadline
    });

    // 2. Filter hard constraints & Rank with explainability
    const rankedSuppliers = rankSuppliers(
      rawSuppliers,
      {
        targetQuantity: queryQty,
        maxBudget: queryBudget,
        targetLocation: queryLoc,
        allowPartial: req?.allowPartial || false
      }
    );

    const top5 = rankedSuppliers.slice(0, 5);

    return NextResponse.json({
      success: true,
      requestId: id,
      totalDiscovered: rawSuppliers.length,
      qualifiedCount: rankedSuppliers.length,
      sourceStatus,
      top5,
      allQualified: rankedSuppliers
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Supplier search failed', message: error.message },
      { status: 500 }
    );
  }
}
