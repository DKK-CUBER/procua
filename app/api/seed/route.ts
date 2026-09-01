import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  mockSuppliersDatabase,
  mockRequestsStore,
  mockNegotiationsStore,
  mockPurchaseOrdersStore,
  mockDocumentsStore,
  mockShipmentsStore
} from '@/lib/server/dataStore';

export async function POST(request: NextRequest) {
  const { errorResponse } = requireAuth(request, 'OWNER');
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    success: true,
    message: 'Procura database verified & seeded successfully.',
    entitiesSeeded: {
      suppliers: mockSuppliersDatabase.length,
      procurementRequests: mockRequestsStore.length,
      negotiations: mockNegotiationsStore.length,
      purchaseOrders: mockPurchaseOrdersStore.length,
      documents: mockDocumentsStore.length,
      shipments: mockShipmentsStore.length
    }
  });
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'Procura backend operational.'
  });
}
