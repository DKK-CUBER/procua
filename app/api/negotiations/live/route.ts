import { NextRequest, NextResponse } from 'next/server';
import { activeNegotiationQueues } from '@/lib/server/voice/negotiationQueue';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const negId = url.searchParams.get('negId');

  let allTranscripts: Record<string, any[]> = {};
  let allOffers: Record<string, any> = {};
  let activeQueues: any[] = [];

  for (const [procId, session] of activeNegotiationQueues.entries()) {
    activeQueues.push({
      procurementId: procId,
      queue: session.queue,
      activeIdx: session.activeIdx,
      updatedAt: session.updatedAt
    });

    session.transcripts.forEach((transcriptList, id) => {
      allTranscripts[id] = transcriptList;
    });

    session.offers.forEach((offer, id) => {
      allOffers[id] = offer;
    });
  }

  if (negId && allTranscripts[negId]) {
    return NextResponse.json({
      success: true,
      negId,
      transcript: allTranscripts[negId],
      offer: allOffers[negId] || null
    });
  }

  return NextResponse.json({
    success: true,
    activeQueues,
    transcripts: allTranscripts,
    offers: allOffers
  });
}
