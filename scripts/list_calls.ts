import { getTwilioConfig } from '../lib/server/voice/twilioService';

async function listRecentCalls() {
  const config = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json?PageSize=5`, {
    headers: { 'Authorization': authHeader }
  });
  
  const data = await res.json();
  console.log('Recent Calls:');
  for (const c of data.calls || []) {
    console.log(`• SID: ${c.sid} | To: ${c.to} | Status: ${c.status} | Duration: ${c.duration}s | AnsweredBy: ${c.answered_by}`);
    
    // Check call notifications
    const notifRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls/${c.sid}/Notifications.json`, {
      headers: { 'Authorization': authHeader }
    });
    const notifData = await notifRes.json();
    if (notifData.notifications && notifData.notifications.length > 0) {
      for (const n of notifData.notifications) {
        console.log(`  -> ERROR ${n.error_code}: ${n.message_text} | URL: ${n.request_url}`);
      }
    }
  }
}

listRecentCalls().catch(console.error);
