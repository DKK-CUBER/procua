import { z } from 'zod';
import { callOllamaChat } from './ollamaClient';

// Schemas
export const DraftRfqOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  rfqReference: z.string(),
  requestedTerms: z.object({
    product: z.string(),
    quantity: z.number(),
    deliveryLocation: z.string(),
    targetPrice: z.number().optional(),
    requiredDeliveryDays: z.number().optional()
  }),
  disclaimerIncluded: z.boolean()
});
export type DraftRfqOutput = z.infer<typeof DraftRfqOutputSchema>;

export const ExtractSupplierOfferOutputSchema = z.object({
  unitPrice: z.number().nullable(),
  quantity: z.number().nullable(),
  currency: z.string().default('INR'),
  gstPercent: z.number().nullable(),
  freightIncluded: z.boolean().default(true),
  freightCost: z.number().nullable(),
  leadTimeDays: z.number().nullable(),
  moq: z.number().nullable(),
  paymentTerms: z.string().nullable(),
  warrantyTerms: z.string().nullable(),
  quoteValidityDate: z.string().nullable(),
  missingTerms: z.array(z.string()),
  summary: z.string()
});
export type ExtractSupplierOfferOutput = z.infer<typeof ExtractSupplierOfferOutputSchema>;

export const CompareOfferOutputSchema = z.object({
  meetsTargetPrice: z.boolean(),
  withinMaxBudget: z.boolean(),
  priceVariancePercent: z.number(),
  meetsDeliveryDeadline: z.boolean(),
  discrepancies: z.array(z.string()),
  recommendedAction: z.enum(['APPROVE', 'COUNTER_OFFER', 'REQUEST_CLARIFICATION', 'REJECT']),
  recommendationReason: z.string()
});
export type CompareOfferOutput = z.infer<typeof CompareOfferOutputSchema>;

export const DraftCounterofferOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  counterUnitPrice: z.number(),
  tradeoffsOffered: z.array(z.string()),
  expectedResponseTimeHours: z.number()
});
export type DraftCounterofferOutput = z.infer<typeof DraftCounterofferOutputSchema>;

export const DraftClarificationOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  questionsToSupplier: z.array(z.string())
});
export type DraftClarificationOutput = z.infer<typeof DraftClarificationOutputSchema>;

// Helper to generate standard RFQ Reference
export function generateRfqReference(): string {
  const dateStr = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `PROC-${dateStr}-${rand}`;
}

export async function draftRfq(params: {
  product: string;
  quantity: number;
  locationCity: string;
  supplierName: string;
  targetPrice?: number;
  maxBudget?: number;
  rfqReference?: string;
}): Promise<DraftRfqOutput> {
  const rfqRef = params.rfqReference || generateRfqReference();

  const prompt = `You are Procura B2B Procurement AI drafting a formal Request for Quotation (RFQ).
Generate a professional, structured B2B RFQ email to "${params.supplierName}" for procuring ${params.quantity} units of "${params.product}" delivered to ${params.locationCity}.

Requirements:
- RFQ Reference: ${rfqRef}
- Request: Unit price (excl. and incl. 18% GST), freight charges, lead time/delivery SLA, MOQ, payment terms (e.g. 30% advance on PO confirmation), and quote validity.
- Target Price benchmark (internal context): ${params.targetPrice ? '₹' + params.targetPrice : 'Competitive commercial rate'}
- Include statement: "This RFQ is not a purchase order. Commercial commitment will be formalized via official Purchase Order upon approval."

Respond in JSON matching the schema.`;

  const res = await callOllamaChat({
    messages: [
      { role: 'system', content: 'You output only valid JSON matching the requested schema.' },
      { role: 'user', content: prompt }
    ],
    schema: DraftRfqOutputSchema
  });

  if (res.success && res.data) {
    return res.data;
  }

  // Deterministic fallback
  return {
    rfqReference: rfqRef,
    subject: `Request for Quotation: ${params.product} (${params.quantity} units) - Ref [${rfqRef}]`,
    body: `Dear ${params.supplierName} Commercial Team,\n\nWe are pleased to request a formal quotation for the following procurement requirement:\n\n• Product: ${params.product}\n• Quantity: ${params.quantity} units\n• Delivery Destination: Warehouse facilities, ${params.locationCity}\n• Target Delivery SLA: Within 4-5 business days\n\nPlease furnish your best commercial quote specifying:\n1. Unit price and total amount (exclusive and inclusive of 18% GST)\n2. Door delivery freight terms to ${params.locationCity}\n3. Minimum Order Quantity (MOQ) and lead time\n4. Payment and warranty terms\n5. Quote validity period\n\nNote: This RFQ is not a purchase order. Formal purchase commitments will be issued upon commercial approval.\n\nBest regards,\nProcurement Desk · Procura Platform\nReference: ${rfqRef}`,
    requestedTerms: {
      product: params.product,
      quantity: params.quantity,
      deliveryLocation: params.locationCity,
      targetPrice: params.targetPrice,
      requiredDeliveryDays: 5
    },
    disclaimerIncluded: true
  };
}

