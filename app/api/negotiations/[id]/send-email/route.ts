import { NextRequest, NextResponse } from 'next/server';
import { sendProcurementEmail } from '@/lib/server/email/smtpService';
import { db } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { to, subject, emailBody, rfqReference, inReplyTo, references, deliveryMode } = body;

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'INVALID_RECIPIENT', message: 'A verified supplier email address is required.' },
        { status: 400 }
      );
    }

    if (!subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CONTENT', message: 'Subject and email body are required.' },
        { status: 400 }
      );
    }

    const cleanRfqRef = rfqReference || `PROC-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const sendRes = await sendProcurementEmail({
      to,
      subject,
      body: emailBody,
      rfqReference: cleanRfqRef,
      inReplyTo,
      references,
      deliveryModeOverride: deliveryMode
    });

    if (!sendRes.success && sendRes.deliveryMode === 'live') {
      return NextResponse.json(
        { success: false, error: 'SMTP_FAILED', message: sendRes.error },
        { status: 502 }
      );
    }

    // Persist outgoing message in SQLite database
    try {
      await db.negotiationMessage.create({
        data: {
          negotiationId: id,
          senderType: 'PROCURA_BUYER',
          senderName: 'Buyer (Procura AI)',
          senderEmail: process.env.SMTP_USER || 'procurement@procura.in',
          recipient: to,
          subject,
          content: emailBody,
          provenance: sendRes.deliveryMode === 'live' ? `Sent via Gmail SMTP · ${new Date().toLocaleTimeString('en-IN')}` : `AI Draft (Preview Mode) · ${new Date().toLocaleTimeString('en-IN')}`,
          messageId: sendRes.messageId,
          inReplyTo: inReplyTo || null,
          deliveryMode: sendRes.deliveryMode,
          isVerified: true
        }
      });

      await db.negotiation.update({
        where: { id },
        data: {
          status: 'awaiting_supplier_reply',
          rfqReference: cleanRfqRef,
          lastMessageId: sendRes.messageId
        }
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      result: sendRes
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
