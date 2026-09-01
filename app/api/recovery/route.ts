import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockShipmentsStore } from '@/lib/server/dataStore';

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const shipmentId = searchParams.get('shipmentId') || 'shp-1827';

  const shipment = mockShipmentsStore.find((s) => s.id === shipmentId || s.purchaseOrderId === shipmentId);
  const options = shipment?.recoveryOptions || [];

  return NextResponse.json({
    success: true,
    shipmentId,
    options
  });
}
