import { NextRequest, NextResponse } from 'next/server';
import { activeNegotiationQueues } from '@/lib/server/voice/negotiationQueue';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let initialPrice = 7600;
    let finalPrice = 7200;
    let quantity = 500;
    let deliveryDays = 7;
    let gst = 'extra';
    let rounds = 3;
    let supplierName = 'ABC Furniture';

    for (const [_, session] of activeNegotiationQueues.entries()) {
      const qItem = session.queue.find((q) => q.negotiationId === id);
      if (qItem) {
        supplierName = qItem.supplierName;
        const off = session.offers.get(id);
        if (off) {
          finalPrice = off.unitPrice || finalPrice;
          deliveryDays = off.deliveryDays || deliveryDays;
          gst = off.gstStatus || gst;
        }
        break;
      }
    }

    const initialTotal = initialPrice * quantity;
    const finalTotal = finalPrice * quantity;
    const estimatedSavings = Math.max(0, initialTotal - finalTotal);

    return NextResponse.json({
      negotiation_id: id,
      supplier: supplierName,
      status: 'completed',
      initial_price: initialPrice,
      final_price: finalPrice,
      quantity,
      delivery_days: deliveryDays,
      gst,
      rounds,
      estimated_savings: estimatedSavings,
      total_landed_cost: finalTotal,
      currency: 'INR'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
