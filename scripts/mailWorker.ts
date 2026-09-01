import { syncInboundProcurementReplies } from '../lib/server/email/imapWorker';

console.log('📬 Starting Procura IMAP Inbound Mail Sync Worker...');
console.log('Polling interval: 45 seconds (Host: imap.gmail.com:993)');

async function pollOnce() {
  try {
    const res = await syncInboundProcurementReplies();
    if (res.syncedCount > 0) {
      console.log(`✅ Synced ${res.syncedCount} new supplier reply(ies):`, res.matchedMessages);
    }
    if (res.errors.length > 0) {
      console.warn('⚠️ Mail worker notice:', res.errors.join('; '));
    }
  } catch (err: any) {
    console.error('❌ Mail worker error:', err.message);
  }
}

// Initial run
pollOnce();

// 45-second polling loop
setInterval(pollOnce, 45000);
