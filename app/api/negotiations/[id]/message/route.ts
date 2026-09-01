import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/server/audit';
import { providerRegistry } from '@/lib/server/providers';
import { generateBuyerProposal } from '@/lib/server/ai/negotiator';
import { mockNegotiationsStore } from '@/lib/server/dataStore';

const messageSchema = z.object({
  customMessage: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = requireAuth(request, 'PROCUREMENT_EXECUTIVE');
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const negSession = mockNegotiationsStore.find(
    (n) => n.id === id || n.sessionCode?.toLowerCase() === id.toLowerCase() || n.supplierId === id || n.id.includes(id)
  );

  if (!negSession) {
    return NextResponse.json(
      { error: 'Negotiation session not found' },
      { status: 404 }
    );
  }

  // PRD Rule: If communication unavailable, never fake message
  if (negSession.channelStatus === 'COMMUNICATION_UNAVAILABLE') {
    return NextResponse.json(
      {
        error: 'Communication unavailable',
        reason: 'This connected source does not permit automated supplier negotiation.'
      },
      { status: 400 }
    );
  }

  try {
    const nextRound = (negSession.currentRound || 1) + 1;
    if (nextRound > negSession.maxRounds) {
      return NextResponse.json(
        {
          error: 'Maximum rounds reached',
          message: `Negotiation has concluded all ${negSession.maxRounds} allowed rounds. Buyer decision required.`
        },
        { status: 400 }
      );
    }

    // Generate proposal strictly within buyer bounds
    const buyerProposal = generateBuyerProposal({
      roundNumber: nextRound,
      productName: 'Ergonomic task chairs',
      quantity: negSession.quantity,
      targetPrice: negSession.targetPrice,
      maxPrice: negSession.maxPrice,
      freightRequired: negSession.freightRequired || true,
      lastOfferedPrice: negSession.finalOfferPrice
    });

    const buyerMsg = {
      id: `msg-${Date.now()}-buyer`,
      negotiationId: negSession.id,
      senderType: 'PROCURA_AI' as const,
      senderName: 'Procura AI',
      content: buyerProposal.messageContent,
      provenance: `${negSession.channelResolved} · Round ${nextRound}`,
      createdAt: new Date().toISOString()
    };

    // Call provider
    const providerCode = negSession.supplierId.includes('dwell') ? 'DIRECT_API' : 'ONDC';
    const provider = providerRegistry.getNegotiationProvider(providerCode);

    const providerRes = provider
      ? await provider.sendNegotiationMessage({
          negotiationId: negSession.id,
          supplierId: negSession.supplierId,
          roundNumber: nextRound,
          message: buyerProposal.messageContent,
          targetPrice: negSession.targetPrice,
          maxPrice: negSession.maxPrice,
          quantity: negSession.quantity
        })
      : { success: false, channelUsed: 'NONE', messageSent: false };

    negSession.messages?.push(buyerMsg);
    negSession.currentRound = nextRound;

    if (providerRes.success && providerRes.supplierResponse) {
      const resp = providerRes.supplierResponse;
      const sellerMsg = {
        id: `msg-${Date.now()}-seller`,
        negotiationId: negSession.id,
        senderType: 'SUPPLIER' as const,
        senderName: negSession.supplierName || 'Supplier',
        content: resp.content,
        provenance: `${resp.provenance} · ${resp.timestamp}`,
        createdAt: new Date().toISOString()
      };

      negSession.messages?.push(sellerMsg);

      if (resp.unitPriceOffered) {
        negSession.finalOfferPrice = resp.unitPriceOffered;
        negSession.savingsAmount = Math.max(0, (780 - resp.unitPriceOffered) * negSession.quantity);
      }

      if (resp.isAccepted) {
        negSession.status = 'ACCEPTED';
      } else if (resp.isRejected) {
        negSession.status = 'REJECTED';
      } else {
        negSession.status = nextRound >= negSession.maxRounds ? 'BUYER_DECISION_REQUIRED' : 'ACTIVE';
      }

      negSession.rounds?.push({
        id: `rnd-${nextRound}`,
        roundNumber: nextRound,
        buyerProposal: buyerProposal.messageContent,
        sellerCounter: resp.content,
        priceProposed: buyerProposal.priceProposed,
        priceCountered: resp.unitPriceOffered,
        completedAt: new Date().toISOString()
      });
    }

    await logAuditEvent({
      businessId: session!.businessId,
      userId: session!.id,
      action: 'NEGOTIATION_ROUND_COMPLETED',
      entityType: 'Negotiation',
      entityId: negSession.id,
      afterData: { round: nextRound, offer: negSession.finalOfferPrice, status: negSession.status }
    });

    return NextResponse.json({
      success: true,
      data: negSession
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Negotiation exchange failed', message: error.message },
      { status: 500 }
    );
  }
}
