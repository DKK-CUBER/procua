import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function testMethodGet() {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`;

  const bodyParams = new URLSearchParams();
  bodyParams.append('To', '+916369763938');
  bodyParams.append('From', config.fromPhoneNumber);
  bodyParams.append('Url', 'https://paste.rs/EnPrh');
  bodyParams.append('Method', 'GET'); // Force GET request so paste.rs returns the TwiML XML!

  console.log('Dispatching Twilio call with Method: GET...');
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
  console.log('Call SID:', data.sid);
  console.log('Status:', data.status);
}

testMethodGet().catch(console.error);
