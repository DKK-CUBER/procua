import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      poId,
      channel = 'email', // email | phone | portal
      confirmationRef,
      notes,
      leadTimeDays = 5,
      confirmedPickupCity = 'Chennai'
    } = body;

    if (!poId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PO_ID', message: 'Purchase Order ID is required.' },
        { status: 400 }
      );
    }

    // 1. Find Purchase Order
    let poRecord = await db.purchaseOrder.findFirst({
      where: {
        OR: [{ id: poId }, { poNumber: poId }]
      },
      include: {
        supplier: true
      }
    });

    const now = new Date();
    const cleanRef = confirmationRef || `CONF-${Date.now().toString(36).toUpperCase()}`;

    // 2. Find or create Shipment
    let shipmentRecord = poRecord ? await db.shipment.findFirst({
      where: { purchaseOrderId: poRecord.id }
    }) : null;

    if (shipmentRecord) {
      shipmentRecord = await db.shipment.update({
        where: { id: shipmentRecord.id },
        data: {
          status: 'SUPPLIER_ACCEPTED',
          currentStatus: 'Supplier accepted order · Preparing dispatch',
          supplierAcceptedAt: now,
          supplierAcceptanceRef: cleanRef,
          supplierAcceptanceNotes: notes || `Confirmed via ${channel}`,
          pickupAddress: confirmedPickupCity
        }
      });
    } else if (poRecord) {
      shipmentRecord = await db.shipment.create({
        data: {
          businessId: poRecord.businessId,
          purchaseOrderId: poRecord.id,
          status: 'SUPPLIER_ACCEPTED',
          currentStatus: 'Supplier accepted order · Preparing dispatch',
          shippingMode: 'supplier_managed',
          supplierAcceptedAt: now,
          supplierAcceptanceRef: cleanRef,
          supplierAcceptanceNotes: notes || `Confirmed via ${channel}`,
          pickupAddress: confirmedPickupCity
        }
      });
    }

    // 3. Record Shipment Event
    if (shipmentRecord) {
      await db.shipmentEvent.create({
        data: {
          shipmentId: shipmentRecord.id,
          eventType: 'SUPPLIER_ACCEPTED',
          status: 'Supplier Accepted',
          location: confirmedPickupCity,
          source: 'supplier',
          rawPayload: JSON.stringify({ channel, confirmationRef: cleanRef, notes })
        }
      });

      // Also record AuditLog
      if (poRecord) {
        await db.auditLog.create({
          data: {
            businessId: poRecord.businessId,
            action: 'SUPPLIER_ACCEPTANCE_RECORDED',
            entityType: 'SHIPMENT',
            entityId: shipmentRecord.id,
            details: JSON.stringify({
              channel,
              confirmationRef: cleanRef,
              notes,
              recordedAt: now.toISOString()
            })
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: 'SUPPLIER_ACCEPTED',
      acceptance: {
        channel,
        confirmationRef: cleanRef,
        notes,
        acceptedAt: now.toISOString(),
        leadTimeDays
      },
      nextStep: {
        status: 'AWAITING_DISPATCH',
        message: 'Supplier order acceptance confirmed. You can now add an AWB or book Shiprocket dispatch.'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'SUPPLIER_ACCEPTANCE_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
