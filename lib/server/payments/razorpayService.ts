import crypto from 'crypto';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  paymentMode: 'test' | 'live';
}

export function getRazorpayConfig(): RazorpayConfig {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    paymentMode: (process.env.PAYMENT_MODE === 'live' ? 'live' : 'test')
  };
}

/**
 * Calculates money in integer paise safely, preventing JS floating point inaccuracies.
 */
export function calculatePayablePaise(amountInRupees: number): number {
  if (isNaN(amountInRupees) || amountInRupees <= 0) {
    throw new Error('Invalid payment amount. Amount must be greater than zero.');
  }
  return Math.round(amountInRupees * 100);
}

export interface CreateOrderParams {
  amountInRupees: number;
  poNumber: string;
  poId: string;
  receiptNumber?: string;
  currency?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  success: boolean;
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  receipt: string;
  isTestMode: boolean;
  notes?: Record<string, string>;
  error?: string;
}

/**
 * Server-side creation of Razorpay Payment Order
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const config = getRazorpayConfig();
  const amountPaise = calculatePayablePaise(params.amountInRupees);
  const receipt = params.receiptNumber || `rcpt_${params.poNumber.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
  const currency = params.currency || 'INR';

  // If live keys are present, call Razorpay Orders API
  if (config.keyId && config.keySecret) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt,
          notes: {
            poId: params.poId,
            poNumber: params.poNumber,
            ...params.notes
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.description || `Razorpay order creation failed: ${res.statusText}`);
      }

      return {
        success: true,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId: config.keyId,
        receipt: data.receipt,
        isTestMode: config.paymentMode === 'test',
        notes: data.notes
      };
    } catch (err: any) {
      // In test mode without live gateway network, provide sandbox order ID for testing
      if (config.paymentMode === 'test') {
        const testOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        return {
          success: true,
          orderId: testOrderId,
          amount: amountPaise,
          currency,
          keyId: config.keyId || 'rzp_test_placeholder_key',
          receipt,
          isTestMode: true,
          notes: params.notes
        };
      }
      throw err;
    }
  }

  // Default Test Mode Sandbox Order
  const sandboxOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return {
    success: true,
    orderId: sandboxOrderId,
    amount: amountPaise,
    currency,
    keyId: config.keyId || 'rzp_test_sandbox_key',
    receipt,
    isTestMode: true,
    notes: params.notes
  };
}

export interface VerifySignatureParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Verifies Razorpay payment signature using HMAC SHA256
 */
export function verifyRazorpaySignature(params: VerifySignatureParams): { isValid: boolean; error?: string } {
  const config = getRazorpayConfig();

  if (!params.razorpayOrderId || !params.razorpayPaymentId || !params.razorpaySignature) {
    return { isValid: false, error: 'Missing payment verification credentials (orderId, paymentId, or signature).' };
  }

  // If in test mode with sandbox signatures
  if (config.paymentMode === 'test' && params.razorpaySignature.startsWith('test_sig_')) {
    return { isValid: true };
  }

  if (!config.keySecret) {
    if (config.paymentMode === 'test') {
      return { isValid: true };
    }
    return { isValid: false, error: 'RAZORPAY_KEY_SECRET is not configured on server.' };
  }

  try {
    const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.keySecret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(params.razorpaySignature, 'utf-8')
    );

    return { isValid };
  } catch (err: any) {
    return { isValid: false, error: err.message };
  }
}

/**
 * Verifies Razorpay webhook signature
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): { isValid: boolean; error?: string } {
  const config = getRazorpayConfig();

  if (!params.rawBody || !params.signature) {
    return { isValid: false, error: 'Missing webhook body or signature' };
  }

  if (!config.webhookSecret) {
    if (config.paymentMode === 'test') {
      return { isValid: true };
    }
    return { isValid: false, error: 'RAZORPAY_WEBHOOK_SECRET is not configured on server.' };
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(params.rawBody)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(params.signature, 'utf-8')
    );

    return { isValid };
  } catch (err: any) {
    return { isValid: false, error: err.message };
  }
}
