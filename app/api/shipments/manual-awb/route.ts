import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getShiprocketTracking } from '@/lib/server/shipping/shiprocketService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      poId,
      courierName,
      awbCode,
      trackingUrl,
      notes
    } = body;

    if (!poId || !awbCode || !courierName) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_FIELDS',
          message: 'PO ID, Courier name, and AWB tracking code are required.'
        },
        { status: 400 }
      );
    }

    // 1. Find Purchase Order
    let poRecord = await db.purchaseOrder.findFirst({
      where: {
        OR: [{ id: poId }, { poNumber: poId }]
      }
    });

    const cleanAwb = awbCode.trim();
    const cleanCourier = courierName.trim();
    const now = new Date();

    // 2. Fetch or create Shipment
    let shipmentRecord = poRecord ? await db.shipment.findFirst({
      where: { purchaseOrderId: poRecord.id }
    }) : null;

    if (shipmentRecord) {
      shipmentRecord = await db.shipment.update({
        where: { id: shipmentRecord.id },
        data: {
          status: 'AWB_ASSIGNED',
          shippingMode: 'supplier_managed',
          courierName: cleanCourier,
          awbCode: cleanAwb,
          trackingNumber: cleanAwb,
          carrierName: cleanCourier,
          trackingUrl: trackingUrl || undefined,
          currentStatus: `Dispatched via ${cleanCourier}`,
          lastScanLocation: 'Origin Facility'
        }
      });
    } else if (poRecord) {
      shipmentRecord = await db.shipment.create({
        data: {
          businessId: poRecord.businessId,
          purchaseOrderId: poRecord.id,
          status: 'AWB_ASSIGNED',
          shippingMode: 'supplier_managed',
          courierName: cleanCourier,
          awbCode: cleanAwb,
          trackingNumber: cleanAwb,
          carrierName: cleanCourier,
          trackingUrl: trackingUrl || undefined,
          currentStatus: `Dispatched via ${cleanCourier}`,
          lastScanLocation: 'Origin Facility'
        }
      });
    }

    // 3. Record tracking event
    if (shipmentRecord) {
      await db.shipmentEvent.create({
        data: {
          shipmentId: shipmentRecord.id,
          eventType: 'AWB_ASSIGNED',
          status: 'AWB Assigned',
          location: 'Origin Facility',
          source: 'supplier',
          rawPayload: JSON.stringify({ courierName: cleanCourier, awbCode: cleanAwb, notes })
        }
      });

      if (poRecord) {
        await db.auditLog.create({
          data: {
            businessId: poRecord.businessId,
            action: 'AWB_RECORDED',
            entityType: 'SHIPMENT',
            entityId: shipmentRecord.id,
            details: JSON.stringify({ courierName: cleanCourier, awbCode: cleanAwb })
          }
        });
      }
    }

    // 4. Try fetching initial Shiprocket tracking if configured
    const tracking = await getShiprocketTracking(cleanAwb);

    return NextResponse.json({
      success: true,
      shipment: {
        id: shipmentRecord?.id || `shp_${Date.now()}`,
        poId,
        courierName: cleanCourier,
        awbCode: cleanAwb,
        status: 'AWB_ASSIGNED',
        trackingUrl: trackingUrl || tracking.trackingUrl,
        assignedAt: now.toISOString()
      },
      tracking
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'ASSIGN_AWB_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
