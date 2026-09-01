/**
 * Procura - Core Type Definitions & API Contracts
 * Covers all PRD entities, provider capability models, and UI contracts.
 */

export type UserRole = 'OWNER' | 'PROCUREMENT_MANAGER' | 'PROCUREMENT_EXECUTIVE' | 'VIEWER';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  phone?: string;
  businessId: string;
  businessName: string;
  role: UserRole;
  token?: string;
}

export interface ProviderCapabilities {
  canSearch: boolean;
  canGetProductDetails: boolean;
  canGetSellerDetails: boolean;
  canGetSellerContact: boolean;
  canGetPricing: boolean;
  canGetAvailability: boolean;
  canMessageSeller: boolean;
  canNegotiate: boolean;
  canCreateOrder: boolean;
  canTrackShipment: boolean;
  // Backward compatibility flags:
  search?: boolean;
  sellerDetails?: boolean;
  pricing?: boolean;
  availability?: boolean;
  messaging?: boolean;
  negotiation?: boolean;
  ordering?: boolean;
  tracking?: boolean;
}

export interface SupplierSourceDTO {
  id: string;
  name: string;
  code: string;
  description?: string;
  isOfficial: boolean;
  isConnected?: boolean;
  capabilities: ProviderCapabilities;
}

export type PriceStatus =
  | 'not_available'
  | 'marketplace_listed'
  | 'indicative'
  | 'supplier_confirmed'
  | 'negotiated';

export interface SupplierDTO {
  id: string;
  name: string;
  sourceId: string;
  sourceName: string;
  sourceExternalId?: string;
  supplierType?: string;
  productCategory?: string;
  product: string;
  price: number | null;
  priceStatus?: PriceStatus;
  priceSource?: string;
  observedAt?: string;
  supplierQuote?: number | null;
  negotiatedQuote?: number | null;
  availability: number;
  delivery: string;
  deliveryDays: number;
  reliability: number;
  rating: number;
  location: string;
  source: string;
  why: string;
  communication: boolean;
  ordersCompleted: number;
  onTimeDeliveryRate: number;
  averageResponseMins: number;
  averageSavingsPct: number;
  capabilities: ProviderCapabilities;
  hasMessagingChannel: boolean;
  gstin?: string;
  email?: string;
  phone?: string;
}

export interface MarketProductResult {
  id: string;
  source: string;
  sourceLabel: string;
  productId?: string;
  title: string;
  merchantName: string;
  observedPriceText: string;
  observedPrice: number;
  currency: string;
  thumbnailUrl?: string;
  productUrl?: string;
  deliveryText?: string;
  deliveryDays?: number;
  rating?: number;
  reviewCount?: number;
  multipleSources?: boolean;
  availability: 'unverified' | 'in_stock' | 'out_of_stock';
  lastObservedAt: string;
  contact: {
    status: 'not_available' | 'verified';
    phone: string | null;
  };
  why?: string;
  reliability?: number;
}

export interface ProcurementItemDTO {
  id: string;
  itemName: string;
  specifications?: string;
  quantity: number;
  targetPrice?: number;
  maxPrice?: number;
}

