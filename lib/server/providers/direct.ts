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
 * Direct Enterprise Supplier API Adapter
 * For pre-integrated verified vendors with direct API integrations.
 */
export class DirectApiProvider implements SupplierProvider, NegotiationProvider {
  public name = 'Direct Supplier API';
  public code = 'DIRECT_API';

  public getCapabilities(): ProviderCapabilities {
    return {
      canSearch: true,
      canGetProductDetails: true,
      canGetSellerDetails: true,
      canGetSellerContact: true,
      canGetPricing: true,
      canGetAvailability: true,
      canMessageSeller: true,
      canNegotiate: true,
      canCreateOrder: true,
      canTrackShipment: true,
      search: true,
      sellerDetails: true,
      pricing: true,
      availability: true,
      messaging: true,
      negotiation: true,
      ordering: true,
      tracking: true
    };
  }

  public async search(query: SearchQuery): Promise<ProviderSearchResult> {
    const suppliers: ProviderSupplierResult[] = [
      {
        sourceExternalId: 'direct-dwell-01',
        sourceCode: 'DIRECT_API',
        supplierName: 'Dwell Business',
        productName: query.product || 'Ergonomic task chair',
        basePrice: 748,
        availableQty: 520,
        moq: 20,
        deliveryDays: 6,
        location: 'Chennai',
        reliabilityScore: 95,
        rating: 4.8,
        freightTerms: 'included',
        taxRate: 18.0,
        capabilities: this.getCapabilities(),
        hasMessagingChannel: true,
        contactEmail: 'procure@dwellbusiness.com',
        contactPhone: '+91-44-4900-1122',
        provenance: 'Direct enterprise vendor webhook feed'
      }
    ];

    return {
      success: true,
      sourceCode: 'DIRECT_API',
      suppliers,
      isAvailable: true
    };
  }

  public async resolveChannel(supplierId: string): Promise<ChannelResolutionResult> {
    return {
      channelType: 'DIRECT_API',
      isAutomatedAllowed: true,
      contactEndpoint: 'https://api.dwellbusiness.com/v1/procurement/rfq',
      statusText: 'Direct Supplier REST API'
    };
  }

  public async sendNegotiationMessage(context: NegotiationContext): Promise<NegotiationMessageResult> {
    return {
      success: true,
      channelUsed: 'DIRECT_API',
      messageSent: true,
      supplierResponse: {
        content: `Dwell Business API response: We can adjust to ₹${Math.max(context.targetPrice, 742)}/unit with 5 days standard delivery.`,
        unitPriceOffered: Math.max(context.targetPrice, 742),
        freightOffered: 'included',
        deliveryDaysOffered: 5,
        taxRate: 18.0,
        isAccepted: context.targetPrice >= 742,
        isRejected: false,
        counterTerms: 'Net 30 payment terms for approved corporate accounts.',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
        provenance: 'Direct enterprise API response'
      }
    };
  }
}
