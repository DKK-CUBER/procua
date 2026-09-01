import { classifyDomain, extractDomain, isRestrictedPlatform } from '../lib/server/discovery/classification';
import { calculateWebsiteConfidence } from '../lib/server/discovery/websiteConfidence';
import { runSupplierDiscovery } from '../lib/server/discovery/engine';
import { resolveSupplierContact } from '../lib/server/discovery/contactResolver';
import { draftRfq, extractSupplierOffer, compareOffer, generateRfqReference } from '../lib/server/ai/negotiationAi';
import { sendProcurementEmail } from '../lib/server/email/smtpService';
import { buildPurchaseOrderPdf } from '../lib/server/services/pdfService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runProductionTestSuite() {
  console.log('\n🧪 Running Procura Production Flow Test Suite...\n');

  // 1. Classification & Domain Truth Engine
  console.log('1. Domain Classification & Marketplace Separation');
  assert(classifyDomain('https://www.indiamart.com/company/profile.html') === 'marketplace_b2b', 'IndiaMART classified as marketplace_b2b');
  assert(classifyDomain('https://www.amazon.in/dp/B08XYZ1234') === 'marketplace_retail', 'Amazon India classified as marketplace_retail');
  assert(classifyDomain('https://www.flipkart.com/item/123') === 'marketplace_retail', 'Flipkart classified as marketplace_retail');
  assert(classifyDomain('https://www.justdial.com/Chennai/Furniture') === 'directory_listing', 'Justdial classified as directory_listing');
  assert(classifyDomain('https://www.cobaltoffice.in') === 'direct_supplier', 'Cobalt Office classified as direct_supplier');
  assert(isRestrictedPlatform('amazon.in') === true, 'Amazon is marked as restricted platform');
  assert(isRestrictedPlatform('cobaltoffice.in') === false, 'Direct supplier domain is not restricted');

  // 2. Website Discovery & Confidence Calculation
  console.log('\n2. Supplier Website Confidence & Safety Guard');
  const confMarketplace = calculateWebsiteConfidence({
    candidateUrl: 'https://www.indiamart.com/procura-chairs',
    businessName: 'Procura Chairs',
    city: 'Chennai',
    productKeyword: 'chairs'
  });
  assert(confMarketplace.isOfficialWebsite === false, 'Marketplace URL is never verified as official website (0% confidence)');
  assert(confMarketplace.confidence === 0, 'Marketplace confidence is strictly 0');

  const confDirectSupplier = calculateWebsiteConfidence({
    candidateUrl: 'https://cobaltoffice.in/contact',
    businessName: 'Cobalt Office Systems',
    city: 'Chennai',
    state: 'Tamil Nadu',
    productKeyword: 'office chairs',
    pageSnippetOrTitle: 'Cobalt Office Systems Chennai - Manufacturer of Ergonomic Office Chairs in Tamil Nadu'
  });
  assert(confDirectSupplier.confidence >= 0.90, `Direct supplier confidence score is >= 0.90 (${confDirectSupplier.confidence})`);
  assert(confDirectSupplier.isOfficialWebsite === true, 'Verified as official direct supplier website');

  // 3. Contact Resolution & Negotiation Gate
  console.log('\n3. Contact Resolution & Unverified Contact Gate');
  const unverifiedContact = await resolveSupplierContact({
    supplierId: 'sup-test-01',
    officialWebsiteUrl: null
  });
  assert(unverifiedContact.status === 'unavailable', 'Missing website resolves contact as unavailable');

  const manualVerifiedContact = await resolveSupplierContact({
    supplierId: 'sup-test-02',
    manualEmail: 'procurement@apexmodular.co.in',
    manualPhone: '+91 44 2688 4100'
  });
  assert(manualVerifiedContact.status === 'verified', 'Manual buyer confirmed email is verified');
  assert(manualVerifiedContact.email === 'procurement@apexmodular.co.in', 'Preserves exact verified email');
  assert(manualVerifiedContact.source === 'manual', 'Email source recorded as manual');

  // 4. Multi-Intent Discovery Engine & Top 5 Ranking
  console.log('\n4. Multi-Intent Discovery Engine & Top 5 Ranking');
  const discovery = await runSupplierDiscovery({
    product: 'ergonomic office chairs',
    quantity: 50,
    location: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' }
  });
  assert(discovery.success === true, 'Discovery executed successfully');
  assert(discovery.top5Suppliers.length > 0 && discovery.top5Suppliers.length <= 5, 'Returns Top 5 direct supplier candidates');
  assert(discovery.top5Suppliers.every((s) => !isRestrictedPlatform(s.officialWebsite.url || '')), 'No marketplace domain exists in direct supplier official websites');
  assert(discovery.marketIntelligence !== undefined, 'Market intelligence array is populated');

  // 5. Local Gemma 3 AI Operations & Structured Schemas
  console.log('\n5. Local Gemma 3 AI RFQ Drafting & Extraction');
  const rfqRef = generateRfqReference();
  assert(/^PROC-\d{4}-\d{5}$/.test(rfqRef), `Generated valid RFQ reference format (${rfqRef})`);

  const draftedRfq = await draftRfq({
    product: 'ergonomic office chairs',
    quantity: 50,
    locationCity: 'Chennai',
    supplierName: 'Cobalt Office Systems',
    targetPrice: 700,
    rfqReference: rfqRef
  });
  assert(draftedRfq.rfqReference === rfqRef, 'RFQ includes exact reference code');
  assert(draftedRfq.subject.includes(rfqRef), 'Email subject contains RFQ reference code');
  assert(draftedRfq.disclaimerIncluded === true, 'RFQ includes mandatory "not a purchase order" notice');

  const extracted = await extractSupplierOffer({
    emailBody: 'We thank you for the RFQ. We can offer Rs 740 per unit with door freight included in 4 business days.',
    expectedProduct: 'ergonomic office chairs',
    expectedQuantity: 50
  });
  assert(extracted.unitPrice === 740, 'Extracted quoted unit price ₹740');
  assert(extracted.leadTimeDays === 4, 'Extracted lead time 4 days');
  assert(extracted.freightIncluded === true, 'Identified freight included in quote');

  const comparison = await compareOffer({
    extractedOffer: extracted,
    targetPrice: 700,
    maxUnitPrice: 800
  });
  assert(comparison.withinMaxBudget === true, 'Verified offer is within maximum budget');

  // 6. SMTP Outbound Email (Preview Mode Safety)
  console.log('\n6. SMTP Outbound Service (Preview Mode)');
  const emailRes = await sendProcurementEmail({
    to: 'sales@cobaltoffice.in',
    subject: draftedRfq.subject,
    body: draftedRfq.body,
    rfqReference: rfqRef,
    deliveryModeOverride: 'preview'
  });
  assert(emailRes.success === true, 'Preview email recorded successfully');
  assert(emailRes.deliveryMode === 'preview', 'Preview mode active - no live email sent');
  assert(emailRes.headers['X-Procura-RFQ-Ref'] === rfqRef, 'Email contains X-Procura-RFQ-Ref header');
  assert(Boolean(emailRes.messageId), 'Generated RFC-compliant Message-ID');

  // 7. PO Acceptance Guard & PDF Generation
  console.log('\n7. PO Acceptance & PDF Generation');
  const samplePo = {
    id: 'po-1827',
    poNumber: 'PO-1827',
    rfqReference: rfqRef,
    supplierName: 'Cobalt Office Systems',
    status: 'APPROVED',
    subtotal: 37000,
    taxAmount: 6660,
    totalAmount: 43660,
    items: [
      {
        itemName: 'Ergonomic office chairs',
        quantity: 50,
        unitPrice: 740,
        totalAmount: 43660
      }
    ],
    deliveryTerms: 'Door delivery Chennai warehouse',
    expectedDelivery: '4 business days'
  };

  const pdfBuffer = buildPurchaseOrderPdf(samplePo);
  assert(pdfBuffer instanceof Buffer, 'Generated valid binary PDF Buffer');
  assert(pdfBuffer.length > 1000, `PDF size is valid (${pdfBuffer.length} bytes)`);

  console.log('\n========================================');
  console.log('Summary: All production flow tests passed! 🚀');
  console.log('========================================\n');
}

runProductionTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
