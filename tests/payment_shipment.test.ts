import assert from 'node:assert';
import crypto from 'crypto';
import {
  calculatePayablePaise,
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature
} from '../lib/server/payments/razorpayService';
import {
  createShiprocketOrder,
  getShiprocketTracking
} from '../lib/server/shipping/shiprocketService';

console.log('\n🧪 Running Procura Payment & Shipment Test Suite...\n');

let passedTests = 0;

function it(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`  ✅ PASS: ${name}`);
          passedTests++;
        })
        .catch((err) => {
          console.error(`  ❌ FAIL: ${name}`);
          console.error(err);
          process.exit(1);
        });
    }
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runTests() {
  console.log('1. Server-Side Integer Money & Paise Calculations');

  it('Calculates integer paise accurately without floating point rounding errors', () => {
    assert.strictEqual(calculatePayablePaise(100), 10000);
    assert.strictEqual(calculatePayablePaise(6200.5), 620050);
    assert.strictEqual(calculatePayablePaise(365800), 36580000);
  });

  it('Throws error on zero or negative amounts', () => {
    assert.throws(() => calculatePayablePaise(0), /greater than zero/i);
    assert.throws(() => calculatePayablePaise(-500), /greater than zero/i);
  });

  it('Creates Razorpay order with calculated paise and po details', async () => {
    const order = await createRazorpayOrder({
      amountInRupees: 111000,
      poNumber: 'PO-2026-DKK001',
      poId: 'po-dkk-001',
      notes: { supplier: 'DKK Chairs' }
    });

    assert.strictEqual(order.success, true);
    assert.strictEqual(order.amount, 11100000); // 111,000 * 100 paise
    assert.strictEqual(order.currency, 'INR');
    assert.ok(order.orderId.startsWith('order_'));
  });

  console.log('\n2. Razorpay Cryptographic Signature & Webhook Verification');

  it('Verifies valid HMAC SHA256 signature when secret is present', () => {
    const secret = 'dummy_secret_key_12345';
    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';
    const payload = `${orderId}|${paymentId}`;
    const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // Temporarily inject secret
    process.env.RAZORPAY_KEY_SECRET = secret;
    const result = verifyRazorpaySignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSig
    });

    assert.strictEqual(result.isValid, true);
  });

  it('Rejects invalid or forged Razorpay signature', () => {
    const secret = 'dummy_secret_key_12345';
    process.env.RAZORPAY_KEY_SECRET = secret;

    const result = verifyRazorpaySignature({
      razorpayOrderId: 'order_ABC123',
      razorpayPaymentId: 'pay_XYZ789',
      razorpaySignature: 'forged_invalid_signature_hex_string_64_chars_0123456789abcdef01234567'
    });

    assert.strictEqual(result.isValid, false);
    process.env.RAZORPAY_KEY_SECRET = '';
  });

  it('Rejects missing signature parameters', () => {
    const result = verifyRazorpaySignature({
      razorpayOrderId: '',
      razorpayPaymentId: 'pay_123',
      razorpaySignature: 'sig_123'
    });
    assert.strictEqual(result.isValid, false);
  });

  it('Verifies Razorpay webhook signature with SHA256', () => {
    const webhookSecret = 'whsec_testing_secret_12345';
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
    const body = JSON.stringify({ event: 'payment.captured', id: 'evt_12345' });
    const signature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

    const result = verifyRazorpayWebhookSignature({
      rawBody: body,
      signature
    });

    assert.strictEqual(result.isValid, true);
    process.env.RAZORPAY_WEBHOOK_SECRET = '';
  });

  console.log('\n3. Strict Shipping & Address Verification Gates');

  it('Blocks Shiprocket booking if supplier pickup address is unconfirmed', async () => {
    await assert.rejects(
      async () => {
        await createShiprocketOrder({
          poId: 'po-test-1',
          poNumber: 'PO-TEST',
          supplierName: 'DKK Chairs',
          productName: 'Chairs',
          quantity: 500,
          totalAmount: 365800,
          pickupAddress: {
            name: 'Supplier',
            phone: '9876543210',
            address: 'Ambattur',
            city: 'Chennai',
            state: 'TN',
            pincode: '',
            isConfirmed: false
          },
          deliveryAddress: {
            name: 'Buyer',
            phone: '9876543210',
            address: 'Guindy',
            city: 'Chennai',
            state: 'TN',
            pincode: '600032',
            isConfirmed: true
          },
          packageDetails: {
            weightKg: 250,
            lengthCm: 120,
            widthCm: 80,
            heightCm: 150,
            packageCount: 5,
            isConfirmed: true
          }
        });
      },
      /Supplier pickup address and pincode must be explicitly confirmed/
    );
  });

  it('Blocks Shiprocket booking if buyer delivery address is unconfirmed', async () => {
    await assert.rejects(
      async () => {
        await createShiprocketOrder({
          poId: 'po-test-1',
          poNumber: 'PO-TEST',
          supplierName: 'DKK Chairs',
          productName: 'Chairs',
          quantity: 500,
          totalAmount: 365800,
          pickupAddress: {
            name: 'Supplier',
            phone: '9876543210',
            address: 'Ambattur',
            city: 'Chennai',
            state: 'TN',
            pincode: '600058',
            isConfirmed: true
          },
          deliveryAddress: {
            name: 'Buyer',
            phone: '9876543210',
            address: 'Guindy',
            city: 'Chennai',
            state: 'TN',
            pincode: '600032',
            isConfirmed: false
          },
          packageDetails: {
            weightKg: 250,
            lengthCm: 120,
            widthCm: 80,
            heightCm: 150,
            packageCount: 5,
            isConfirmed: true
          }
        });
      },
      /Buyer delivery destination address and pincode must be confirmed/
    );
  });

  it('Blocks Shiprocket booking if package weight or dimensions are unconfirmed', async () => {
    await assert.rejects(
      async () => {
        await createShiprocketOrder({
          poId: 'po-test-1',
          poNumber: 'PO-TEST',
          supplierName: 'DKK Chairs',
          productName: 'Chairs',
          quantity: 500,
          totalAmount: 365800,
          pickupAddress: {
            name: 'Supplier',
            phone: '9876543210',
            address: 'Ambattur',
            city: 'Chennai',
            state: 'TN',
            pincode: '600058',
            isConfirmed: true
          },
          deliveryAddress: {
            name: 'Buyer',
            phone: '9876543210',
            address: 'Guindy',
            city: 'Chennai',
            state: 'TN',
            pincode: '600032',
            isConfirmed: true
          },
          packageDetails: {
            weightKg: 0,
            lengthCm: 0,
            widthCm: 0,
            heightCm: 0,
            packageCount: 0,
            isConfirmed: false
          }
        });
      },
      /Package weight and physical dimensions must be verified/
    );
  });

  console.log('\n4. Real Tracking & AWB Requirements');

  it('Blocks tracking queries when no AWB exists with clean empty state', async () => {
    const res = await getShiprocketTracking('');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.currentStatus, 'AWAITING_AWB');
    assert.strictEqual(res.error, 'Tracking begins once the supplier or courier provides an AWB.');
  });

  it('Returns carrier scans only when valid AWB is provided', async () => {
    const res = await getShiprocketTracking('BLUEDART8821945');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.awbCode, 'BLUEDART8821945');
    assert.ok(res.events.length > 0);
  });

  console.log(`\n======================================================`);
  console.log(`Summary: All ${passedTests} Payment & Shipment tests passed! 🚀`);
  console.log(`======================================================\n`);
}

runTests();
