import { ProviderCapabilities } from '@/lib/types';
import {
  SupplierProvider,
  NegotiationProvider,
  SearchQuery,
  ProviderSearchResult,
  ProviderSupplierResult,
  ChannelResolutionResult,
  NegotiationContext,
  NegotiationMessageResult
} from './types';

/**
 * Marketplace Connector (e.g. Marketplace X)
 *
 * Enforces PRD Rule:
 * Search, pricing and contact details are permitted.
 * However, automated messaging and negotiations are explicitly NOT supported by this source.
 * Procura will never simulate or fake negotiation messages for this provider.
 */
export class MarketplaceProvider implements SupplierProvider, NegotiationProvider {
  public name = 'Marketplace X Connector';
  public code = 'MARKETPLACE_X';

  public getCapabilities(): ProviderCapabilities {
    return {
      canSearch: true,
      canGetProductDetails: true,
      canGetSellerDetails: true,
      canGetSellerContact: true,
      canGetPricing: true,
      canGetAvailability: true,
      canMessageSeller: false, // Explicitly false
      canNegotiate: false,     // Explicitly false
      canCreateOrder: true,
      canTrackShipment: false,
      search: true,
      sellerDetails: true,
      pricing: true,
      availability: true,
      messaging: false,
      negotiation: false,
      ordering: true,
      tracking: false
    };
  }

  public async search(query: SearchQuery): Promise<ProviderSearchResult> {
    const suppliers: ProviderSupplierResult[] = [
      {
        sourceExternalId: 'mkt-sahara-01',
        sourceCode: 'MARKETPLACE_X',
        supplierName: 'Sahara Workspace',
        productName: query.product || 'Ergonomic task chair',
        basePrice: 750,
        availableQty: 600,
        moq: 10,
        deliveryDays: 5,
        location: 'Bengaluru',
        reliabilityScore: 91,
        rating: 4.6,
        freightTerms: 'extra',
        taxRate: 18.0,
        capabilities: this.getCapabilities(),
        hasMessagingChannel: false,
        contactEmail: 'sales@saharaworkspace.in',
        contactPhone: '+91-80-4122-8899',
        provenance: 'Marketplace X read-only catalog sync'
      },
      {
        sourceExternalId: 'mkt-aura-02',
        sourceCode: 'MARKETPLACE_X',
        supplierName: 'Aura Commercial',
        productName: query.product || 'Ergonomic task chair',
        basePrice: 760,
        availableQty: 1000,
        moq: 50,
        deliveryDays: 4,
        location: 'Hyderabad',
        reliabilityScore: 89,
        rating: 4.4,
        freightTerms: 'included',
        taxRate: 18.0,
        capabilities: this.getCapabilities(),
        hasMessagingChannel: false,
        contactEmail: 'b2b@auracommercial.com',
        contactPhone: '+91-40-2344-7711',
        provenance: 'Marketplace X read-only catalog sync'
      }
    ];

    return {
      success: true,
      sourceCode: 'MARKETPLACE_X',
      suppliers,
      isAvailable: true
    };
  }

  public async resolveChannel(supplierId: string): Promise<ChannelResolutionResult> {
    return {
      channelType: 'NONE',
      isAutomatedAllowed: false,
      statusText: 'Communication unavailable: This connected source does not permit automated supplier negotiation.'
    };
  }

  public async sendNegotiationMessage(_context: NegotiationContext): Promise<NegotiationMessageResult> {
    // Non-negotiable PRD rule: Never fabricate a message if automated communication is unavailable.
    return {
      success: false,
      channelUsed: 'NONE',
      messageSent: false,
      errorReason: 'COMMUNICATION_UNAVAILABLE'
    };
  }
}
