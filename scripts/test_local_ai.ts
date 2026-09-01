/**
 * Live test: Uses the actual local Ollama Gemma3 model to:
 * 1. Draft a real RFQ email for DKK Chairs
 * 2. Extract offer terms from a mock supplier reply
 * 3. Compare the offer against buyer constraints
 */

import { draftRfq, extractSupplierOffer, compareOffer } from '../lib/server/ai/negotiationAi';

async function testLocalAI() {
  console.log('====================================================');
  console.log('🤖 TESTING LOCAL AI MODEL (Ollama Gemma3 4.3B)');
  console.log('   Base URL: http://127.0.0.1:11434');
  console.log('   Model: gemma3:latest');
  console.log('====================================================\n');

  // ---- STEP 1: Draft RFQ using local AI ----
  console.log('📝 STEP 1: Asking Gemma3 to draft a live RFQ email for DKK Chairs...');
  console.time('RFQ Draft Time');
  
  const rfq = await draftRfq({
    product: 'Big Ergonomic Office Task Chairs',
    quantity: 500,
    locationCity: 'Chennai',
    supplierName: 'DKK Chairs',
    targetPrice: 6200,
    maxBudget: 7500,
    rfqReference: 'PROC-2026-DKK7000'
  });
  
  console.timeEnd('RFQ Draft Time');
  console.log('\n✅ RFQ Generated!');
  console.log(`• Reference: ${rfq.rfqReference}`);
  console.log(`• Subject: ${rfq.subject}`);
  console.log(`• Disclaimer Included: ${rfq.disclaimerIncluded}`);
  console.log('\n--- EMAIL BODY (first 600 chars) ---');
  console.log(rfq.body.substring(0, 600));
  console.log('...\n');

  // ---- STEP 2: Extract offer from mock supplier reply using local AI ----
  console.log('----------------------------------------------------');
  console.log('📥 STEP 2: Asking Gemma3 to extract commercial terms from a mock supplier reply...');
  
  const mockSupplierReply = `
Hi,

Thanks for reaching out. We at DKK Chairs can supply ergonomic task chairs in bulk.

For 500 units our pricing is:
- Unit Price: ₹6,800 per chair (inclusive of 18% GST)
- Delivery: Door delivery to Chennai within 7 business days
- Freight: Included in the quoted price
- Payment Terms: 40% advance on purchase order, 60% on delivery
- MOQ: 100 units, but you are ordering 500 so we can offer priority dispatch
- Warranty: 2 years manufacturer warranty on all chairs

This quote is valid for 10 days from today.

Best Regards,
DKK Chairs Sales Team
  `;

  console.time('Offer Extraction Time');
  const extracted = await extractSupplierOffer({
    emailBody: mockSupplierReply,
    expectedProduct: 'Big Ergonomic Office Task Chairs',
    expectedQuantity: 500
  });
  console.timeEnd('Offer Extraction Time');

  console.log('\n✅ Offer Extracted by Gemma3!');
  console.log(`• Unit Price:       ₹${extracted.unitPrice?.toLocaleString('en-IN') ?? 'Not found'}`);
  console.log(`• GST:              ${extracted.gstPercent ?? 'N/A'}%`);
  console.log(`• Freight Included: ${extracted.freightIncluded}`);
  console.log(`• Lead Time:        ${extracted.leadTimeDays} days`);
  console.log(`• Payment Terms:    ${extracted.paymentTerms}`);
  console.log(`• Warranty:         ${extracted.warrantyTerms}`);
  console.log(`• Summary:          ${extracted.summary}`);
  console.log(`• Missing Terms:    ${extracted.missingTerms.length ? extracted.missingTerms.join(', ') : 'None'}`);

  // ---- STEP 3: AI comparison against buyer constraints ----
  console.log('\n----------------------------------------------------');
  console.log('⚖️  STEP 3: Asking Gemma3 to compare offer against buyer constraints...');

  const comparison = await compareOffer({
    extractedOffer: extracted,
    targetPrice: 6200,
    maxUnitPrice: 7500,
    maxDeliveryDays: 7
  });

  console.log('\n✅ Comparison Result from Gemma3:');
  console.log(`• Meets Target Price (₹6,200):   ${comparison.meetsTargetPrice}`);
  console.log(`• Within Max Budget (₹7,500):    ${comparison.withinMaxBudget}`);
  console.log(`• Price Variance:                 ${comparison.priceVariancePercent}% above target`);
  console.log(`• Meets Delivery Deadline:        ${comparison.meetsDeliveryDeadline}`);
  console.log(`• Discrepancies:                  ${comparison.discrepancies.length ? comparison.discrepancies.join('; ') : 'None'}`);
  console.log(`• Recommended Action:             ${comparison.recommendedAction}`);
  console.log(`• Reasoning:                      ${comparison.recommendationReason}`);
  
  console.log('\n====================================================');
  console.log('✅ ALL 3 AI STEPS COMPLETED USING LOCAL GEMMA3 MODEL');
  console.log('====================================================');
}

testLocalAI().catch((err) => {
  console.error('❌ Local AI test failed:', err.message);
  process.exit(1);
});