export interface ProcurementRequest {
  id: string;
  businessId?: string;
  referenceNumber?: string;
  title: string;
  rawRequirement?: string;
  productCategory?: string;
  quantity: number;
  budget?: number;
  targetUnitPrice?: number;
  maxUnitPrice?: number;
  deliveryLocation: string;
  deadline: string;
  deliveryDeadline?: string;
  allowPartial?: boolean;
  status: 'draft' | 'searching' | 'review' | 'approved' | 'completed' | 'cancelled' | string;
  whyExplanation?: string;
  items?: ProcurementItemDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierOffer {
  id: string;
  requestId: string;
  supplierId: string;
  supplierName?: string;
  negotiationId?: string;
  roundNumber?: number;
  unitPrice: number;
  quantity: number;
  moq?: number;
  freight: 'included' | 'extra' | 'unknown';
  freightCost?: number;
  taxRate?: number;
  totalAmount?: number;
  deliveryDays?: number;
  paymentTerms?: string;
  warrantyTerms?: string;
  source: string;
  sourceProvenance?: string;
  verifiedAt: string;
  isBuyerApproved?: boolean;
  isBestOffer?: boolean;
  savingsVsInitial?: number;
}

export interface NegotiationMessageDTO {
  id: string;
  negotiationId: string;
  senderType: 'PROCURA_AI' | 'SUPPLIER' | 'BUYER_USER' | 'SYSTEM';
  senderName: string;
  content: string;
  extractedData?: any;
  provenance: string;
  createdAt: string;
}

export interface NegotiationRoundDTO {
  id: string;
  roundNumber: number;
  buyerProposal?: string;
  sellerCounter?: string;
  priceProposed?: number;
  priceCountered?: number;
  termsNotes?: string;
  completedAt?: string;
}

export interface Negotiation {
  id: string;
  businessId?: string;
  supplierId: string;
  supplierName?: string;
  requestId: string;
  sessionCode?: string;
  status: 'DRAFT' | 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'COMMUNICATION_UNAVAILABLE' | 'BUYER_DECISION_REQUIRED' | 'CANCELLED' | string;
  maxPrice: number;
  targetPrice: number;
  quantity: number;
  maxRounds: number;
  currentRound?: number;
  deliveryDeadline?: string;
  freightRequired?: boolean;
  paymentTerms?: string;
  warrantyRequired?: boolean;
  channelResolved?: string;
  channelStatus?: 'AVAILABLE' | 'COMMUNICATION_UNAVAILABLE' | string;
  finalOfferPrice?: number;
  savingsAmount?: number;
  messages?: NegotiationMessageDTO[];
  rounds?: NegotiationRoundDTO[];
  currentOffer?: SupplierOffer;
  createdAt?: string;
}

export interface PurchaseOrderItemDTO {
  id: string;
  itemName: string;
  specifications?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalAmount: number;
}

export interface PurchaseOrder {
  id: string;
  businessId?: string;
  supplierId: string;
  supplierName?: string;
  requestId?: string;
  offerId?: string;
  poNumber: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'ACKNOWLEDGED' | 'ACCEPTED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CLOSED' | 'REJECTED' | 'CANCELLED' | 'DISPUTED' | 'AMENDMENT_REQUIRED' | string;
  subtotal?: number;
  taxAmount?: number;
  freightAmount?: number;
  total: number;
  totalAmount?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  deliveryAddress?: string;
  expectedDelivery?: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  acknowledgedAt?: string;
  amendmentNotes?: string;
  items?: PurchaseOrderItemDTO[];
  createdAt?: string;
}

export interface DocumentExtractionDTO {
  id: string;
  extractedPoNumber?: string;
  extractedInvoiceNumber?: string;
  extractedDate?: string;
  extractedSupplier?: string;
  extractedItems?: any;
  extractedQty?: number;
  extractedUnitPrice?: number;
  extractedTax?: number;
  extractedTotal?: number;
  confidenceScore: number;
  varianceDetected: boolean;
  varianceSummary?: string;
}

export interface DocumentDTO {
  id: string;
  businessId: string;
  purchaseOrderId?: string;
  supplierId?: string;
  supplierName?: string;
  documentType: 'PURCHASE_ORDER' | 'QUOTATION' | 'INVOICE' | 'LORRY_RECEIPT' | 'EWAY_BILL' | 'PACKING_LIST' | 'DELIVERY_RECEIPT' | 'OTHER';
  documentNumber?: string;
  fileName: string;
  fileUrl?: string;
  fileSizeBytes: number;
  mimeType: string;
  reconciliationStatus: 'VERIFIED' | 'MISMATCH' | 'PENDING' | 'DISPUTED';
  discrepancyNotes?: string;
  extractions?: DocumentExtractionDTO[];
  uploadedAt: string;
}

export interface ShipmentEventDTO {
  id: string;
  eventType: string;
  title: string;
  location?: string;
  source: string;
  isVerified: boolean;
  timestamp: string;
  details?: string;
}

export interface RecoveryOptionDTO {
  id: string;
  optionCode: string;
  title: string;
  description: string;
  additionalCost: number;
  delayAvoidedDays: number;
  isRecommended: boolean;
  isApproved: boolean;
  approvedAt?: string;
}

export type PaymentStatus =
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'PARTIALLY_PAID';

export interface PaymentDTO {
  id: string;
  poId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  verifiedAt?: string;
  webhookEventId?: string;
  receiptNumber?: string;
  milestoneTitle?: string;
  notes?: string;
  createdAt: string;
}

export type ShipmentStatus =
  | 'AWAITING_BUYER_ADDRESS'
  | 'AWAITING_SUPPLIER_ACCEPTANCE'
  | 'SUPPLIER_ACCEPTED'
  | 'AWAITING_PACKAGE_DETAILS'
  | 'AWAITING_DISPATCH'
  | 'SHIPMENT_BOOKED'
  | 'AWB_ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'EXCEPTION'
  | string;

export interface Shipment {
  id: string;
  businessId?: string;
  purchaseOrderId: string;
  poNumber?: string;
  supplierId?: string;
  supplierName?: string;
  trackingNumber?: string;
  carrierName?: string;
  status: ShipmentStatus;
  shippingMode?: 'supplier_managed' | 'procura_managed' | string;
  pickupAddressConfirmed?: boolean;
  pickupAddress?: string;
  pickupPincode?: string;
  deliveryAddressConfirmed?: boolean;
  deliveryAddress?: string;
  deliveryPincode?: string;
  packageDetailsConfirmed?: boolean;
  packageWeightKg?: number;
  packageDimensions?: string;
  packageCount?: number;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: string;
  awbCode?: string;
  courierName?: string;
  trackingUrl?: string;
  currentStatus?: string;
  lastScanLocation?: string;
  risk?: 'low' | 'medium' | 'high' | 'critical';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expectedDelivery?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  podUrl?: string;
  supplierAcceptedAt?: string;
  supplierAcceptanceRef?: string;
  supplierAcceptanceNotes?: string;
  estimatedDelayDays?: number;
  originLocation?: string;
  destinationLocation?: string;
  currentLocation?: string;
  lastVerifiedEvent?: string;
  riskExplanation?: string;
  events?: ShipmentEventDTO[];
  recoveryOptions?: RecoveryOptionDTO[];
  createdAt?: string;
}

export interface RiskEventDTO {
  id: string;
  shipmentId?: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  impactDays: number;
  costImpact: number;
  isResolved: boolean;
  detectedAt: string;
}

export interface NotificationDTO {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  message: string;
  linkHref?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AnalyticsDTO {
  totalProcurement: number;
  totalSavings: number;
  averageSavingsPct: number;
  onTimeDeliveryRate: number;
  activeRequestsCount: number;
  activeNegotiationsCount: number;
  atRiskShipmentsCount: number;
  monthlySpendHistory: { label: string; amount: number; height: number }[];
  supplierPerformanceList: { id: string; name: string; reliability: number; orders: number }[];
}

export interface ParsedRequirementDTO {
  product: string;
  quantity: number | null;
  location: string | null;
  budget: number | null;
  currency: string;
  deliveryDeadline: string | null;
  missingFields: string[];
  clarificationPrompt?: string;
  isImpossibleConstraint?: boolean;
  constraintNotes?: string;
}
