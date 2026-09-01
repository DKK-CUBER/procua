import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function checkRecentNotifications() {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  
  // Fetch all recent notifications from the Twilio account
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Notifications.json?PageSize=10`, {
    headers: { 'Authorization': authHeader }
  });
  
  const data = await res.json();
  console.log('Recent Twilio Debugger Logs & Errors:');
  for (const n of data.notifications || []) {
    console.log(`[${n.message_date}] Code ${n.error_code} (${n.log}): ${n.message_text}`);
    console.log(`  Call SID: ${n.call_sid} | Request URL: ${n.request_url} | HTTP Method: ${n.request_method}`);
    if (n.response_body) console.log(`  Response Body: ${n.response_body}`);
    console.log('----------------------------------------------------');
  }
}

checkRecentNotifications().catch(console.error);
