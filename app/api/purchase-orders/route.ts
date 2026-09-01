import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockPurchaseOrdersStore } from '@/lib/server/dataStore';
import { PurchaseOrder } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    success: true,
    data: mockPurchaseOrdersStore
  });
}

export async function POST(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const poRandomCode = Math.floor(1000 + Math.random() * 9000);
    const poNum = body.poNumber || `PO-2026-${poRandomCode}`;
    const id = body.id || `po-${poRandomCode}`;
    const unitPrice = Number(body.unitPrice) || 740;
    const quantity = Number(body.quantity) || 500;
    const subtotal = Number(body.subtotal) || unitPrice * quantity;
    const taxAmount = Number(body.taxAmount) || Math.round(subtotal * 0.18);
    const totalAmount = Number(body.totalAmount) || subtotal + taxAmount;

    const newPO: PurchaseOrder = {
      id: id,
      businessId: 'biz_kinetiq_01',
      supplierId: body.supplierId || 'sup-custom',
      supplierName: body.supplierName || 'Custom Supplier',
      requestId: body.requestId || 'req-custom',
      poNumber: poNum,
      status: body.status || 'APPROVED',
      subtotal: subtotal,
      taxAmount: taxAmount,
      freightAmount: body.freightAmount || 0,
      total: subtotal,
      totalAmount: totalAmount,
      paymentTerms: body.paymentTerms || '30% advance, 70% against delivery',
      deliveryTerms: body.deliveryTerms || 'Door delivery Chennai warehouse',
      deliveryAddress: body.deliveryAddress || 'Plot 42, Guindy Industrial Estate, Chennai 600032',
      expectedDelivery: body.expectedDelivery || new Date(Date.now() + 4 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      approvedBy: 'Sadwik Kumar',
      approvedAt: new Date().toISOString(),
      items: [
        {
          id: `item-${poRandomCode}`,
          itemName: body.product || body.itemName || 'Industrial Procurement Goods',
          specifications: body.specifications || 'Commercial grade, standard packaging, verified specifications',
          quantity: quantity,
          unitPrice: unitPrice,
          taxRate: 18.0,
          totalAmount: subtotal
        }
      ],
      createdAt: new Date().toISOString()
    };

    mockPurchaseOrdersStore.unshift(newPO);

    return NextResponse.json({
      success: true,
      data: newPO
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'PO_CREATION_FAILED', message: err.message },
      { status: 400 }
    );
  }
}
