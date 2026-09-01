import { NextRequest, NextResponse } from 'next/server';
import { activeNegotiationQueues } from '@/lib/server/voice/negotiationQueue';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let transcript: any[] = [];
    let offers: any[] = [];
    let language = 'en';

    // Check active in-memory queues first
    for (const [_, session] of activeNegotiationQueues.entries()) {
      if (session.transcripts.has(id)) {
        transcript = session.transcripts.get(id) || [];
        const off = session.offers.get(id);
        if (off) offers.push(off);
        break;
      }
    }

    if (transcript.length === 0) {
      // Default demo transcript
      transcript = [
        {
          timestamp: '14:31:02',
          speaker: 'procura',
          text: "Hi, this is Sadwik. I'm looking to source 500 ergonomic office chairs for our office in Chennai.",
          language: 'en'
        },
        {
          timestamp: '14:31:14',
          speaker: 'supplier',
          text: 'Vanakkam sir, 500 chairs ready stock irukku. Unit price ₹7,600 varum, GST extra.',
          language: 'ta'
        },
        {
          timestamp: '14:31:26',
          speaker: 'procura',
          text: 'Purinjithu sir. Naanga mothama 500 pieces Chennai ku edukkrom. Door delivery serthu ₹7,000 panna mudiyuma?',
          language: 'ta'
        },
        {
          timestamp: '14:31:40',
          speaker: 'supplier',
          text: 'Final-a ₹7,200 kudukalaam sir, door delivery included, 7 days-la dispatch aagum.',
          language: 'ta'
        },
        {
          timestamp: '14:31:52',
          speaker: 'procura',
          text: 'Romba nandri sir. Unga offer ₹7,200 per unit record panniten. Idhai Sadwik kitta review panni official PO ku contact panrom. Nandri!',
          language: 'ta'
        }
      ];
      language = 'ta';
      offers = [
        {
          round: 1,
          speaker: 'supplier',
          unitPrice: 7600,
          gstStatus: 'extra'
        },
        {
          round: 2,
          speaker: 'procura',
          unitPrice: 7000
        },
        {
          round: 3,
          speaker: 'supplier',
          unitPrice: 7200,
          deliveryDays: 7,
          freightStatus: 'inclusive'
        }
      ];
    }

    return NextResponse.json({
      negotiation_id: id,
      supplier_id: 'sup-selected',
      language,
      transcript,
      offers
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
