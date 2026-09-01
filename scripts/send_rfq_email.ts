import { sendProcurementEmail } from '../lib/server/email/smtpService';

async function main() {
  const recipient = 'kavinkadmiel@gmail.com';
  const supplierName = 'DKK Chairs';
  const product = 'Big Ergonomic Office Task Chairs';
  const quantity = 500;
  const initialObservedPrice = 7000;
  const buyerTargetPrice = 6200;
  const rfqRef = 'PROC-2026-DKK7000';

  console.log('====================================================');
  console.log('📧 DISPATCHING PROCURA RFQ NEGOTIATION EMAIL');
  console.log('====================================================');
  console.log(`• Recipient: ${recipient}`);
  console.log(`• Supplier: ${supplierName}`);
  console.log(`• Product: ${product} (${quantity} units)`);
  console.log(`• Quoted Reference Rate: ₹${initialObservedPrice.toLocaleString('en-IN')} / unit`);
  console.log(`• Buyer Target Rate: ₹${buyerTargetPrice.toLocaleString('en-IN')} / unit`);
  console.log(`• RFQ Reference: ${rfqRef}`);
  console.log('----------------------------------------------------');

  const subject = `Request for Quotation: ${quantity} Units ${product} - Ref [${rfqRef}]`;

  const bodyText = `Dear ${supplierName} Commercial Sales Team,

We are writing to request your best commercial trade quote for our upcoming bulk procurement requirement:

• Product: ${product}
• Target Quantity: ${quantity} units
• Initial Quoted Reference Rate: ₹${initialObservedPrice.toLocaleString('en-IN')} / unit
• Buyer Target Rate: ₹${buyerTargetPrice.toLocaleString('en-IN')} / unit
• Delivery Location: Door delivery Chennai Warehouse, Tamil Nadu
• Proposed Payment Terms: 30% advance on PO confirmation, 70% against delivery inspection

Please provide your formal quotation with:
1. Best bulk discounted unit price (excluding / including 18% GST)
2. Delivery lead time (in business days)
3. Freight and transit insurance coverage
4. Minimum Order Quantity (MOQ) and warranty terms

Note: This Request for Quotation (RFQ) is a formal pricing inquiry and does not constitute a purchase order or binding financial agreement until approved by the buyer.

Please reply to this email thread to submit your revised commercial quote.

Sincerely,
Sadwik Kumar
Commercial Procurement Lead
Procura Technologies
RFQ Ref: ${rfqRef}`;

  const htmlContent = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111827; line-height: 1.6; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
    <div style="border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 20px; color: #111827; letter-spacing: -0.5px;">PROCURA · B2B PROCUREMENT RFQ</h2>
      <span style="font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase;">Official Request for Quotation · Ref: ${rfqRef}</span>
    </div>

    <p style="font-size: 14px; margin-top: 0;">Dear <b>${supplierName}</b> Commercial Sales Team,</p>
    
    <p style="font-size: 14px;">We are writing to request your best commercial trade quotation for our upcoming procurement requirement:</p>

    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Product Name:</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right;">${product}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Target Quantity:</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right;">${quantity} units</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Initial Quoted Rate:</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #6b7280;">₹${initialObservedPrice.toLocaleString('en-IN')} / unit</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Buyer Target Rate:</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #059669;">₹${buyerTargetPrice.toLocaleString('en-IN')} / unit</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Delivery Destination:</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right;">Chennai Warehouse, TN</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Proposed Terms:</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right;">30% Adv / 70% on Delivery</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #374151;">Please reply directly to this email with your revised quotation covering unit price, GST rate, freight inclusion, and delivery SLA.</p>

    <div style="margin-top: 24px; padding: 12px; background: #fefce8; border-left: 4px solid #eab308; font-size: 11px; color: #854d0e;">
      <b>Note:</b> This RFQ is a pricing negotiation inquiry and does not constitute a binding purchase order until authorized by the buyer.
    </div>

    <div style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px; color: #6b7280;">
      <b>Sadwik Kumar</b> · Commercial Procurement Lead<br/>
      Procura Technologies · <i>Automated B2B Procurement Intelligence</i>
    </div>
  </div>`;

  const result = await sendProcurementEmail({
    to: recipient,
    subject,
    body: bodyText,
    html: htmlContent,
    rfqReference: rfqRef,
    deliveryModeOverride: 'live'
  });

  console.log('----------------------------------------------------');
  console.log('📡 EMAIL DISPATCH RESULT:');
  console.log(`• Success: ${result.success ? '✅ YES' : '❌ NO'}`);
  console.log(`• Message ID: ${result.messageId}`);
  console.log(`• Recipient: ${result.recipient}`);
  console.log(`• Sent At: ${result.sentAt}`);
  if (result.error) {
    console.log(`• Error: ${result.error}`);
  }
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Email dispatch error:', err);
  process.exit(1);
});
