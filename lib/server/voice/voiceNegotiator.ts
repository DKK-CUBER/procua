import { z } from 'zod';
import { callOllamaChat } from '../ai/ollamaClient';

export interface SpokenLanguageDetection {
  detectedLanguage: 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'other';
  languageName: string;
  confidence: number;
  isMixedLanguage: boolean;
}

export interface VoiceNegotiationContext {
  buyerName: string;
  companyName: string;
  product: string;
  quantity: number;
  deliveryLocation: string;
  deliveryDeadlineDays?: number;
  targetPrice: number;
  maximumPrice: number;
  supplierName: string;
  currentRound: number;
  maxRounds?: number;
  conversationHistory: Array<{
    speaker: 'procura' | 'supplier';
    text: string;
    language?: string;
  }>;
}

export interface ExtractedVoiceOffer {
  unitPrice: number | null;
  currency: string;
  quantity: number;
  deliveryDays: number | null;
  gstStatus: 'inclusive' | 'extra' | 'unspecified';
  freightStatus: 'inclusive' | 'extra' | 'unspecified';
  moq: number | null;
  paymentTerms: string | null;
  totalLandedEstimate: number | null;
  estimatedSavings: number | null;
}

export interface VoiceTurnDecision {
  detectedLanguage: SpokenLanguageDetection;
  extractedOffer: ExtractedVoiceOffer | null;
  nextSpeechText: string;
  responseLanguage: string;
  intent: 'request_quote' | 'counter_offer' | 'ask_clarification' | 'finalize_and_end' | 'escalate_to_buyer' | 'refuse_over_budget';
  isFinalRound: boolean;
  shouldHangup: boolean;
}

/**
 * 1. Fast, Deterministic Spoken Language Detector with Code-Switching Detection
 */
export function detectSpokenLanguage(text: string): SpokenLanguageDetection {
  const lower = text.toLowerCase();

  // Tamil keywords & transliterated patterns
  const tamilPatterns = [
    /\b(vanakkam|sollunga|irukku|iruku|varum|kudukkalaam|kudunga|paathukalam|aagum|naatkal|aachu|pannalam|kedaikkum|thaan|illa|aamaa)\b/i,
    /[\u0B80-\u0BFF]/
  ];

  // Hindi / Hinglish keywords
  const hindiPatterns = [
    /\b(namaste|bhaiya|hojayega|padega|denge|kitna|miljayega|lagbhag|batao|karenge|daam|kam|jyada|hoga|nahi|theek)\b/i,
    /[\u0900-\u097F]/
  ];

  // Telugu keywords
  const teluguPatterns = [
    /\b(namaskaram|undi|unnayi|ledu|avtundi|ivvagalama|padutundi|chesdam|kavali|cheppandi)\b/i,
    /[\u0C00-\u0C7F]/
  ];

  // Kannada keywords
  const kannadaPatterns = [
    /\b(namaskara|ide|illa|agutte|kodtivi|beku|hegide|madona)\b/i,
    /[\u0C80-\u0CFF]/
  ];

  // Malayalam keywords
  const malayalamPatterns = [
    /\b(namaskaram|undu|illa|tharam|varum|pattum|kazhiyum)\b/i,
    /[\u0D00-\u0D7F]/
  ];

  let detectedLanguage: SpokenLanguageDetection['detectedLanguage'] = 'en';
  let languageName = 'English';
  let confidence = 0.95;
  let isMixedLanguage = false;

  const hasTamil = tamilPatterns.some((p) => p.test(lower));
  const hasHindi = hindiPatterns.some((p) => p.test(lower));
  const hasTelugu = teluguPatterns.some((p) => p.test(lower));
  const hasKannada = kannadaPatterns.some((p) => p.test(lower));
  const hasMalayalam = malayalamPatterns.some((p) => p.test(lower));
  const hasEnglishWords = /\b(price|chair|delivery|pieces|units|rate|gst|days|chennai|offer|discount|sir|order)\b/i.test(lower);

  if (hasTamil) {
    detectedLanguage = 'ta';
    languageName = 'Tamil';
    isMixedLanguage = hasEnglishWords;
  } else if (hasHindi) {
    detectedLanguage = 'hi';
    languageName = 'Hindi';
    isMixedLanguage = hasEnglishWords;
  } else if (hasTelugu) {
    detectedLanguage = 'te';
    languageName = 'Telugu';
    isMixedLanguage = hasEnglishWords;
  } else if (hasKannada) {
    detectedLanguage = 'kn';
    languageName = 'Kannada';
    isMixedLanguage = hasEnglishWords;
  } else if (hasMalayalam) {
    detectedLanguage = 'ml';
    languageName = 'Malayalam';
    isMixedLanguage = hasEnglishWords;
  }

  return {
    detectedLanguage,
    languageName,
    confidence,
    isMixedLanguage
  };
}

