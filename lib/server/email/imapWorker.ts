import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { db } from '@/lib/db';
import { extractSupplierOffer, compareOffer } from '@/lib/server/ai/negotiationAi';

export interface SyncResult {
  syncedCount: number;
  matchedMessages: Array<{
    negotiationId: string;
    rfqReference: string;
    sender: string;
    subject: string;
    extractedPrice: number | null;
  }>;
  errors: string[];
}

export async function syncInboundProcurementReplies(targetNegotiationId?: string): Promise<SyncResult> {
  const host = process.env.IMAP_HOST || 'imap.gmail.com';
  const port = parseInt(process.env.IMAP_PORT || '993', 10);
  const user = process.env.IMAP_USER || 'sadwik.kumar.procurement@gmail.com';
  const pass = (process.env.IMAP_PASSWORD || '').replace(/\s+/g, '');

  const result: SyncResult = {
    syncedCount: 0,
    matchedMessages: [],
    errors: []
  };

  if (!pass) {
    result.errors.push('IMAP_PASSWORD is not configured.');
    return result;
  }

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: {
      user,
      pass
    },
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Fetch active negotiations with RFQ references
      const negotiations = await db.negotiation.findMany({
        where: targetNegotiationId ? { id: targetNegotiationId } : { status: { in: ['awaiting_supplier_reply', 'draft', 'active'] } },
        include: { supplier: true, request: true }
      });

      if (negotiations.length === 0) {
        return result;
      }

      // Search recent messages in INBOX
      const searchCriteria = { since: new Date(Date.now() - 7 * 86400000) };

      for await (const msg of client.fetch(searchCriteria, { source: true, uid: true, envelope: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);

        const subject = parsed.subject || '';
        const bodyText = parsed.text || '';
        const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() || '';
        const inReplyTo = parsed.inReplyTo || '';
        const messageId = parsed.messageId || `uid-${msg.uid}`;

        // Match against active negotiations by RFQ Reference or In-Reply-To
        for (const neg of negotiations) {
          const rfqRef = neg.rfqReference || '';
          const hasRfqMatch = rfqRef && (subject.includes(rfqRef) || bodyText.includes(rfqRef));
          const hasThreadMatch = neg.lastMessageId && (inReplyTo.includes(neg.lastMessageId) || (parsed.references && parsed.references.includes(neg.lastMessageId)));
          const supplierEmail = neg.supplier?.email?.toLowerCase() || '';
          const hasSenderMatch = supplierEmail && fromAddress.includes(supplierEmail.split('@')[1]);

          if (hasRfqMatch || hasThreadMatch || (hasSenderMatch && subject.toLowerCase().includes('quotation'))) {
            // Check for duplicate message ID
            const existingMsg = await db.negotiationMessage.findFirst({
              where: { messageId }
            });

            if (existingMsg) {
              continue; // Prevent duplicates
            }

            // 1. Store the raw inbound email message
            const newMsg = await db.negotiationMessage.create({
              data: {
                negotiationId: neg.id,
                senderType: 'SUPPLIER',
                senderName: neg.supplier.name || parsed.from?.value?.[0]?.name || 'Supplier Desk',
                senderEmail: fromAddress,
                recipient: user,
                subject,
                content: bodyText.trim().substring(0, 4000),
                provenance: `Verified Inbound Email (IMAP) · ${new Date().toLocaleTimeString('en-IN')}`,
                messageId,
                inReplyTo: inReplyTo || null,
                isVerified: true
              }
            });

            // 2. Run local AI offer extraction
            const extracted = await extractSupplierOffer({
              emailBody: bodyText,
              expectedProduct: neg.request?.title || 'Industrial Goods',
              expectedQuantity: neg.quantity
            });

            // 3. Create immutable OfferVersion
            if (extracted.unitPrice && extracted.unitPrice > 0) {
              const subtotal = extracted.unitPrice * neg.quantity;
              const taxAmount = Math.round(subtotal * ((extracted.gstPercent || 18.0) / 100));
              const totalAmount = subtotal + taxAmount;

              const versionCount = await db.offerVersion.count({ where: { negotiationId: neg.id } });

              await db.offerVersion.create({
                data: {
                  negotiationId: neg.id,
                  versionNumber: versionCount + 1,
                  unitPrice: extracted.unitPrice,
                  quantity: neg.quantity,
                  subtotal,
                  taxAmount,
                  totalAmount,
                  freight: extracted.freightIncluded ? 'included' : 'extra',
                  leadTimeDays: extracted.leadTimeDays || 4,
                  paymentTerms: extracted.paymentTerms,
                  warranty: extracted.warrantyTerms,
                  rawEmailText: bodyText.substring(0, 2000),
                  extractedJson: JSON.stringify(extracted)
                }
              });

              // 4. Compare with buyer requirements
              const comparison = await compareOffer({
                extractedOffer: extracted,
                targetPrice: neg.targetPrice,
                maxUnitPrice: neg.maxPrice
              });

              // Append AI analysis badge in negotiation chat
              await db.negotiationMessage.create({
                data: {
                  negotiationId: neg.id,
                  senderType: 'PROCURA_AI',
                  senderName: 'Procura Local AI (Gemma 3)',
                  content: `Offer Analysis: Extracted ₹${extracted.unitPrice.toLocaleString('en-IN')}/unit · Total ₹${totalAmount.toLocaleString('en-IN')} (incl. GST).\nRecommendation: ${comparison.recommendationReason}`,
                  provenance: `Local AI Analysis · ${new Date().toLocaleTimeString('en-IN')}`,
                  extractedData: JSON.stringify({ extracted, comparison }),
                  isVerified: true
                }
              });

              // Update negotiation state
              await db.negotiation.update({
                where: { id: neg.id },
                data: {
                  status: comparison.recommendedAction === 'APPROVE' ? 'agreed_pending_buyer_acceptance' : 'supplier_offer_received',
                  finalOfferPrice: extracted.unitPrice
                }
              });

              result.matchedMessages.push({
                negotiationId: neg.id,
                rfqReference: rfqRef,
                sender: fromAddress,
                subject,
                extractedPrice: extracted.unitPrice
              });
              result.syncedCount++;
            }
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err: any) {
    result.errors.push(`IMAP connection error: ${err.message}`);
  }

  return result;
}
