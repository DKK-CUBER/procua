import { NextRequest, NextResponse } from 'next/server';
import { buildVoiceTwiml } from '@/lib/server/voice/twilioService';
import { processVoiceNegotiationTurn, generateCallOpening } from '@/lib/server/voice/voiceNegotiator';
import { activeNegotiationQueues } from '@/lib/server/voice/negotiationQueue';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const negId = url.searchParams.get('negId') || 'neg-default';
    const supplierId = url.searchParams.get('supplierId') || 'sup-default';

    // Parse form data from Twilio
    const formData = await req.formData();
    const speechResult = formData.get('SpeechResult') as string || '';
    const confidence = formData.get('Confidence') as string || '';
    const callSid = formData.get('CallSid') as string || '';

    const actionUrl = `/api/webhooks/twilio/voice?negId=${encodeURIComponent(negId)}&supplierId=${encodeURIComponent(supplierId)}`;

    // Resolve dynamic procurement parameters from active queue session
    let activeProduct = 'Procurement Item';
    let activeQuantity = 500;
    let activeTargetPrice = 6500;
    let activeMaxPrice = 8000;
    let activeLocation = 'Chennai';

    for (const [_, session] of activeNegotiationQueues.entries()) {
      if (session.transcripts.has(negId) || session.queue?.some(q => q.negotiationId === negId || q.supplierId === supplierId)) {
        if (session.product) activeProduct = session.product;
        if (session.quantity) activeQuantity = session.quantity;
        if (session.targetPrice) activeTargetPrice = session.targetPrice;
        if (session.maximumPrice) activeMaxPrice = session.maximumPrice;
        if (session.deliveryLocation) activeLocation = session.deliveryLocation;
        break;
      }
    }

    // If initial call connection (no speech result yet), speak the opening
    if (!speechResult) {
      const opening = generateCallOpening({
        buyerName: 'Sadwik',
        companyName: 'Example Technologies',
        product: activeProduct,
        quantity: activeQuantity,
        deliveryLocation: activeLocation
      });

      const twiml = buildVoiceTwiml({
        speechText: opening.speechText,
        actionUrl,
        language: opening.language
      });

      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Process spoken response from supplier
    const decision = await processVoiceNegotiationTurn({
      supplierSpeech: speechResult,
      context: {
        buyerName: 'Sadwik',
        companyName: 'Example Technologies',
        product: activeProduct,
        quantity: activeQuantity,
        deliveryLocation: activeLocation,
        targetPrice: activeTargetPrice,
        maximumPrice: activeMaxPrice,
        supplierName: 'Selected Supplier',
        currentRound: 2,
        maxRounds: 4,
        conversationHistory: []
      }
    });

    // Record turn in queue memory if available
    for (const [_, session] of activeNegotiationQueues.entries()) {
      const currentList = session.transcripts.get(negId) || [];
      currentList.push({
        timestamp: new Date().toLocaleTimeString('en-IN'),
        speaker: 'supplier',
        text: speechResult,
        language: decision.detectedLanguage.detectedLanguage
      });
      currentList.push({
        timestamp: new Date().toLocaleTimeString('en-IN'),
        speaker: 'procura',
        text: decision.nextSpeechText,
        language: decision.responseLanguage
      });
      session.transcripts.set(negId, currentList);

      if (decision.extractedOffer) {
        session.offers.set(negId, decision.extractedOffer);
      }
    }

    const twiml = buildVoiceTwiml({
      speechText: decision.nextSpeechText,
      actionUrl,
      isEnd: decision.shouldHangup,
      language: decision.responseLanguage
    });

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error: any) {
    console.error('[Twilio Voice Webhook Error]', error);
    const fallbackTwiml = buildVoiceTwiml({
      speechText: 'Thank you for your time. I will record our conversation and the buyer will review your quote shortly.',
      actionUrl: '/api/webhooks/twilio/voice',
      isEnd: true
    });
    return new NextResponse(fallbackTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