/**
 * 2. Deterministic Offer Extractor from Spoken Speech
 */
export function extractOfferFromSpeech(text: string, expectedQuantity: number, targetPrice: number): ExtractedVoiceOffer | null {
  const lower = text.toLowerCase();

  // Price Regex: e.g. "7600", "7,600", "₹7600", "Rs. 7200", "7200 per chair"
  const priceMatches = text.match(/(?:(?:rs\.?|inr|₹|price(?:\s+is)?)\s*)?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,6})(?:\s*(?:per|each|\/-|rupees|varum|padega))?/gi);
  
  let unitPrice: number | null = null;
  if (priceMatches) {
    for (const match of priceMatches) {
      const numStr = match.replace(/[^0-9]/g, '');
      const val = parseInt(numStr, 10);
      // Filter out reasonable unit price range (e.g. 50 to 500,000)
      if (val >= 100 && val !== expectedQuantity && val < 500000) {
        unitPrice = val;
        break;
      }
    }
  }

  // Delivery Days Regex: e.g. "7 days", "10 days", "within a week", "4-5 days"
  let deliveryDays: number | null = null;
  const daysMatch = lower.match(/(\d+)(?:\s*-\s*\d+)?\s*(?:days|naatkal|din)/i);
  if (daysMatch) {
    deliveryDays = parseInt(daysMatch[1], 10);
  } else if (lower.includes('week') || lower.includes('varam')) {
    deliveryDays = 7;
  }

  // GST status
  let gstStatus: ExtractedVoiceOffer['gstStatus'] = 'unspecified';
  if (lower.includes('gst extra') || lower.includes('plus gst') || lower.includes('plus tax') || lower.includes('excluding gst')) {
    gstStatus = 'extra';
  } else if (lower.includes('gst included') || lower.includes('inclusive of gst') || lower.includes('including tax') || lower.includes('all inclusive')) {
    gstStatus = 'inclusive';
  }

  // Freight status
  let freightStatus: ExtractedVoiceOffer['freightStatus'] = 'unspecified';
  if (lower.includes('freight included') || lower.includes('free delivery') || lower.includes('door delivery included') || lower.includes('transport included')) {
    freightStatus = 'inclusive';
  } else if (lower.includes('freight extra') || lower.includes('transport extra') || lower.includes('shipping extra')) {
    freightStatus = 'extra';
  }

  if (!unitPrice && !deliveryDays && gstStatus === 'unspecified') {
    return null;
  }

  const effectivePrice = unitPrice || targetPrice;
  const totalLandedEstimate = effectivePrice * expectedQuantity;
  const initialCost = (targetPrice * 1.1) * expectedQuantity;
  const estimatedSavings = Math.max(0, initialCost - totalLandedEstimate);

  return {
    unitPrice,
    currency: 'INR',
    quantity: expectedQuantity,
    deliveryDays,
    gstStatus,
    freightStatus,
    moq: expectedQuantity,
    paymentTerms: lower.includes('advance') ? 'Advance required' : null,
    totalLandedEstimate,
    estimatedSavings
  };
}

/**
 * 3. Core Negotiation AI & Turn-Taking Decision Engine
 */
