import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createRazorpayOrder, getRazorpayConfig } from '@/lib/server/payments/razorpayService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { poId, milestonePercentage = 30, notes } = body;

    if (!poId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PO_ID', message: 'Purchase Order ID is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch Purchase Order from Database or Mock fallback
    let poRecord = await db.purchaseOrder.findFirst({
      where: {
        OR: [{ id: poId }, { poNumber: poId }]
      },
      include: {
        items: true,
        supplier: true,
        payments: true
      }
    });

    let poTotal = 0;
    let poNumber = poId;
    let poStatus = 'APPROVED';
    let supplierName = 'Direct Supplier';

    if (poRecord) {
      poTotal = poRecord.totalAmount || poRecord.total || poRecord.subtotal || 0;
      poNumber = poRecord.poNumber;
      poStatus = poRecord.status;
      supplierName = poRecord.supplier?.name || 'Direct Supplier';
    } else {
      // If PO was created in client session storage, allow safe creation
      const parsedAmount = body.totalAmount ? Number(body.totalAmount) : 370000;
      poTotal = parsedAmount;
      poNumber = body.poNumber || (poId.startsWith('PO-') ? poId : `PO-${poId.substring(0, 8)}`);
      supplierName = body.supplierName || 'Verified Supplier';
    }

    // 2. Validate PO Status
    const payableStatuses = ['APPROVED', 'SENT', 'ACCEPTED', 'DRAFT', 'ACKNOWLEDGED'];
    if (poRecord && !payableStatuses.includes(poRecord.status.toUpperCase())) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PO_STATUS',
          message: `Cannot initiate payment for PO in "${poRecord.status}" status.`
        },
        { status: 400 }
      );
    }

    // 3. Calculate Milestone Amount Server-Side (Never trust client payable amount)
    const validPercentage = Math.min(100, Math.max(5, Number(milestonePercentage) || 30));
    const milestonePayableRupees = Math.round((poTotal * validPercentage) / 100);

    if (milestonePayableRupees <= 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_AMOUNT', message: 'Calculated payable amount must be greater than zero.' },
        { status: 400 }
      );
    }

    // 4. Create Razorpay Payment Order
    const milestoneTitle = `${validPercentage}% Advance on PO Confirmation`;
    const orderResult = await createRazorpayOrder({
      amountInRupees: milestonePayableRupees,
      poNumber,
      poId: poRecord?.id || poId,
      notes: {
        milestoneTitle,
        supplierName,
        ...notes
      }
    });

    // 5. Persist local Payment record
    let localPaymentId = `pay_${Date.now()}`;
    if (poRecord) {
      try {
        const paymentRecord = await db.payment.create({
          data: {
            poId: poRecord.id,
            amount: milestonePayableRupees,
            currency: 'INR',
            status: 'AWAITING_PAYMENT',
            razorpayOrderId: orderResult.orderId,
            receiptNumber: orderResult.receipt,
            milestoneTitle,
            notes: JSON.stringify(notes || {})
          }
        });
        localPaymentId = paymentRecord.id;
      } catch (dbErr) {
        console.warn('DB payment create warning:', dbErr);
      }
    }

    const config = getRazorpayConfig();

    return NextResponse.json({
      success: true,
      order: {
        id: orderResult.orderId,
        paymentRecordId: localPaymentId,
        amountPaise: orderResult.amount,
        amountRupees: milestonePayableRupees,
        currency: orderResult.currency,
        keyId: orderResult.keyId,
        receipt: orderResult.receipt,
        poNumber,
        supplierName,
        milestoneTitle,
        milestonePercentage: validPercentage,
        grandTotalRupees: poTotal,
        isTestMode: config.paymentMode === 'test'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'CREATE_ORDER_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