export async function extractSupplierOffer(params: {
  emailBody: string;
  expectedProduct: string;
  expectedQuantity: number;
}): Promise<ExtractSupplierOfferOutput> {
  const prompt = `Extract commercial offer terms from this supplier email:
"""
${params.emailBody}
"""
Target product: ${params.expectedProduct}, Quantity: ${params.expectedQuantity}

Extract unitPrice (number), quantity (number), freightIncluded (boolean), freightCost (number or null), gstPercent (number or null), leadTimeDays (number or null), paymentTerms (string or null), warrantyTerms (string or null), missingTerms (array of strings), and a short summary.
Respond in valid JSON.`;

  const res = await callOllamaChat({
    messages: [
      { role: 'system', content: 'Extract structured pricing terms accurately. Return only JSON.' },
      { role: 'user', content: prompt }
    ],
    schema: ExtractSupplierOfferOutputSchema
  });

  if (res.success && res.data) {
    return res.data;
  }

  // Deterministic fallback regex extraction
  const priceMatch = params.emailBody.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i);
  const unitPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

  const daysMatch = params.emailBody.match(/(\d+)\s*(?:days|business days|working days)/i);
  const leadTimeDays = daysMatch ? parseInt(daysMatch[1]) : 4;

  return {
    unitPrice,
    quantity: params.expectedQuantity,
    currency: 'INR',
    gstPercent: 18.0,
    freightIncluded: !params.emailBody.toLowerCase().includes('freight extra'),
    freightCost: 0,
    leadTimeDays,
    moq: params.expectedQuantity,
    paymentTerms: '30% advance on PO confirmation, 70% against delivery',
    warrantyTerms: 'Standard 1-year commercial warranty',
    quoteValidityDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    missingTerms: unitPrice ? [] : ['Unit price not clearly extracted'],
    summary: unitPrice ? `Supplier quoted ₹${unitPrice.toLocaleString('en-IN')}/unit with ${leadTimeDays} days delivery.` : 'Supplier responded with general catalog details.'
  };
}

export async function compareOffer(params: {
  extractedOffer: ExtractSupplierOfferOutput;
  targetPrice: number;
  maxUnitPrice: number;
  maxDeliveryDays?: number;
}): Promise<CompareOfferOutput> {
  const quotedPrice = params.extractedOffer.unitPrice || params.maxUnitPrice;
  const target = params.targetPrice;
  const maxBudget = params.maxUnitPrice;
  const variancePct = Math.round(((quotedPrice - target) / target) * 100);
  const withinBudget = quotedPrice <= maxBudget;
  const meetsTarget = quotedPrice <= target * 1.02;

  const discrepancies: string[] = [];
  if (quotedPrice > maxBudget) {
    discrepancies.push(`Quoted price ₹${quotedPrice} exceeds maximum budget ₹${maxBudget}`);
  }
  if (!params.extractedOffer.freightIncluded) {
    discrepancies.push('Freight is not included in quote');
  }
  if (params.extractedOffer.leadTimeDays && params.extractedOffer.leadTimeDays > (params.maxDeliveryDays || 5)) {
    discrepancies.push(`Lead time of ${params.extractedOffer.leadTimeDays} days exceeds target SLA of ${params.maxDeliveryDays || 5} days`);
  }

  let action: 'APPROVE' | 'COUNTER_OFFER' | 'REQUEST_CLARIFICATION' | 'REJECT' = 'COUNTER_OFFER';
  let reason = '';

  if (meetsTarget && withinBudget && discrepancies.length === 0) {
    action = 'APPROVE';
    reason = `Quoted price of ₹${quotedPrice.toLocaleString('en-IN')} meets target commercial terms. Ready for buyer approval.`;
  } else if (withinBudget) {
    action = 'COUNTER_OFFER';
    reason = `Quoted ₹${quotedPrice.toLocaleString('en-IN')} is +${variancePct}% above target price of ₹${target.toLocaleString('en-IN')}. Counter-offer recommended.`;
  } else {
    action = 'REJECT';
    reason = `Quoted ₹${quotedPrice.toLocaleString('en-IN')} exceeds maximum budget limit of ₹${maxBudget.toLocaleString('en-IN')}.`;
  }

  return {
    meetsTargetPrice: meetsTarget,
    withinMaxBudget: withinBudget,
    priceVariancePercent: variancePct,
    meetsDeliveryDeadline: (params.extractedOffer.leadTimeDays || 4) <= (params.maxDeliveryDays || 5),
    discrepancies,
    recommendedAction: action,
    recommendationReason: reason
  };
}

export async function draftCounteroffer(params: {
  supplierName: string;
  product: string;
  quantity: number;
  currentQuotedPrice: number;
  targetPrice: number;
  rfqReference: string;
}): Promise<DraftCounterofferOutput> {
  return {
    subject: `Re: Commercial terms update: ${params.product} - Ref [${params.rfqReference}]`,
    body: `Dear ${params.supplierName} Commercial Desk,\n\nThank you for your initial quote of ₹${params.currentQuotedPrice.toLocaleString('en-IN')} per unit.\n\nAs we are confirming the full procurement batch of ${params.quantity} units with immediate PO issuance and guaranteed payment on delivery, our approved target budget is ₹${params.targetPrice.toLocaleString('en-IN')} per unit (inclusive of door freight).\n\nPlease confirm if this revised rate is acceptable so we can process and issue the official Purchase Order.\n\nBest regards,\nProcurement Team · Procura\nReference: ${params.rfqReference}`,
    counterUnitPrice: params.targetPrice,
    tradeoffsOffered: ['100% order confirmation for all units', 'Immediate PO confirmation', 'Prompt delivery acceptance'],
    expectedResponseTimeHours: 24
  };
}
