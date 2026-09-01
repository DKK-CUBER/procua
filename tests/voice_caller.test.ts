import {
  validateBusinessHours,
  calculateNextCallingWindow,
  assertCanDialImmediately,
  getSupplierTimezone,
  CONSERVATIVE_DEFAULT_HOURS
} from '../lib/server/voice/businessHours';
import {
  detectSpokenLanguage,
  extractOfferFromSpeech,
  processVoiceNegotiationTurn,
  generateCallOpening
} from '../lib/server/voice/voiceNegotiator';
import {
  startVoiceNegotiation,
  DEFAULT_BUYER_AUTHORIZATION
} from '../lib/server/voice/negotiationQueue';
import {
  buildVoiceTwiml,
  initiateTwilioCall
} from '../lib/server/voice/twilioService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runVoiceCallerTestSuite() {
  console.log('\n🧪 Running Procura AI Voice Caller & Business Hours Test Suite...\n');

  // ==========================================
  // SECTION 1: 10 HARD BUSINESS HOURS RULES
  // ==========================================
  console.log('1. Hard Business Hours & Calling Window Engine');

  // Rule 1: Determine Supplier Timezone
  assert(getSupplierTimezone({ country: 'India' }) === 'Asia/Kolkata', 'Rule 1: Identifies India timezone as Asia/Kolkata');
  assert(getSupplierTimezone(undefined, '+17372508034') === 'America/New_York', 'Rule 1: Identifies US phone timezone as America/New_York');

  // Rule 4, 3, 2: Open during regular business hours (e.g. Wednesday 14:30 IST)
  const wednesdayDaytime = new Date('2026-09-02T14:30:00+05:30');
  const daytimeCheck = validateBusinessHours({
    supplierHours: {
      startHour: 9,
      startMinute: 30,
      endHour: 18,
      endMinute: 30,
      daysOfWeek: [1, 2, 3, 4, 5, 6],
      timezone: 'Asia/Kolkata'
    },
    now: wednesdayDaytime
  });
  assert(daytimeCheck.canCallNow === true, 'Rule 3 & 4: Permitted during Wednesday 14:30 IST working hours');
  assert(daytimeCheck.isWithinWorkingHours === true, 'Rule 3: Within working hours');
  assert(daytimeCheck.isWorkingDay === true, 'Rule 2: Valid working day');

  // Rule 6: Never call during midnight/overnight hours (e.g. 02:30 AM IST)
  const midnightTime = new Date('2026-09-02T02:30:00+05:30');
  const midnightCheck = validateBusinessHours({
    now: midnightTime
  });
  assert(midnightCheck.canCallNow === false, 'Rule 6: Strictly blocks call at 02:30 AM midnight/overnight');
  assert(midnightCheck.isOvernightOrMidnight === true, 'Rule 6: Identifies overnight hour');

  // Rule 5: Never call when supplier is closed (e.g. Sunday)
  const sundayDaytime = new Date('2026-09-06T14:30:00+05:30'); // Sep 6, 2026 is Sunday
  const sundayCheck = validateBusinessHours({
    supplierHours: {
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      timezone: 'Asia/Kolkata'
    },
    now: sundayDaytime
  });
  assert(sundayCheck.canCallNow === false, 'Rule 5: Blocks call on closed day (Sunday)');
  assert(sundayCheck.isWorkingDay === false, 'Rule 2: Identifies Sunday as non-working day');

  // Rule 7: Respect supplier holidays when known (e.g. Independence Day Aug 15)
  const independenceDay = new Date('2026-08-15T11:00:00+05:30');
  const holidayCheck = validateBusinessHours({
    now: independenceDay
  });
  assert(holidayCheck.canCallNow === false, 'Rule 7: Blocks call on National Holiday (Aug 15)');
  assert(holidayCheck.isHoliday === true, 'Rule 7: Identifies public holiday');

  // Rule 8: Conservative default hours (Mon-Fri 10:00-18:00) when unknown
  const earlyMorningUnknown = new Date('2026-09-02T09:15:00+05:30'); // 09:15 AM
  const unknownHoursCheck = validateBusinessHours({
    now: earlyMorningUnknown
  });
  assert(unknownHoursCheck.canCallNow === false, 'Rule 8: Uses conservative 10:00 AM start, blocking 09:15 AM call');

  // Rule 9: If call is blocked, schedule and report next valid calling window
  assert(midnightCheck.nextCallingWindow !== null, 'Rule 9: Computes next valid calling window when blocked');
  assert(Boolean(midnightCheck.nextCallingWindow?.description), `Rule 9: Next window description (${midnightCheck.nextCallingWindow?.description})`);

  // Rule 10: Re-check immediately before dialing
  let dialBlocked = false;
  try {
    assertCanDialImmediately({ now: midnightTime });
  } catch (err: any) {
    dialBlocked = true;
  }
  assert(dialBlocked === true, 'Rule 10: assertCanDialImmediately throws error before dialing during closed hours');

  // ==========================================
  // SECTION 2: MULTILINGUAL VOICE AI ENGINE
  // ==========================================
  console.log('\n2. Multilingual Voice AI & Dynamic Code-Switching');

  // English
  const langEn = detectSpokenLanguage('Yes sir, we have 500 chairs available for immediate delivery.');
  assert(langEn.detectedLanguage === 'en', 'Detects English speech');

  // Tamil & Tanglish Code-Switching
  const langTa = detectSpokenLanguage('Vanakkam sir, 500 chairs ready stock irukku, price ₹7,600 varum.');
  assert(langTa.detectedLanguage === 'ta', 'Detects Tamil language');
  assert(langTa.isMixedLanguage === true, 'Detects Tanglish code-switching with English terms');

  // Hindi & Hinglish Code-Switching
  const langHi = detectSpokenLanguage('Namaste bhaiya, 500 units miljayega, rate ₹7,500 padega plus GST.');
  assert(langHi.detectedLanguage === 'hi', 'Detects Hindi language');
  assert(langHi.isMixedLanguage === true, 'Detects Hinglish code-switching');

  // Telugu
  const langTe = detectSpokenLanguage('Namaskaram sir, 500 pieces ready undi, delivery 7 days padutundi.');
  assert(langTe.detectedLanguage === 'te', 'Detects Telugu language');

  // Kannada
  const langKn = detectSpokenLanguage('Namaskara sir, 500 pieces ide, rate 7400 agutte.');
  assert(langKn.detectedLanguage === 'kn', 'Detects Kannada language');

  // Spoken Offer Extraction
  const offerTa = extractOfferFromSpeech('Unit price ₹7,600 varum sir, delivery 7 days aagum, GST extra.', 500, 6500);
  assert(offerTa !== null && offerTa.unitPrice === 7600, 'Extracts unit price ₹7,600 from spoken Tamil');
  assert(offerTa?.deliveryDays === 7, 'Extracts delivery duration 7 days');
  assert(offerTa?.gstStatus === 'extra', 'Extracts GST extra status');

  // ==========================================
  // SECTION 3: HARD NEGOTIATION CONSTRAINTS
  // ==========================================
  console.log('\n3. Hard Negotiation Constraints & Persona Rules');

  const mockContext = {
    buyerName: 'Sadwik',
    companyName: 'Example Technologies',
    product: 'Ergonomic Office Chairs',
    quantity: 500,
    deliveryLocation: 'Chennai',
    targetPrice: 6500,
    maximumPrice: 8000,
    supplierName: 'ABC Furniture',
    currentRound: 1,
    maxRounds: 4,
    conversationHistory: []
  };

  // 1. Natural Opening
  const opening = generateCallOpening({
    buyerName: 'Sadwik',
    companyName: 'Example Technologies',
    product: 'Ergonomic office chairs',
    quantity: 500,
    deliveryLocation: 'Chennai'
  });
  assert(opening.speechText.includes('Sadwik'), 'Uses buyer name Sadwik naturally');
  assert(!opening.speechText.includes('I am an AI calling on behalf of'), 'Does not use robotic "on behalf of" disclaimer');

  // 2. Over-Budget Hard Constraint (e.g. ₹8,500 > ₹8,000 maximum authorized)
  const overBudgetDecision = await processVoiceNegotiationTurn({
    supplierSpeech: 'Best price ₹8,500 per chair sir, below that not possible.',
    context: mockContext
  });
  assert(overBudgetDecision.intent === 'refuse_over_budget', 'Refuses offer above maximum authorized price ₹8,000');
  assert(!overBudgetDecision.nextSpeechText.includes('8000') && !overBudgetDecision.nextSpeechText.includes('maximum budget'), 'Zero budget disclosure: Never leaks maximum price');

  // 3. Counter-Offer in Supplier Language (Tamil)
  const round1Decision = await processVoiceNegotiationTurn({
    supplierSpeech: 'Vanakkam, 500 chairs-ku rate ₹7,600 varum sir.',
    context: mockContext
  });
  assert(round1Decision.detectedLanguage.detectedLanguage === 'ta', 'Identified supplier spoke in Tamil');
  assert(round1Decision.intent === 'counter_offer', 'Formulates strategic counter-offer');

  // 4. Final Round & Non-Binding Closing
  const finalRoundDecision = await processVoiceNegotiationTurn({
    supplierSpeech: 'Final offer ₹7,200 per unit door delivery included.',
    context: { ...mockContext, currentRound: 4 }
  });
  assert(finalRoundDecision.isFinalRound === true, 'Enforces maximum 4 negotiation rounds');
  assert(finalRoundDecision.shouldHangup === true, 'Closes negotiation professionally');
  assert(
    finalRoundDecision.nextSpeechText.includes('review') || finalRoundDecision.nextSpeechText.includes('PO'),
    'Non-binding rule: Never places order without buyer approval ("will review with buyer")'
  );

  // ==========================================
  // SECTION 4: BACKEND SELECTION & QUEUE
  // ==========================================
  console.log('\n4. Explicit Selection Gate & Telephony TwiML');

  const startRes = await startVoiceNegotiation({
    procurementId: 'proc_123',
    supplierIds: ['sup_001', 'sup_002'],
    buyerName: 'Sadwik',
    isSimulation: true
  });
  assert(startRes.success === true, 'Successfully created negotiation queue for selected suppliers');
  assert(startRes.queue.length === 2, 'Queued exactly 2 selected suppliers');
  assert(startRes.authorizationSummary.allowFinalizePurchase === false, 'Purchase finalization switch is strictly false');

  // TwiML Generation
  const twiml = buildVoiceTwiml({
    speechText: 'Hello from Procura voice agent',
    actionUrl: '/api/webhooks/twilio/voice?negId=test'
  });
  assert(twiml.includes('<Gather') && twiml.includes('Polly.Aditi'), 'Generates valid interactive TwiML XML with Polly.Aditi voice');

  // Outbound Call Initiation (Simulated)
  const callRes = await initiateTwilioCall({
    toPhoneNumber: '+914428349100',
    negotiationId: 'neg-test-1',
    procurementId: 'proc-1',
    supplierId: 'sup-1',
    supplierName: 'Cobalt Office',
    isSimulation: true
  });
  assert(callRes.success === true, 'Initiates outbound call with valid SID');
  assert(callRes.from === '+17372508034', 'Uses configured Twilio caller number (+17372508034)');

  console.log('\n======================================================');
  console.log('Summary: All 10 Business Hours & Voice AI tests passed! 🚀');
  console.log('======================================================\n');
}

runVoiceCallerTestSuite().catch((err) => {
  console.error('\n❌ Voice Caller Test Suite Failed:', err);
  process.exit(1);
});
