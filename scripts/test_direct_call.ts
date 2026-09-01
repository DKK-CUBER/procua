import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function testTwilioCall() {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`;

  const bodyParams = new URLSearchParams();
  bodyParams.append('To', '+916369763938');
  bodyParams.append('From', config.fromPhoneNumber);
  bodyParams.append('Url', 'http://demo.twilio.com/docs/voice.xml');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams.toString()
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Data:', JSON.stringify(data, null, 2));
}

testTwilioCall().catch(console.error);
