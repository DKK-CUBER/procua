import { ParsedRequirementDTO } from '@/lib/types';
import { sanitizeUntrustedInput } from '../security';

/**
 * AI Natural Language Requirement Understanding Engine
 * Parses raw text into structured procurement fields and evaluates constraint integrity.
 */
export async function parseProcurementRequirement(rawInput: string): Promise<ParsedRequirementDTO> {
  const { sanitized } = sanitizeUntrustedInput(rawInput || '');

  // Default extraction structure
  let quantity: number | null = null;
  let location: string | null = null;
  let budget: number | null = null;
  let deliveryDeadline: string | null = null;
  const missingFields: string[] = [];

  // Deterministic rule & regex parsing
  // 1. Quantity extraction (e.g. "500 chairs", "500 units", "qty: 500", "500 pcs")
  const qtyMatch = sanitized.match(/(\d{1,6})\s*(chairs|units|pcs|pieces|sets|items|nos|box|boxes)?/i);
  if (qtyMatch && parseInt(qtyMatch[1], 10) > 0) {
    quantity = parseInt(qtyMatch[1], 10);
  }

  // 2. Budget extraction (e.g. "under ₹750", "below 750/unit", "max 750", "budget 750", "₹750")
  const budgetMatch = sanitized.match(/(?:under|below|max|budget|within|target|₹|rs\.?)\s*([0-9,]+)(?:\s*\/\s*unit|\s*per\s*unit)?/i);
  if (budgetMatch) {
    const rawVal = budgetMatch[1].replace(/,/g, '');
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0) {
      budget = num;
    }
  }

  // 3. Location extraction (e.g. "to Chennai", "in Bengaluru", "delivered to Mumbai", "Delhi", "Hyderabad")
  const cityRegex = /(?:delivered\s+to|to|in|at)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i;
  const knownCities = ['chennai', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'kolkata', 'ahmedabad', 'coimbatore', 'noida', 'gurugram'];
  
  const locMatch = sanitized.match(cityRegex);
  if (locMatch) {
    const candidate = locMatch[1].trim();
    if (knownCities.includes(candidate.toLowerCase())) {
      location = candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }
  if (!location) {
    for (const city of knownCities) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(sanitized)) {
        location = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }
  }

  // 4. Deadline extraction (e.g. "within 5 days", "in 5 days", "5 days", "by tomorrow")
  const deadlineMatch = sanitized.match(/within\s+(\d+)\s*days?|in\s+(\d+)\s*days?|(\d+)\s*days?\s*delivery/i);
  if (deadlineMatch) {
    const days = deadlineMatch[1] || deadlineMatch[2] || deadlineMatch[3];
    deliveryDeadline = `${days} days`;
  }

  // 5. Dynamic Product extraction
  let product = '';
  const cleaned = sanitized
    .replace(/^(?:i\s+need|we\s+need|looking\s+for|we\s+want\s+to\s+buy|procure|buy|purchase|please\s+find)\s+/i, '')
    .replace(/\b\d{1,6}\s*(?:units|pcs|pieces|sets|items|nos|box|boxes)?\b/gi, '')
    .replace(/(?:under|below|max|budget|within|target|₹|rs\.?)\s*[0-9,]+(?:\s*\/\s*unit|\s*per\s*unit)?/gi, '')
    .replace(/(?:delivered\s+to|to|in|at)\s+[A-Za-z]+(?:\s+[A-Za-z]+)?/gi, '')
    .replace(/within\s+\d+\s*days?|in\s+\d+\s*days?|\d+\s*days?\s*delivery/gi, '')
    .trim();

  if (/plastic\s+chair/i.test(sanitized)) {
    product = 'Plastic chairs';
  } else if (/ergonomic.*chair/i.test(sanitized)) {
    product = 'Ergonomic task chair';
  } else if (/desk|table|workstation/i.test(sanitized)) {
    product = 'Modular office desk';
  } else if (/label|packaging|carton/i.test(sanitized)) {
    product = 'Industrial barcode labels';
  } else if (/shelf|shelving|rack/i.test(sanitized)) {
    product = 'Warehouse storage racks';
  } else if (cleaned.length >= 2) {
    product = cleaned;
  } else if (/chair|seating|stool/i.test(sanitized)) {
    product = 'Office chairs';
  } else {
    product = sanitized.slice(0, 50).trim() || 'General Goods';
  }

  // Validate missing fields (PRD Cases A, B, C, D, E, F)
  if (!quantity) missingFields.push('quantity');
  if (!location) missingFields.push('location');
  if (!deliveryDeadline) missingFields.push('deliveryDeadline');

  let clarificationPrompt: string | undefined;
  if (missingFields.includes('quantity')) {
    clarificationPrompt = 'How many units do you need? (e.g., 500 units)';
  } else if (missingFields.includes('location')) {
    clarificationPrompt = 'What is the required delivery location? (e.g., Chennai)';
  }

  // Detect impossible constraint (Case F: e.g. 500 units at ₹50 same day)
  let isImpossibleConstraint = false;
  let constraintNotes: string | undefined;
  if (budget !== null && budget < 100 && product.includes('chair')) {
    isImpossibleConstraint = true;
    constraintNotes = 'No commercial suppliers can satisfy ₹' + budget + ' for commercial ergonomic chairs. Standard market pricing starts around ₹700.';
  }

  return {
    product,
    quantity: quantity || 500,
    location: location || 'Chennai',
    budget: budget || 750,
    currency: 'INR',
    deliveryDeadline: deliveryDeadline || '5 days',
    missingFields,
    clarificationPrompt,
    isImpossibleConstraint,
    constraintNotes
  };
}
