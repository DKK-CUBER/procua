import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function checkCallStatus(callSid: string) {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls/${callSid}.json`;

  const res = await fetch(endpoint, {
    headers: { 'Authorization': authHeader }
  });

  const data = await res.json();
  console.log(`Call SID: ${data.sid}`);
  console.log(`Status: ${data.status}`);
  console.log(`Duration: ${data.duration}s`);
  if (data.error_code) {
    console.log(`Error Code: ${data.error_code} - ${data.error_message}`);
  }
}

checkCallStatus('CA20680c9db8fe623a5688973b51f74d89').catch(console.error);
