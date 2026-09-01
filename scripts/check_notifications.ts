import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function checkCallNotifications(callSid: string) {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls/${callSid}/Notifications.json`;

  const res = await fetch(endpoint, {
    headers: { 'Authorization': authHeader }
  });

  const data = await res.json();
  console.log('Notifications for call:', JSON.stringify(data, null, 2));
}

checkCallNotifications('CA39eaecbc0bc921ecf92f904b8280d59e').catch(console.error);
