import { sanitizeUntrustedInput, validatePriceConstraints } from '../security';

export interface NegotiationStrategyContext {
  roundNumber: number;
  productName: string;
  quantity: number;
  targetPrice: number;
  maxPrice: number;
  freightRequired: boolean;
  paymentTerms?: string;
  lastSellerMessage?: string;
  lastOfferedPrice?: number;
}

export interface BuyerDraftResult {
  messageContent: string;
  priceProposed: number;
  tacticsUsed: string;
}

/**
 * Controlled AI Negotiation Agent
 * Formulates strategic messages strictly within buyer constraints.
 */
export function generateBuyerProposal(context: NegotiationStrategyContext): BuyerDraftResult {
  // Defend against prompt injection in seller text
  const sanitizedSeller = sanitizeUntrustedInput(context.lastSellerMessage || '');

  // Ensure proposed price never exceeds buyer max limit
  const priceConstraint = validatePriceConstraints({
    unitPrice: context.targetPrice,
    quantity: context.quantity,
    maxUnitPrice: context.maxPrice
  });

  if (!priceConstraint.isValid) {
    throw new Error(`Constraint violation: ${priceConstraint.reason}`);
  }

  if (context.roundNumber === 1) {
    return {
      messageContent: `We are looking to confirm an order of ${context.quantity} units of ${context.productName}. Our target budget is ₹${context.targetPrice}/unit with ${context.freightRequired ? 'freight included' : 'standard delivery'}. If we confirm the full bulk quantity immediately, what is your best available price?`,
      priceProposed: context.targetPrice,
      tacticsUsed: 'Anchor Price & Volume Leverage'
    };
  }

  if (context.roundNumber === 2) {
    // If seller countered at say ₹750, propose middle ground with fast payment term
    const counterPrice = Math.min(context.maxPrice, Math.max(context.targetPrice, (context.lastOfferedPrice ? context.lastOfferedPrice - 10 : context.targetPrice)));
    return {
      messageContent: `If we confirm all ${context.quantity} units and payment is made promptly (30% advance, balance on delivery), can you do ₹${counterPrice} including delivery within 4-5 days?`,
      priceProposed: counterPrice,
      tacticsUsed: 'Trade-off: Accelerated Payment for Rate Concession'
    };
  }

  // Final round (Round 3)
  const finalPrice = Math.min(context.maxPrice, context.lastOfferedPrice || context.targetPrice);
  return {
    messageContent: `We are ready to finalize and issue PO today at ₹${finalPrice}/unit with freight included and 2 years warranty. Please confirm acceptance so our procurement lead can review and issue the PO.`,
    priceProposed: finalPrice,
    tacticsUsed: 'Final Closing Offer with Warranty Confirmation'
  };
}

/**
 * Detect terms changes between negotiation rounds
 */
export function detectTermsVariance(
  previousTerms: { price: number; freight: string; deliveryDays: number },
  currentTerms: { price: number; freight: string; deliveryDays: number }
): { hasChanged: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (previousTerms.freight === 'included' && currentTerms.freight === 'extra') {
    warnings.push('⚠ Supplier changed freight terms from "Included" to "Extra".');
  }
  if (currentTerms.deliveryDays > previousTerms.deliveryDays) {
    warnings.push(`⚠ Delivery timeline lengthened from ${previousTerms.deliveryDays} days to ${currentTerms.deliveryDays} days.`);
  }
  if (currentTerms.price > previousTerms.price) {
    warnings.push(`⚠ Supplier increased unit price from ₹${previousTerms.price} to ₹${currentTerms.price}.`);
  }

  return {
    hasChanged: warnings.length > 0,
    warnings
  };
}
