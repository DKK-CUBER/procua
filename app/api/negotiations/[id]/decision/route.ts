import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/server/audit';
import { mockNegotiationsStore, mockPurchaseOrdersStore } from '@/lib/server/dataStore';
import { PurchaseOrder } from '@/lib/types';

const decisionSchema = z.object({
  decision: z.enum(['APPROVE', 'CONTINUE', 'REJECT'])
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = requireAuth(request, 'PROCUREMENT_MANAGER');
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const negSession = mockNegotiationsStore.find(
    (n) => n.id === id || n.sessionCode?.toLowerCase() === id.toLowerCase() || n.supplierId === id || n.id.includes(id)
  );

  if (!negSession) {
    return NextResponse.json(
      { error: 'Negotiation session not found' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const parsed = decisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid decision payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { decision } = parsed.data;

    if (decision === 'APPROVE') {
      negSession.status = 'ACCEPTED';
      if (negSession.currentOffer) {
        negSession.currentOffer.isBuyerApproved = true;
      }

      // Generate Purchase Order from Approved Offer
      const newPoNumber = `PO-${Math.floor(1800 + Math.random() * 100)}`;
      const unitPrice = negSession.finalOfferPrice || 740;
      const subtotal = unitPrice * negSession.quantity;
      const taxAmount = subtotal * 0.18;
      const totalAmount = subtotal + taxAmount;

      const newPo: PurchaseOrder = {
        id: `po-${newPoNumber.toLowerCase()}`,
        businessId: session!.businessId,
        supplierId: negSession.supplierId,
        supplierName: negSession.supplierName || 'Cobalt Office Systems',
        requestId: negSession.requestId,
        poNumber: newPoNumber,
        status: 'APPROVED',
        subtotal,
        taxAmount,
        freightAmount: 0,
        total: totalAmount,
        totalAmount,
        paymentTerms: '30% advance, 70% against delivery',
        deliveryTerms: 'Door delivery Chennai warehouse',
        deliveryAddress: 'Plot 42, Guindy Industrial Estate, Chennai 600032',
        expectedDelivery: '4 Sep 2026',
        approvedBy: session!.name,
        approvedAt: new Date().toISOString(),
        items: [
          {
            id: 'item-1',
            itemName: 'Ergonomic office chairs',
            specifications: 'High-mesh back, adjustable lumbar support, 2-year warranty',
            quantity: negSession.quantity,
            unitPrice,
            taxRate: 18.0,
            totalAmount: subtotal
          }
        ],
        createdAt: new Date().toISOString()
      };

      mockPurchaseOrdersStore.unshift(newPo);

      await logAuditEvent({
        businessId: session!.businessId,
        userId: session!.id,
        action: 'BUYER_APPROVE_OFFER_GENERATE_PO',
        entityType: 'PurchaseOrder',
        entityId: newPo.id,
        afterData: { poNumber: newPoNumber, totalAmount, supplier: negSession.supplierName }
      });

      return NextResponse.json({
        success: true,
        message: 'Offer approved and Purchase Order generated.',
        purchaseOrder: newPo,
        negotiation: negSession
      });
    }

    if (decision === 'REJECT') {
      negSession.status = 'REJECTED';
      return NextResponse.json({
        success: true,
        message: 'Offer rejected by buyer.',
        negotiation: negSession
      });
    }

    // CONTINUE
    negSession.status = 'ACTIVE';
    return NextResponse.json({
      success: true,
      message: 'Negotiation resumed.',
      negotiation: negSession
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to record decision', message: error.message },
      { status: 500 }
    );
  }
}