export async function processVoiceNegotiationTurn(params: {
  supplierSpeech: string;
  context: VoiceNegotiationContext;
}): Promise<VoiceTurnDecision> {
  const { supplierSpeech, context } = params;
  const maxRounds = context.maxRounds || 4;
  const currentRound = context.currentRound;

  // 1. Detect language
  const detectedLanguage = detectSpokenLanguage(supplierSpeech);

  // 2. Extract offer
  const extractedOffer = extractOfferFromSpeech(supplierSpeech, context.quantity, context.targetPrice);

  const isAskAI = supplierSpeech.toLowerCase().includes('are you an ai') || supplierSpeech.toLowerCase().includes('are you a robot');
  if (isAskAI) {
    return {
      detectedLanguage,
      extractedOffer,
      nextSpeechText: `I am Procura's automated procurement assistant calling on behalf of ${context.buyerName} at ${context.companyName}. We are looking to finalize quotes for ${context.quantity} units of ${context.product}.`,
      responseLanguage: detectedLanguage.detectedLanguage,
      intent: 'ask_clarification',
      isFinalRound: false,
      shouldHangup: false
    };
  }

  // 3. Check for Hard Price Constraint Violation
  if (extractedOffer?.unitPrice && extractedOffer.unitPrice > context.maximumPrice) {
    let refuseText = `I wouldn't be able to proceed at ₹${extractedOffer.unitPrice.toLocaleString('en-IN')}. Is there any possibility of bringing the rate down for this full order of ${context.quantity} units?`;
    if (detectedLanguage.detectedLanguage === 'ta') {
      refuseText = `₹${extractedOffer.unitPrice.toLocaleString('en-IN')} rate konjam jaasthi sir. Full ${context.quantity} units order edukku idhai vida nalla price poda mudiyuma?`;
    } else if (detectedLanguage.detectedLanguage === 'hi') {
      refuseText = `₹${extractedOffer.unitPrice.toLocaleString('en-IN')} ka rate hamare budget se upar hai. Kya aap ${context.quantity} units ke liye isse behtar final price de sakte hain?`;
    }

    return {
      detectedLanguage,
      extractedOffer,
      nextSpeechText: refuseText,
      responseLanguage: detectedLanguage.detectedLanguage,
      intent: 'refuse_over_budget',
      isFinalRound: currentRound >= maxRounds,
      shouldHangup: currentRound >= maxRounds
    };
  }

  // 4. Final Round or Acceptable Offer Received -> Close conversation professionally without binding commitment
  if (currentRound >= maxRounds || (extractedOffer?.unitPrice && extractedOffer.unitPrice <= context.targetPrice)) {
    const finalPrice = extractedOffer?.unitPrice || context.targetPrice;
    let closingSpeech = `Thank you. I have recorded your offer of ₹${finalPrice.toLocaleString('en-IN')} per unit for ${context.quantity} units. I will submit this to ${context.buyerName} for final review and approval. We will get back to you shortly. Have a great day!`;
    
    if (detectedLanguage.detectedLanguage === 'ta') {
      closingSpeech = `Romba nandri sir. Unga offer ₹${finalPrice.toLocaleString('en-IN')} per unit record panniten. Idhai ${context.buyerName} kitta review panni official PO ku contact panrom. Nandri!`;
    } else if (detectedLanguage.detectedLanguage === 'hi') {
      closingSpeech = `Dhanyavad. Maine aapka offer ₹${finalPrice.toLocaleString('en-IN')} per unit note kar liya hai. Mai yeh ${context.buyerName} ko review ke liye bhej raha hoon. Hum aapse jaldi contact karenge.`;
    }

    return {
      detectedLanguage,
      extractedOffer,
      nextSpeechText: closingSpeech,
      responseLanguage: detectedLanguage.detectedLanguage,
      intent: 'finalize_and_end',
      isFinalRound: true,
      shouldHangup: true
    };
  }

  // 5. Intermediate Round -> Generate Strategic Counter-Offer
  const quotedPrice = extractedOffer?.unitPrice || Math.round(context.targetPrice * 1.15);
  // Strategic counter: middle ground between target and current quote
  const counterPrice = Math.max(context.targetPrice, Math.round((quotedPrice + context.targetPrice) / 2));

  let counterSpeech = `Understood. Since we are procuring all ${context.quantity} units delivered to ${context.deliveryLocation}, could you do ₹${counterPrice.toLocaleString('en-IN')} per unit inclusive of freight?`;

  if (detectedLanguage.detectedLanguage === 'ta') {
    counterSpeech = `Purinjithu sir. Naanga mothama ${context.quantity} pieces ${context.deliveryLocation} ku edukkrom. Door delivery serthu ₹${counterPrice.toLocaleString('en-IN')} panna mudiyuma?`;
  } else if (detectedLanguage.detectedLanguage === 'hi') {
    counterSpeech = `Samajh gaya. Kyunki hum poore ${context.quantity} units ${context.deliveryLocation} ke liye le rahe hain, kya aap freight milakar ₹${counterPrice.toLocaleString('en-IN')} me kar sakte hain?`;
  }

  return {
    detectedLanguage,
    extractedOffer,
    nextSpeechText: counterSpeech,
    responseLanguage: detectedLanguage.detectedLanguage,
    intent: 'counter_offer',
    isFinalRound: false,
    shouldHangup: false
  };
}

/**
 * Helper to generate initial call opening speech
 */
export function generateCallOpening(context: {
  buyerName: string;
  companyName: string;
  product: string;
  quantity: number;
  deliveryLocation: string;
  preferredLanguage?: 'en' | 'hi' | 'ta';
}): { speechText: string; language: string } {
  const lang = context.preferredLanguage || 'en';

  if (lang === 'ta') {
    return {
      speechText: `Vanakkam, idhu ${context.buyerName}. Naanga ${context.deliveryLocation} office-ku ${context.quantity} ${context.product} bulk-a vanga paakrom. Unga best commercial rate solla mudiyuma?`,
      language: 'ta'
    };
  } else if (lang === 'hi') {
    return {
      speechText: `Namaste, mai ${context.buyerName} bol raha hoon. Hume hamare ${context.deliveryLocation} office ke liye ${context.quantity} ${context.product} kharidna hai. Kya aap iska best bulk price bata sakte hain?`,
      language: 'hi'
    };
  }

  return {
    speechText: `Hi, this is ${context.buyerName}. I'm looking to source ${context.quantity} units of ${context.product} for our office in ${context.deliveryLocation}. Could you provide your best bulk price for the full order?`,
    language: 'en'
  };
}
