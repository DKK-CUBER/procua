import { initiateTwilioCall, buildVoiceTwiml } from '../lib/server/voice/twilioService';
import { generateCallOpening, processVoiceNegotiationTurn } from '../lib/server/voice/voiceNegotiator';
import { validateBusinessHours } from '../lib/server/voice/businessHours';

async function main() {
  const sellerPhone = '+916369763938';
  const sellerName = 'DKK Chairs';
  const product = 'Big ergonomic office chairs';
  const sellerBasePrice = 7000;
  const buyerTargetPrice = 6200;
  const maxPriceCeiling = 7500;
  const quantity = 500;
  const buyerName = 'Sadwik';
  const companyName = 'Procura Technologies';
  const deliveryLocation = 'Chennai';

  console.log('====================================================');
  console.log('📞 INITIATING PROCURA VOICE AI NEGOTIATION CALL');
  console.log('====================================================');
  console.log(`• Supplier: ${sellerName}`);
  console.log(`• Destination Phone: ${sellerPhone}`);
  console.log(`• Twilio Outbound Number: +17372508034`);
  console.log(`• Product: ${product} (${quantity} units)`);
  console.log(`• Supplier Quoted Price: ₹${sellerBasePrice.toLocaleString('en-IN')} / unit`);
  console.log(`• Buyer Target: ₹${buyerTargetPrice.toLocaleString('en-IN')} / unit`);
  console.log(`• Max Budget Ceiling: ₹${maxPriceCeiling.toLocaleString('en-IN')} (Confidential)`);
  console.log('----------------------------------------------------');

  // 1. Business Hours & Calling Window Check
  const hoursCheck = validateBusinessHours({
    location: { city: 'Chennai', country: 'India' },
    phone: sellerPhone
  });
  console.log(`🕒 Business Hours Check: ${hoursCheck.canCallNow ? '✅ OPEN' : '⚠️ OUTSIDE STANDARD WINDOW'} (${hoursCheck.supplierLocalTime})`);
  console.log(`   Reason/Schedule: ${hoursCheck.reason}`);
  console.log('----------------------------------------------------');

  // 2. Prepare Opening Speech
  const opening = generateCallOpening({
    buyerName,
    companyName,
    product,
    quantity,
    deliveryLocation
  });
  console.log(`🎙️ Opening AI Voice Pitch (Sadwik persona):`);
  console.log(`   "${opening.speechText}"`);
  console.log('----------------------------------------------------');

  // 3. Initiate Live Outbound Call via Twilio REST API
  console.log('🚀 Calling Twilio REST API...');
  const callResult = await initiateTwilioCall({
    toPhoneNumber: sellerPhone,
    negotiationId: 'neg-dkk-chairs-' + Date.now(),
    procurementId: 'proc-dkk-500',
    supplierId: 'sup-dkk-chairs',
    supplierName: sellerName,
    buyerName: 'Sadwik',
    isSimulation: false
  });

  console.log('----------------------------------------------------');
  console.log('📡 TWILIO CALL DISPATCH RESULT:');
  console.log(`• Success: ${callResult.success ? '✅ YES' : '❌ NO'}`);
  console.log(`• Call SID: ${callResult.callSid || 'N/A'}`);
  console.log(`• Status: ${callResult.status}`);
  console.log(`• To: ${callResult.to}`);
  console.log(`• From: ${callResult.from}`);
  if (callResult.message) {
    console.log(`• Notice/Message: ${callResult.message}`);
  }
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Call execution error:', err);
  process.exit(1);
});
