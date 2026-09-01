import { ProviderCapabilities } from '@/lib/types';

export interface SearchQuery {
  product: string;
  quantity: number;
  location: string;
  budget?: number;
  deliveryDeadline?: string;
  category?: string;
}

export interface ProviderSupplierResult {
  sourceExternalId: string;
  sourceCode: string;
  supplierName: string;
  productName: string;
  basePrice: number;
  availableQty: number;
  moq: number;
  deliveryDays: number;
  location: string;
  reliabilityScore: number;
  rating: number;
  freightTerms: 'included' | 'extra';
  taxRate: number;
  capabilities: ProviderCapabilities;
  hasMessagingChannel: boolean;
  contactEmail?: string;
  contactPhone?: string;
  provenance: string;
}

export interface ProviderSearchResult {
  success: boolean;
  sourceCode: string;
  suppliers: ProviderSupplierResult[];
  errorMessage?: string;
  unsupportedReason?: string;
  isAvailable: boolean;
}

export interface NegotiationContext {
  negotiationId: string;
  supplierId: string;
  sourceExternalId?: string;
  roundNumber: number;
  message: string;
  targetPrice: number;
  maxPrice: number;
  quantity: number;
  deliveryDeadline?: string;
}

export interface NegotiationMessageResult {
  success: boolean;
  channelUsed: string;
  messageSent: boolean;
  supplierResponse?: {
    content: string;
    unitPriceOffered?: number;
    freightOffered?: 'included' | 'extra';
    deliveryDaysOffered?: number;
    taxRate?: number;
    isAccepted?: boolean;
    isRejected?: boolean;
    counterTerms?: string;
    timestamp: string;
    provenance: string;
  };
  errorReason?: 'COMMUNICATION_UNAVAILABLE' | 'PROVIDER_NOT_CONFIGURED' | 'TIMEOUT' | 'CHANNEL_REJECTED' | string;
}

export interface ChannelResolutionResult {
  channelType: 'ONDC_MESSAGING' | 'DIRECT_API' | 'EMAIL' | 'NONE';
  isAutomatedAllowed: boolean;
  contactEndpoint?: string;
  statusText: string;
}

export interface TrackingEventResult {
  title: string;
  eventType: string;
  location?: string;
  source: string;
  timestamp: string;
  isVerified: boolean;
  details?: string;
}

export interface TrackingResult {
  success: boolean;
  trackingNumber: string;
  carrierName?: string;
  currentStatus: string;
  events: TrackingEventResult[];
  isLiveTrackingAvailable: boolean;
  note?: string;
}

/**
 * Universal Provider Interfaces
 */
export interface SupplierProvider {
  name: string;
  code: string;
  getCapabilities(): ProviderCapabilities;
  search(query: SearchQuery): Promise<ProviderSearchResult>;
  getSellerDetails?(sellerId: string): Promise<any>;
}

export interface NegotiationProvider {
  name: string;
  code: string;
  resolveChannel(supplierId: string, metadata?: any): Promise<ChannelResolutionResult>;
  sendNegotiationMessage(context: NegotiationContext): Promise<NegotiationMessageResult>;
}

export interface TrackingProvider {
  name: string;
  code: string;
  getTracking(trackingNumber: string): Promise<TrackingResult>;
}
