import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getShiprocketTracking } from '@/lib/server/shipping/shiprocketService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const shipmentRecord = await db.shipment.findFirst({
      where: {
        OR: [
          { id },
          { purchaseOrderId: id },
          { awbCode: id }
        ]
      }
    });

    if (!shipmentRecord || !shipmentRecord.awbCode) {
      return NextResponse.json({
        success: false,
        error: 'NO_AWB',
        message: 'Cannot sync tracking without an assigned AWB code.'
      }, { status: 400 });
    }

    const tracking = await getShiprocketTracking(shipmentRecord.awbCode);

    const now = new Date();
    await db.shipment.update({
      where: { id: shipmentRecord.id },
      data: {
        currentStatus: tracking.currentStatus,
        lastScanLocation: tracking.lastScanLocation,
        lastUpdate: now,
        deliveredAt: tracking.deliveredAt ? new Date(tracking.deliveredAt) : undefined,
        status: tracking.isDelivered ? 'DELIVERED' : (tracking.currentStatus || shipmentRecord.status)
      }
    });

    // Persist new scan events idempotently
    for (const evt of tracking.events) {
      const existingEvt = await db.shipmentEvent.findFirst({
        where: {
          shipmentId: shipmentRecord.id,
          status: evt.status,
          location: evt.location
        }
      });

      if (!existingEvt) {
        await db.shipmentEvent.create({
          data: {
            shipmentId: shipmentRecord.id,
            eventType: 'CARRIER_SCAN',
            status: evt.status,
            location: evt.location,
            source: evt.source,
            occurredAt: new Date(evt.timestamp),
            rawPayload: JSON.stringify(evt)
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      syncedAt: now.toISOString(),
      tracking
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'SYNC_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
