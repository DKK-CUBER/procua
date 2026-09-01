import { NextRequest, NextResponse } from 'next/server';
import { activeNegotiationQueues } from '@/lib/server/voice/negotiationQueue';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const negId = url.searchParams.get('negId') || '';

    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string || '';
    const callStatus = formData.get('CallStatus') as string || '';
    const duration = formData.get('CallDuration') as string || '0';

    // Map Twilio call status to Procura status
    let mappedStatus: string = 'CONNECTED';
    if (callStatus === 'ringing') mappedStatus = 'RINGING';
    else if (callStatus === 'in-progress' || callStatus === 'answered') mappedStatus = 'NEGOTIATING';
    else if (callStatus === 'completed') mappedStatus = 'NEGOTIATION_COMPLETE';
    else if (callStatus === 'busy') mappedStatus = 'BUSY';
    else if (callStatus === 'no-answer') mappedStatus = 'NO_ANSWER';
    else if (callStatus === 'failed' || callStatus === 'canceled') mappedStatus = 'FAILED';

    for (const [_, session] of activeNegotiationQueues.entries()) {
      const qItem = session.queue.find((q) => q.negotiationId === negId || q.callSid === callSid);
      if (qItem) {
        qItem.status = mappedStatus as any;
        qItem.callMessage = `Call ${callStatus} (duration: ${duration}s)`;
      }
    }

    return NextResponse.json({ success: true, callSid, status: callStatus });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
