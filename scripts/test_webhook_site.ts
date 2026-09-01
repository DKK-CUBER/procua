import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function testWebhookSite() {
  // 1. Create a custom webhook endpoint that returns TwiML XML on POST
  const tokenRes = await fetch('https://webhook.site/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      default_status: 200,
      default_content_type: 'application/xml',
      default_content: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">Vanakkam. This is Sadwik calling from Procura Technologies regarding 500 units of big chairs from DKK Chairs.</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-IN">We noted your quote of 7000 rupees. If we confirm 500 units today with prompt advance, can you do 6200 rupees per unit with door delivery to Chennai?</Say>
  <Pause length="3"/>
  <Say voice="alice" language="en-IN">Thank you. I have recorded your quote and will review it with the buyer for purchase order approval.</Say>
</Response>`
    })
  });

  const tokenData = await tokenRes.json();
  const webhookUrl = `https://webhook.site/${tokenData.uuid}`;
  console.log(`Generated public XML Webhook: ${webhookUrl}`);

  // 2. Test POST request to verify it returns XML with 200 OK
  const testPost = await fetch(webhookUrl, { method: 'POST' });
  console.log('Test POST Status:', testPost.status);
  console.log('Test POST Content-Type:', testPost.headers.get('content-type'));
  console.log('Test POST Response Body:\n', await testPost.text());

  // 3. Initiate Twilio Call
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`;

  const bodyParams = new URLSearchParams();
  bodyParams.append('To', '+916369763938');
  bodyParams.append('From', config.fromPhoneNumber);
  bodyParams.append('Url', webhookUrl);

  console.log('Initiating Twilio call with webhook.site XML URL...');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams.toString()
  });

  const data = await res.json();
  console.log('Twilio Call Result:', res.status, JSON.stringify(data, null, 2));
}

testWebhookSite().catch(console.error);
