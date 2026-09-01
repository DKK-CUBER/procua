import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function testUrlCall(xmlUrl: string) {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`;

  const bodyParams = new URLSearchParams();
  bodyParams.append('To', '+916369763938');
  bodyParams.append('From', config.fromPhoneNumber);
  bodyParams.append('Url', xmlUrl);

  console.log(`Initiating live Twilio call to +916369763938 using TwiML URL: ${xmlUrl}`);
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

testUrlCall('https://paste.rs/EnPrh').catch(console.error);
