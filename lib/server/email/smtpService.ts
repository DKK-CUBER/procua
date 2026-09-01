import nodemailer from 'nodemailer';

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
  rfqReference: string;
  inReplyTo?: string;
  references?: string;
  deliveryModeOverride?: 'preview' | 'live';
}

export interface SendEmailResult {
  success: boolean;
  deliveryMode: 'preview' | 'live';
  messageId: string;
  recipient: string;
  subject: string;
  sentAt: string;
  headers: Record<string, string>;
  error?: string;
}

export async function sendProcurementEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const deliveryMode =
    params.deliveryModeOverride ||
    (process.env.EMAIL_DELIVERY_MODE === 'live' ? 'live' : 'preview');

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || 'sadwik.kumar.procurement@gmail.com';
  const smtpPass = (process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, '');

  const domainPart = smtpUser.includes('@') ? smtpUser.split('@')[1] : 'procura.in';
  const generatedMessageId = `<${params.rfqReference.toLowerCase()}.${Date.now()}@${domainPart}>`;

  // Headers for RFC-compliant email threading
  const headers: Record<string, string> = {
    'X-Procura-RFQ-Ref': params.rfqReference,
    'Message-ID': generatedMessageId
  };

  if (params.inReplyTo) {
    headers['In-Reply-To'] = params.inReplyTo;
  }
  if (params.references) {
    headers['References'] = params.references;
  }

  // Preview Mode: Stored cleanly without live dispatch
  if (deliveryMode === 'preview') {
    return {
      success: true,
      deliveryMode: 'preview',
      messageId: generatedMessageId,
      recipient: params.to,
      subject: params.subject,
      sentAt: new Date().toISOString(),
      headers
    };
  }

  // Live Mode: Send via Nodemailer with Gmail SMTP
  if (!smtpPass) {
    return {
      success: false,
      deliveryMode: 'live',
      messageId: generatedMessageId,
      recipient: params.to,
      subject: params.subject,
      sentAt: new Date().toISOString(),
      headers,
      error: 'SMTP_APP_PASSWORD is not configured. Email could not be delivered.'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort === 465 ? 465 : 587,
      secure: smtpPort === 465,
      family: 4, // Force IPv4 routing on Windows
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    } as any);

    const info = await transporter.sendMail({
      from: `"Procura B2B Procurement" <${smtpUser}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: params.html || `<div style="font-family: sans-serif; white-space: pre-line; line-height: 1.6;">${params.body}</div>`,
      headers
    });

    return {
      success: true,
      deliveryMode: 'live',
      messageId: info.messageId || generatedMessageId,
      recipient: params.to,
      subject: params.subject,
      sentAt: new Date().toISOString(),
      headers
    };
  } catch (err: any) {
    return {
      success: false,
      deliveryMode: 'live',
      messageId: generatedMessageId,
      recipient: params.to,
      subject: params.subject,
      sentAt: new Date().toISOString(),
      headers,
      error: `SMTP dispatch failed: ${err.message}`
    };
  }
}
