import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getShiprocketTracking } from '@/lib/server/shipping/shiprocketService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Find shipment by ID, poId, or awbCode
    const shipmentRecord = await db.shipment.findFirst({
      where: {
        OR: [
          { id },
          { purchaseOrderId: id },
          { awbCode: id },
          { trackingNumber: id }
        ]
      },
      include: {
        purchaseOrder: {
          include: {
            supplier: true
          }
        },
        shipmentEvents: {
          orderBy: { occurredAt: 'desc' }
        }
      }
    });

    const awb = shipmentRecord?.awbCode || shipmentRecord?.trackingNumber;

    if (!awb) {
      return NextResponse.json({
        success: true,
        status: shipmentRecord?.status || 'AWAITING_DISPATCH',
        hasAwb: false,
        message: 'Tracking begins once the supplier or courier provides an AWB.',
        planningEstimate: 'Planning estimate based on supplier lead time (4-5 business days) and confirmed Chennai warehouse route.',
        courierEstimate: null,
        events: []
      });
    }

    // Fetch tracking data from Shiprocket
    const tracking = await getShiprocketTracking(awb);

    return NextResponse.json({
      success: true,
      status: shipmentRecord?.status || tracking.currentStatus,
      hasAwb: true,
      awbCode: awb,
      courierName: shipmentRecord?.courierName || tracking.courierName || 'Carrier Partner',
      currentStatus: tracking.currentStatus || 'IN_TRANSIT',
      lastScanLocation: tracking.lastScanLocation || 'In transit',
      lastScanTime: tracking.lastScanTime || new Date().toISOString(),
      planningEstimate: 'Planning estimate based on supplier lead time (4-5 business days) and confirmed route.',
      courierEstimate: tracking.estimatedDeliveryAt
        ? `Courier estimate from Shiprocket (EDD: ${tracking.estimatedDeliveryAt})`
        : null,
      isDelivered: tracking.isDelivered,
      deliveredAt: tracking.deliveredAt,
      trackingUrl: tracking.trackingUrl || shipmentRecord?.trackingUrl,
      podUrl: tracking.podUrl || shipmentRecord?.podUrl,
      events: tracking.events.length > 0 ? tracking.events : (shipmentRecord?.shipmentEvents || [])
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'TRACK_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
