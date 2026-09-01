import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyRazorpayWebhookSignature } from '@/lib/server/payments/razorpayService';

// In-Memory store for processed event IDs to prevent duplicate webhook handling
const processedWebhookEventIds = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    // 1. Verify Webhook Signature
    const verification = verifyRazorpayWebhookSignature({
      rawBody,
      signature
    });

    if (!verification.isValid) {
      return NextResponse.json(
        { success: false, error: 'INVALID_WEBHOOK_SIGNATURE' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || payload.id;
    const eventType = payload.event;

    // 2. Idempotency Check: Ignore already processed webhook events
    if (eventId && processedWebhookEventIds.has(eventId)) {
      return NextResponse.json({ success: true, duplicate: true, message: 'Event already processed.' });
    }
    if (eventId) {
      processedWebhookEventIds.add(eventId);
    }

    const paymentEntity = payload?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (orderId) {
        const existingPayment = await db.payment.findFirst({
          where: { razorpayOrderId: orderId }
        });

        if (existingPayment) {
          await db.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: 'PAYMENT_CONFIRMED',
              razorpayPaymentId: paymentId || existingPayment.razorpayPaymentId,
              webhookEventId: eventId,
              verifiedAt: new Date()
            }
          });

          // Ensure PO is set to PROCESSING
          await db.purchaseOrder.update({
            where: { id: existingPayment.poId },
            data: { status: 'PROCESSING' }
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      if (orderId) {
        const existingPayment = await db.payment.findFirst({
          where: { razorpayOrderId: orderId }
        });
        if (existingPayment) {
          await db.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: 'PAYMENT_FAILED',
              webhookEventId: eventId
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      event: eventType,
      eventId,
      processedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'WEBHOOK_PROCESSING_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
