import nodemailer from 'nodemailer';
import dns from 'dns';

async function testGmailLive() {
  const user = process.env.SMTP_USER || 'sadwik.kumar.procurement@gmail.com';
  const pass = process.env.SMTP_APP_PASSWORD || '';
  const recipient = process.env.SMTP_RECIPIENT || 'buyer@procura.in';

  console.log('----------------------------------------------------');
  console.log('🔍 TESTING GMAIL SMTP CONNECTION');
  console.log('----------------------------------------------------');
  console.log(`• Sender: ${user}`);
  console.log(`• Recipient: ${recipient}`);

  // 1. Resolve DNS for smtp.gmail.com
  dns.resolve4('smtp.gmail.com', async (err, addresses) => {
    if (err) {
      console.error('DNS Lookup failed:', err);
      return;
    }
    console.log('• Resolved IPv4 addresses:', addresses);

    // Try each address / port configuration
    const configs = [
      { host: 'smtp.gmail.com', port: 465, secure: true },
      { host: 'smtp.gmail.com', port: 587, secure: false },
      { host: addresses[0], port: 465, secure: true, name: 'smtp.gmail.com' },
      { host: addresses[0], port: 587, secure: false, name: 'smtp.gmail.com' }
    ];

    for (const cfg of configs) {
      console.log(`\n⏳ Attempting connection to ${cfg.host}:${cfg.port} (secure: ${cfg.secure})...`);
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        family: 4,
        auth: { user, pass },
        tls: {
          servername: 'smtp.gmail.com',
          rejectUnauthorized: false
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000
      } as any);

      try {
        await transporter.verify();
        console.log(`✅ SUCCESS! Verified SMTP connection on port ${cfg.port}!`);

        // Send the actual negotiation email
        console.log(`🚀 Sending live negotiation email to ${recipient}...`);
        const info = await transporter.sendMail({
          from: `"Sadwik Kumar · Procura" <${user}>`,
          to: recipient,
          subject: 'Request for Quotation: 500 Units Ergonomic Big Chairs - Ref [PROC-2026-DKK7000]',
          text: `Dear DKK Chairs Commercial Team,

We are writing to request your best commercial trade quote for our bulk procurement requirement:

• Product: Big Ergonomic Office Task Chairs
• Quantity Required: 500 units
• Initial Quoted Reference Rate: ₹7,000 / unit
• Buyer Target Rate: ₹6,200 / unit
• Delivery Location: Door delivery Chennai Warehouse, Tamil Nadu
• Payment Terms: 30% advance on PO confirmation, 70% on delivery inspection

Please reply with your revised discounted quote, GST terms, and delivery timeline.

Sincerely,
Sadwik Kumar
Commercial Procurement Lead
Procura Technologies
Ref: PROC-2026-DKK7000`,
          html: `
          <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #111827; margin-top: 0;">PROCURA · B2B PROCUREMENT RFQ</h2>
            <p>Dear <b>DKK Chairs</b> Commercial Team,</p>
            <p>We are writing to request your best commercial trade quote for our bulk procurement requirement:</p>
            <ul>
              <li><b>Product:</b> Big Ergonomic Office Task Chairs</li>
              <li><b>Quantity:</b> 500 units</li>
              <li><b>Initial Quoted Reference:</b> ₹7,000 / unit</li>
              <li><b>Buyer Target Counter-Offer:</b> <span style="color: #059669; font-weight: bold;">₹6,200 / unit</span></li>
              <li><b>Delivery:</b> Chennai Warehouse, Tamil Nadu</li>
              <li><b>Proposed Terms:</b> 30% advance / 70% on delivery</li>
            </ul>
            <p>Please reply directly to this email with your revised discounted unit price, delivery lead time, and GST terms.</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6b7280;"><b>Sadwik Kumar</b> · Commercial Procurement Lead<br/>Procura Technologies · Ref: PROC-2026-DKK7000</p>
          </div>`
        });

        console.log(`🎉 EMAIL DELIVERED! Message ID: ${info.messageId}`);
        console.log(`Response: ${info.response}`);
        return;
      } catch (connErr: any) {
        console.log(`❌ Failed on ${cfg.host}:${cfg.port}: ${connErr.message}`);
      }
    }
  });
}

testGmailLive().catch(console.error);
