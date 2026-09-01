import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function createTwimlBin() {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const endpoint = `https://twiml.twilio.com/v1/TwimlBins`;

  const speechXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Vanakkam. This is Sadwik calling from Procura Technologies regarding 500 units of big chairs from DKK Chairs.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">We noted your initial quote of 7000 rupees. If we confirm all 500 units today with 30 percent advance payment, can you offer 6200 rupees per unit with door delivery to Chennai?</Say>
  <Pause length="3"/>
  <Say voice="Polly.Aditi" language="en-IN">Thank you. I have recorded your commercial quote details and will submit them to the procurement manager for final purchase order confirmation.</Say>
</Response>`;

  const bodyParams = new URLSearchParams();
  bodyParams.append('FriendlyName', 'Procura DKK Negotiation');
  bodyParams.append('Twiml', speechXml);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams.toString()
  });

  const data = await res.json();
  console.log('TwiML Bin Response:', res.status, JSON.stringify(data, null, 2));
  return data.url;
}

createTwimlBin().catch(console.error);
