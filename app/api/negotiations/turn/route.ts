import { NextRequest, NextResponse } from 'next/server';
import { processVoiceNegotiationTurn } from '@/lib/server/voice/voiceNegotiator';
import { activeNegotiationQueues } from '@/lib/server/voice/negotiationQueue';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      supplierSpeech,
      buyerName = 'Sadwik',
      companyName = 'Example Technologies',
      product = 'Ergonomic office chairs',
      quantity = 500,
      deliveryLocation = 'Chennai',
      targetPrice = 6500,
      maximumPrice = 8000,
      supplierName = 'Chennai Chairs',
      currentRound = 2,
      maxRounds = 4,
      conversationHistory = [],
      negId
    } = body;

    if (!supplierSpeech) {
      return NextResponse.json({ error: 'supplierSpeech is required' }, { status: 400 });
    }

    // Process through Procura Voice AI Negotiation Engine
    const decision = await processVoiceNegotiationTurn({
      supplierSpeech,
      context: {
        buyerName,
        companyName,
        product,
        quantity,
        deliveryLocation,
        targetPrice,
        maximumPrice,
        supplierName,
        currentRound,
        maxRounds,
        conversationHistory
      }
    });

    // Record turn in queue memory
    if (negId) {
      for (const [_, session] of activeNegotiationQueues.entries()) {
        const currentList = session.transcripts.get(negId) || [];
        currentList.push({
          timestamp: new Date().toLocaleTimeString('en-IN'),
          speaker: 'supplier',
          text: supplierSpeech,
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
    }

    return NextResponse.json({
      success: true,
      decision,
      extractedOffer: decision.extractedOffer,
      nextSpeechText: decision.nextSpeechText,
      detectedLanguage: decision.detectedLanguage,
      intent: decision.intent,
      isFinalRound: decision.isFinalRound,
      shouldHangup: decision.shouldHangup
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
