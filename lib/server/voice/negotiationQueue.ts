import { db } from '@/lib/db';
import { validateBusinessHours, BusinessHoursCheckResult } from './businessHours';
import { initiateTwilioCall, InitiateCallResponse } from './twilioService';
import { generateCallOpening } from './voiceNegotiator';

export interface BuyerAuthorizationConfig {
  allowAiContact: boolean;
  allowPriceNegotiation: boolean;
  allowDeliveryNegotiation: boolean;
  allowShippingNegotiation: boolean;
  allowPaymentNegotiation: boolean;
  allowFinalizePurchase: boolean; // Always false by default
}

export const DEFAULT_BUYER_AUTHORIZATION: BuyerAuthorizationConfig = {
  allowAiContact: true,
  allowPriceNegotiation: true,
  allowDeliveryNegotiation: true,
  allowShippingNegotiation: true,
  allowPaymentNegotiation: true,
  allowFinalizePurchase: false
};

export interface StartNegotiationRequest {
  procurementId: string;
  supplierIds: string[];
  product?: string;
  quantity?: number;
  targetPrice?: number;
  maximumPrice?: number;
  deliveryLocation?: string;
  buyerName?: string;
  companyName?: string;
  authorization?: Partial<BuyerAuthorizationConfig>;
  isSimulation?: boolean;
}

export interface QueuedSupplierSession {
  supplierId: string;
  supplierName: string;
  phone?: string;
  status: 'QUEUED' | 'CALLING' | 'CONNECTED' | 'NEGOTIATING' | 'OFFER_RECEIVED' | 'NEGOTIATION_COMPLETE' | 'NO_ANSWER' | 'BUSY' | 'FAILED' | 'DECLINED' | 'BLOCKED_HOURS';
  businessHoursStatus: BusinessHoursCheckResult;
  negotiationId: string;
  callSid?: string;
  openingSpeech: string;
  callMessage?: string;
}

export interface StartNegotiationResponse {
  success: boolean;
  negotiationSessionId: string;
  procurementId: string;
  activeSupplierIndex: number;
  totalSelected: number;
  queue: QueuedSupplierSession[];
  authorizationSummary: BuyerAuthorizationConfig;
  message?: string;
}

// In-Memory store for live active call queues and transcripts
export const activeNegotiationQueues = new Map<string, {
  procurementId: string;
  product: string;
  quantity: number;
  targetPrice: number;
  maximumPrice: number;
  deliveryLocation: string;
  queue: QueuedSupplierSession[];
  activeIdx: number;
  transcripts: Map<string, Array<{
    timestamp: string;
    speaker: 'procura' | 'supplier' | 'system';
    text: string;
    language?: string;
  }>>;
  offers: Map<string, any>;
  updatedAt: Date;
}>();

/**
 * Validates and starts a voice negotiation queue for explicitly selected suppliers.
 */
export async function startVoiceNegotiation(params: StartNegotiationRequest): Promise<StartNegotiationResponse> {
  const { procurementId, supplierIds, buyerName = 'Sadwik', companyName = 'Procura Procurement' } = params;
  const authConfig: BuyerAuthorizationConfig = {
    ...DEFAULT_BUYER_AUTHORIZATION,
    ...params.authorization,
    allowFinalizePurchase: false // Hard constraint: AI never finalizes purchase
  };

  if (!authConfig.allowAiContact) {
    throw new Error('[AUTHORIZATION REJECTED] AI contact authorization was not granted by buyer.');
  }

  if (!supplierIds || supplierIds.length === 0) {
    throw new Error('[SELECTION ERROR] No suppliers were selected for negotiation.');
  }

  // 1. Fetch procurement details from params, DB, or fallback
  let procurementTitle = params.product || 'Procurement Item';
  let targetQuantity = params.quantity || 500;
  let targetUnitPrice = params.targetPrice || 6500;
  let maxUnitPrice = params.maximumPrice || 8000;
  let deliveryLocation = params.deliveryLocation || 'Chennai';

  try {
    const dbReq = await db.procurementRequest.findUnique({
      where: { id: procurementId }
    });
    if (dbReq) {
      procurementTitle = params.product || dbReq.title;
      targetQuantity = params.quantity || dbReq.targetQuantity;
      targetUnitPrice = params.targetPrice || dbReq.targetUnitPrice || 6500;
      maxUnitPrice = params.maximumPrice || dbReq.maxUnitPrice || 8000;
      deliveryLocation = params.deliveryLocation || dbReq.deliveryLocation || 'Chennai';
    }
  } catch (_) {}

  // 2. Validate selected suppliers
  const queue: QueuedSupplierSession[] = [];
  const sessionId = 'neg-session-' + Date.now();

  for (let i = 0; i < supplierIds.length; i++) {
    const supId = supplierIds[i];

    // Check DB supplier record
    let supName = 'Verified Supplier ' + (i + 1);
    let supPhone = '+91-44-2834-9100';
    let supCity = deliveryLocation;

    try {
      const dbSup = await db.supplier.findUnique({
        where: { id: supId }
      });
      if (dbSup) {
        supName = dbSup.name;
        supPhone = dbSup.phone || supPhone;
        supCity = dbSup.location || (dbSup as any).city || supCity;
      }
    } catch (_) {}

    // Check Business Hours for Supplier
    const hoursCheck = validateBusinessHours({
      location: { city: supCity, country: 'India' },
      phone: supPhone
    });

    const negId = `neg-${supId.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
    const opening = generateCallOpening({
      buyerName,
      companyName,
      product: procurementTitle,
      quantity: targetQuantity,
      deliveryLocation
    });

    queue.push({
      supplierId: supId,
      supplierName: supName,
      phone: supPhone,
      status: i === 0 ? 'CALLING' : 'QUEUED',
      businessHoursStatus: hoursCheck,
      negotiationId: negId,
      openingSpeech: opening.speechText,
      callMessage: hoursCheck.canCallNow ? undefined : hoursCheck.reason
    });
  }

  // 3. Initiate first call in queue
  if (queue.length > 0) {
    const first = queue[0];
    const callRes = await initiateTwilioCall({
      toPhoneNumber: first.phone || '+916369763938',
      negotiationId: first.negotiationId,
      procurementId,
      supplierId: first.supplierId,
      supplierName: first.supplierName,
      product: procurementTitle,
      quantity: targetQuantity,
      targetPrice: targetUnitPrice,
      maximumPrice: maxUnitPrice,
      buyerName,
      isSimulation: params.isSimulation
    });

    first.callSid = callRes.callSid;
    first.callMessage = callRes.message;
    first.status = callRes.success ? 'CALLING' : 'FAILED';
  }

  // Store in active queue memory
  const transcriptsMap = new Map();
  const offersMap = new Map();
  for (const q of queue) {
    transcriptsMap.set(q.negotiationId, [
      {
        timestamp: new Date().toLocaleTimeString('en-IN'),
        speaker: 'procura',
        text: q.openingSpeech,
        language: 'en'
      }
    ]);
  }

  activeNegotiationQueues.set(sessionId, {
    procurementId,
    product: procurementTitle,
    quantity: targetQuantity,
    targetPrice: targetUnitPrice,
    maximumPrice: maxUnitPrice,
    deliveryLocation,
    queue,
    activeIdx: 0,
    transcripts: transcriptsMap,
    offers: offersMap,
    updatedAt: new Date()
  });

  return {
    success: true,
    negotiationSessionId: sessionId,
    procurementId,
    activeSupplierIndex: 0,
    totalSelected: queue.length,
    queue,
    authorizationSummary: authConfig
  };
}
