import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/server/audit';
import { mockShipmentsStore } from '@/lib/server/dataStore';

const eventSchema = z.object({
  eventType: z.string(),
  title: z.string(),
  location: z.string().optional(),
  source: z.string(),
  details: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = requireAuth(request, 'PROCUREMENT_EXECUTIVE');
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const shipment = mockShipmentsStore.find(
    (s) => s.id === id || s.purchaseOrderId === id || s.poNumber?.toLowerCase() === id.toLowerCase() || s.id.includes(id)
  );

  if (!shipment) {
    return NextResponse.json(
      { error: 'Shipment not found' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const newEvent = {
      id: `evt-${Date.now()}`,
      eventType: d.eventType,
      title: d.title,
      location: d.location,
      source: d.source,
      isVerified: true,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      details: d.details
    };

    shipment.events = shipment.events || [];
    shipment.events.push(newEvent);
    shipment.lastVerifiedEvent = `${d.title} (${d.source})`;

    await logAuditEvent({
      businessId: session!.businessId,
      userId: session!.id,
      action: 'ADD_SHIPMENT_TRACKING_EVENT',
      entityType: 'Shipment',
      entityId: shipment.id,
      afterData: newEvent
    });

    return NextResponse.json({
      success: true,
      event: newEvent,
      shipment
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to record tracking event', message: error.message },
      { status: 500 }
    );
  }
}
