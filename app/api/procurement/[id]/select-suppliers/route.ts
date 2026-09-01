import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/server/audit';
import { providerRegistry } from '@/lib/server/providers';
import { mockNegotiationsStore } from '@/lib/server/dataStore';
import { Negotiation } from '@/lib/types';

const selectSchema = z.object({
  selectedSupplierIds: z.array(z.string()).min(1, 'Select at least one supplier.')
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = requireAuth(request, 'PROCUREMENT_EXECUTIVE');
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const requestId = resolvedParams.id;

  try {
    const body = await request.json();
    const parsed = selectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Select at least one supplier.', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { selectedSupplierIds } = parsed.data;
    const createdSessions: Negotiation[] = [];

    for (const supplierId of selectedSupplierIds) {
      // Determine supplier source provider
      let providerCode = 'ONDC';
      let supplierName = 'Cobalt Office Systems';
      let initialOfferedPrice = 750;

      if (supplierId.includes('ernest')) {
        providerCode = 'ONDC';
        supplierName = 'Ernest Furnishings';
        initialOfferedPrice = 735;
      } else if (supplierId.includes('dwell')) {
        providerCode = 'DIRECT_API';
        supplierName = 'Dwell Business';
        initialOfferedPrice = 748;
      } else if (supplierId.includes('sahara')) {
        providerCode = 'MARKETPLACE_X';
        supplierName = 'Sahara Workspace';
        initialOfferedPrice = 750;
      } else if (supplierId.includes('aura')) {
        providerCode = 'MARKETPLACE_X';
        supplierName = 'Aura Commercial';
        initialOfferedPrice = 760;
      }

      const negotiationProvider = providerRegistry.getNegotiationProvider(providerCode);
      const channelRes = negotiationProvider
        ? await negotiationProvider.resolveChannel(supplierId)
        : { channelType: 'NONE', isAutomatedAllowed: false, statusText: 'No channel' };

      const isCommAvailable = channelRes.isAutomatedAllowed;
      const negId = `neg-${supplierId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

      const newSession: Negotiation = {
        id: negId,
        businessId: session!.businessId,
        supplierId,
        supplierName,
        requestId,
        sessionCode: `NEG-${Math.floor(1000 + Math.random() * 9000)}`,
        status: isCommAvailable ? 'ACTIVE' : 'COMMUNICATION_UNAVAILABLE',
        targetPrice: 720,
        maxPrice: 750,
        quantity: 500,
        maxRounds: 3,
        currentRound: 1,
        freightRequired: true,
        channelResolved: channelRes.channelType,
        channelStatus: isCommAvailable ? 'AVAILABLE' : 'COMMUNICATION_UNAVAILABLE',
        finalOfferPrice: initialOfferedPrice,
        savingsAmount: Math.max(0, (780 - initialOfferedPrice) * 500),
        messages: isCommAvailable
          ? [
              {
                id: `msg-${Date.now()}-1`,
                negotiationId: negId,
                senderType: 'PROCURA_AI',
                senderName: 'Procura',
                content: 'Can you offer your best bulk price for 500 ergonomic office chairs?',
                provenance: `${channelRes.statusText} at 14:31 IST`,
                createdAt: new Date().toISOString()
              },
              {
                id: `msg-${Date.now()}-2`,
                negotiationId: negId,
                senderType: 'SUPPLIER',
                senderName: supplierName,
                content: `We can offer ₹${initialOfferedPrice} per unit, with freight included.`,
                provenance: `${channelRes.statusText} at 14:36 IST`,
                createdAt: new Date().toISOString()
              }
            ]
          : [
              {
                id: `msg-${Date.now()}-1`,
                negotiationId: negId,
                senderType: 'SYSTEM',
                senderName: 'Procura System',
                content: 'Automated negotiation is unavailable for this supplier source. Please use direct supplier contact details.',
                provenance: 'System channel check',
                createdAt: new Date().toISOString()
              }
            ],
        rounds: [
          {
            id: `rnd-1-${negId}`,
            roundNumber: 1,
            buyerProposal: 'Can you offer your best bulk price for 500 ergonomic office chairs?',
            sellerCounter: isCommAvailable ? `We can offer ₹${initialOfferedPrice} per unit.` : undefined,
            priceProposed: 720,
            priceCountered: initialOfferedPrice,
            completedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString()
      };

      mockNegotiationsStore.push(newSession);
      createdSessions.push(newSession);

      await logAuditEvent({
        businessId: session!.businessId,
        userId: session!.id,
        action: 'START_NEGOTIATION',
        entityType: 'Negotiation',
        entityId: negId,
        afterData: { supplierId, channel: channelRes.channelType, status: newSession.status }
      });
    }

    return NextResponse.json({
      success: true,
      negotiations: createdSessions
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to initiate supplier negotiations', message: error.message },
      { status: 500 }
    );
  }
}
