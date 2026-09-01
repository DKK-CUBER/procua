import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/server/audit';
import { mockPurchaseOrdersStore } from '@/lib/server/dataStore';

const statusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'APPROVED',
    'SENT',
    'ACKNOWLEDGED',
    'ACCEPTED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CLOSED',
    'REJECTED',
    'CANCELLED',
    'DISPUTED',
    'AMENDMENT_REQUIRED'
  ]),
  notes: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = requireAuth(request, 'PROCUREMENT_EXECUTIVE');
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const po = mockPurchaseOrdersStore.find(
    (p) => p.id === id || p.poNumber.toLowerCase() === id.toLowerCase() || p.id.includes(id)
  );

  if (!po) {
    return NextResponse.json(
      { error: 'Purchase Order not found' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid status transition', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const previousStatus = po.status;
    po.status = parsed.data.status;
    if (parsed.data.status === 'SENT') {
      po.sentAt = new Date().toISOString();
    }
    if (parsed.data.notes) {
      po.amendmentNotes = parsed.data.notes;
    }

    await logAuditEvent({
      businessId: session!.businessId,
      userId: session!.id,
      action: 'UPDATE_PO_STATUS',
      entityType: 'PurchaseOrder',
      entityId: po.id,
      beforeData: { status: previousStatus },
      afterData: { status: po.status, notes: parsed.data.notes }
    });

    return NextResponse.json({
      success: true,
      message: `Purchase Order status updated to ${po.status}`,
      purchaseOrder: po
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update PO status', message: error.message },
      { status: 500 }
    );
  }
}
