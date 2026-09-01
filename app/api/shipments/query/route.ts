import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockShipmentsStore } from '@/lib/server/dataStore';

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const poQuery = searchParams.get('po') || searchParams.get('q') || 'PO-1827';

  const shipment = mockShipmentsStore.find(
    (s) => s.poNumber?.toLowerCase() === poQuery.toLowerCase() || s.purchaseOrderId.toLowerCase() === poQuery.toLowerCase() || s.id.toLowerCase() === poQuery.toLowerCase()
  );

  if (!shipment) {
    return NextResponse.json({
      success: true,
      found: false,
      message: `No active shipment record found for "${poQuery}".`
    });
  }

  // Answer truthfully from recorded events
  const verifiedEvents = shipment.events?.filter((e) => e.isVerified) || [];
  const latestEvent = verifiedEvents.length > 0 ? verifiedEvents[verifiedEvents.length - 1] : null;

  let responseMessage = '';
  if (latestEvent) {
    responseMessage = `Shipment for ${shipment.poNumber} is in status "${shipment.status}". The latest verified milestone is: ${latestEvent.title} (${latestEvent.source}) recorded on ${latestEvent.timestamp}.`;
  } else {
    responseMessage = `No live shipment event is currently available for ${shipment.poNumber}. The latest verified information is order confirmation from ${shipment.supplierName}.`;
  }

  return NextResponse.json({
    success: true,
    found: true,
    poNumber: shipment.poNumber,
    status: shipment.status,
    currentLocation: shipment.currentLocation,
    latestVerifiedEvent: latestEvent,
    riskLevel: shipment.riskLevel || shipment.risk,
    estimatedDelayDays: shipment.estimatedDelayDays,
    expectedDelivery: shipment.expectedDelivery,
    message: responseMessage
  });
}
