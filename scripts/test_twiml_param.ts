import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function testTwimlParam() {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">Vanakkam. This is Sadwik calling from Procura regarding 500 units of big chairs from DKK Chairs. We noted your initial quote of 7000 rupees. If we confirm 500 units today, can you offer 6200 with door delivery to Chennai?</Say>
  <Pause length="3"/>
  <Say voice="alice" language="en-IN">Thank you. I have recorded your quote and will review it with the buyer for purchase order approval.</Say>
</Response>`;

  const bodyParams = new URLSearchParams();
  bodyParams.append('To', '+916369763938');
  bodyParams.append('From', config.fromPhoneNumber);
  bodyParams.append('Twiml', twiml);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams.toString()
  });

  const data = await res.json();
  console.log('Status code:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

testTwimlParam().catch(console.error);
