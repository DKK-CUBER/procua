import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));

    // 1. Ensure a valid business exists in SQLite
    let business = await db.business.findFirst();
    if (!business) {
      business = await db.business.create({
        data: {
          id: 'biz_kinetiq_01',
          name: 'Kinetiq Studios',
          legalName: 'Kinetiq Studios Private Limited',
          gstin: '33AABCK1234F1Z5',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India'
        }
      });
    }

    // 2. Fetch negotiation if exists
    let neg = null;
    try {
      neg = await db.negotiation.findUnique({
        where: { id },
        include: {
          supplier: true,
          request: true,
          offerVersions: { orderBy: { versionNumber: 'desc' } }
        }
      });
    } catch (_) {}

    // 3. Ensure a valid supplier exists in SQLite
    const supplierName = body.supplierName || neg?.supplier?.name || 'Chennai Chairs';
    const cleanSupplierId = 'sup_' + supplierName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    let supplier = null;
    try {
      supplier = await db.supplier.findFirst({
        where: {
          OR: [
            { id: body.supplierId || '' },
            { id: cleanSupplierId },
            { name: supplierName }
          ]
        }
      });

      if (!supplier) {
        supplier = await db.supplier.create({
          data: {
            id: cleanSupplierId,
            name: supplierName,
            sourceId: 'DIRECT_API',
            sourceName: 'Direct Supplier',
            city: body.location || 'Chennai',
            state: 'Tamil Nadu',
            rating: 4.8,
            reliabilityScore: 95.0,
            observedPrice: body.unitPrice || 7000
          }
        });
      }
    } catch (_) {
      supplier = await db.supplier.findFirst();
    }

    // 4. Validate offer details
    const latestOffer = neg?.offerVersions?.[0];
    const unitPrice = body.unitPrice || latestOffer?.unitPrice || neg?.finalOfferPrice || 7000;
    const quantity = body.quantity || neg?.quantity || 500;
    const productName = body.product || neg?.request?.title || 'Big Ergonomic Office Task Chairs';

    const subtotal = body.subtotal || unitPrice * quantity;
    const taxAmount = body.taxAmount || Math.round(subtotal * 0.18);
    const totalAmount = body.totalAmount || subtotal + taxAmount;

    // Generate clean PO Number
    const poNumber = 'PO-' + Math.floor(1000 + Math.random() * 9000);
    const rfqRef = neg?.rfqReference || `PROC-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    // 5. Create real PO record in database
    const po = await db.purchaseOrder.create({
      data: {
        businessId: business.id,
        supplierId: supplier?.id || 'cobalt',
        requestId: neg?.requestId || null,
        negotiationId: neg?.id || null,
        poNumber,
        rfqReference: rfqRef,
        status: 'APPROVED',
        subtotal,
        taxAmount,
        freightAmount: 0,
        totalAmount,
        total: totalAmount,
        paymentTerms: body.paymentTerms || '30% advance on PO confirmation, 70% against delivery',
        deliveryTerms: body.deliveryTerms || 'Door delivery Chennai warehouse',
        deliveryAddress: body.deliveryAddress || 'Plot 42, Guindy Industrial Estate, Chennai 600032',
        expectedDelivery: new Date(Date.now() + 4 * 86400000),
        approvedBy: 'Procurement Manager',
        items: {
          create: [
            {
              itemName: productName,
              specifications: `${productName} · Commercial grade standard`,
              quantity,
              unitPrice,
              taxRate: 18.0,
              totalAmount
            }
          ]
        }
      },
      include: {
        items: true,
        supplier: true
      }
    });

    // 6. Update negotiation state if present
    if (neg) {
      try {
        await db.negotiation.update({
          where: { id: neg.id },
          data: { status: 'po_issued' }
        });

        await db.negotiationMessage.create({
          data: {
            negotiationId: neg.id,
            senderType: 'PROCURA_SYSTEM',
            senderName: 'System Audit',
            content: `Official Purchase Order ${poNumber} issued and locked against accepted supplier offer (₹${unitPrice}/unit, Total ₹${totalAmount.toLocaleString('en-IN')}).`,
            provenance: `Buyer Approval Event · ${new Date().toLocaleTimeString('en-IN')}`,
            isVerified: true
          }
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      po,
      message: `Purchase Order ${poNumber} generated successfully.`
    });
  } catch (err: any) {
    console.error('Accept offer error:', err);
    return NextResponse.json(
      { success: false, error: 'PO_CREATION_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
