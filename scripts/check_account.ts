import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function checkAccountDetails() {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  
  // Fetch Account Details
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`, {
    headers: { 'Authorization': authHeader }
  });
  const data = await res.json();
  console.log('Account Info:', JSON.stringify(data, null, 2));

  // Fetch Outgoing Caller IDs (Verified Numbers)
  const callerIdsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/OutgoingCallerIds.json`, {
    headers: { 'Authorization': authHeader }
  });
  const callerIds = await callerIdsRes.json();
  console.log('Verified Caller IDs in Twilio Account:', JSON.stringify(callerIds, null, 2));
}

checkAccountDetails().catch(console.error);
