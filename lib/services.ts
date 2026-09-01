import {
  SupplierDTO,
  ProcurementRequest,
  SupplierOffer,
  Negotiation,
  PurchaseOrder,
  DocumentDTO,
  Shipment,
  RiskEventDTO,
  NotificationDTO,
  AnalyticsDTO,
  ParsedRequirementDTO,
  RecoveryOptionDTO,
  SupplierSourceDTO
} from './types';
import { suppliers as mockSuppliers } from './data';

const useMocks = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

async function api<T>(path: string, options?: RequestInit, fallbackMock?: T): Promise<T> {
  if (useMocks && fallbackMock !== undefined) {
    return Promise.resolve(fallbackMock);
  }

  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || errBody.message || `Request failed with status ${res.status}`);
    }

    return (await res.json()) as T;
  } catch (error: any) {
    if (fallbackMock !== undefined) {
      console.warn(`[API Fallback to Mock on Error: ${path}]`, error.message);
      return fallbackMock;
    }
    throw error;
  }
}

/**
 * Supplier Intelligence Service
 */
export const supplierService = {
  list: (params?: { location?: string; source?: string; minReliability?: number }) => {
    let url = '/api/suppliers';
    if (params) {
      const query = new URLSearchParams();
      if (params.location) query.set('location', params.location);
      if (params.source) query.set('source', params.source);
      if (params.minReliability) query.set('minReliability', String(params.minReliability));
      url += `?${query.toString()}`;
    }
    return api<SupplierDTO[]>(url, undefined, mockSuppliers as any);
  },
  get: (id: string) => {
    const mock = mockSuppliers.find((x) => x.id === id) as any;
    return api<SupplierDTO>(`/api/suppliers/${id}`, undefined, mock);
  },
  addBatch: (suppliers: SupplierDTO[]) =>
    api<{ success: boolean; count: number; suppliers: SupplierDTO[] }>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(suppliers)
    })
};

/**
 * Procurement Requests Service
 */
export const procurementService = {
  list: () => api<{ success: boolean; data: ProcurementRequest[] }>('/api/procurement', undefined, { success: true, data: [] }),
  get: (id: string) => api<{ success: boolean; data: ProcurementRequest }>(`/api/procurement/${id}`),
  create: (data: Partial<ProcurementRequest>) =>
    api<{ success: boolean; data: ProcurementRequest }>('/api/procurement', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  parse: (requirement: string) =>
    api<{ success: boolean; data: ParsedRequirementDTO }>('/api/procurement/parse', {
      method: 'POST',
      body: JSON.stringify({ requirement })
    }),
  search: (id: string) =>
    api<{
      success: boolean;
      totalDiscovered: number;
      qualifiedCount: number;
      top5: SupplierDTO[];
      allQualified: SupplierDTO[];
    }>(`/api/procurement/${id}/search`, { method: 'POST' }),
  selectSuppliers: (id: string, selectedSupplierIds: string[]) =>
    api<{ success: boolean; negotiations: Negotiation[] }>(`/api/procurement/${id}/select-suppliers`, {
      method: 'POST',
      body: JSON.stringify({ selectedSupplierIds })
    })
};

/**
 * Multi-Intent Supplier Discovery Service (SerpApi + Classification + Local AI)
 */
export const discoveryService = {
  discover: (input: {
    product: string;
    quantity?: number;
    location?: { city: string; state?: string; country?: string; address?: string | null };
    maxUnitPrice?: number;
    requirements?: string[];
  }) =>
    api<{
      success: boolean;
      product: string;
      quantity: number;
      location: { city: string; state?: string; country?: string };
      totalDirectSuppliersFound: number;
      top5Suppliers: any[];
      marketIntelligence: any[];
      fromCache?: boolean;
      message?: string;
    }>('/api/suppliers/discover', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  resolveContact: (supplierId: string, payload?: { manualEmail?: string; manualPhone?: string; officialWebsiteUrl?: string }) =>
    api<{ success: boolean; contact: any }>(`/api/suppliers/${supplierId}/contact`, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    })
};

/**
 * Negotiation Engine Service
 */
export const negotiationService = {
  list: () => api<{ success: boolean; data: Negotiation[] }>('/api/negotiations', undefined, { success: true, data: [] }),
  get: (id: string) => api<{ success: boolean; data: Negotiation }>(`/api/negotiations/${id}`),
  sendMessage: (id: string, customMessage?: string) =>
    api<{ success: boolean; data: Negotiation }>(`/api/negotiations/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ customMessage })
    }),
  sendEmail: (id: string, emailData: { to: string; subject: string; emailBody: string; rfqReference?: string; deliveryMode?: 'preview' | 'live' }) =>
    api<{ success: boolean; result: any }>(`/api/negotiations/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify(emailData)
    }),
  syncMail: (id: string) =>
    api<{ success: boolean; result: any }>(`/api/negotiations/${id}/sync-mail`, {
      method: 'POST'
    }),
  acceptOffer: (id: string, offerData?: any) =>
    api<{ success: boolean; po: PurchaseOrder; message: string }>(`/api/negotiations/${id}/accept-offer`, {
      method: 'POST',
      body: JSON.stringify(offerData || {})
    }),
  decide: (id: string, decision: 'APPROVE' | 'CONTINUE' | 'REJECT') =>
    api<{ success: boolean; message: string; purchaseOrder?: PurchaseOrder; negotiation: Negotiation }>(
      `/api/negotiations/${id}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({ decision })
      }
    )
};

/**
 * Offers Service
 */
export const offerService = {
  list: (requestId?: string) =>
    api<{ success: boolean; data: SupplierOffer[] }>(
      `/api/offers${requestId ? `?requestId=${requestId}` : ''}`,
      undefined,
      { success: true, data: [] }
    )
};

/**
 * Purchase Orders Service
 */
export const purchaseOrderService = {
  list: () => api<{ success: boolean; data: PurchaseOrder[] }>('/api/purchase-orders', undefined, { success: true, data: [] }),
  get: (id: string) => api<{ success: boolean; data: PurchaseOrder }>(`/api/purchase-orders/${id}`),
  create: (data: any) =>
    api<{ success: boolean; data: PurchaseOrder }>('/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateStatus: (id: string, status: string, notes?: string) =>
    api<{ success: boolean; purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes })
    })
};

/**
 * Document & Reconciliation Service
 */
export const documentService = {
  list: () => api<{ success: boolean; data: DocumentDTO[] }>('/api/documents', undefined, { success: true, data: [] }),
  get: (id: string) => api<{ success: boolean; data: DocumentDTO }>(`/api/documents/${id}`),
  upload: (data: Partial<DocumentDTO>) =>
    api<{ success: boolean; data: DocumentDTO }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  reconcile: (id: string) =>
    api<{ success: boolean; report: any; document: DocumentDTO }>(`/api/documents/${id}/reconcile`, {
      method: 'POST'
    })
};

/**
 * Payment & Razorpay Service
 */
export const paymentService = {
  createOrder: (params: { poId: string; milestonePercentage?: number; totalAmount?: number; poNumber?: string; supplierName?: string; notes?: any }) =>
    api<{
      success: boolean;
      order: {
        id: string;
        paymentRecordId?: string;
        amountPaise: number;
        amountRupees: number;
        currency: string;
        keyId: string;
        receipt: string;
        poNumber: string;
        supplierName: string;
        milestoneTitle: string;
        milestonePercentage: number;
        grandTotalRupees: number;
        isTestMode: boolean;
      };
    }>('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(params)
    }),
  verify: (params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    poId: string;
    amountRupees?: number;
    supplierName?: string;
  }) =>
    api<{
      success: boolean;
      verified: boolean;
      payment: any;
      nextStep: { status: string; message: string };
    }>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(params)
    })
};

/**
 * Shipments & Tracking Service
 */
export const shipmentService = {
  list: () => api<{ success: boolean; data: Shipment[] }>('/api/shipments', undefined, { success: true, data: [] }),
  get: (id: string) => api<{ success: boolean; data: Shipment }>(`/api/shipments/${id}`),
  recordSupplierAcceptance: (params: {
    poId: string;
    channel?: string;
    confirmationRef?: string;
    notes?: string;
    leadTimeDays?: number;
    confirmedPickupCity?: string;
  }) =>
    api<{ success: boolean; status: string; acceptance: any; nextStep: any }>('/api/shipments/supplier-acceptance', {
      method: 'POST',
      body: JSON.stringify(params)
    }),
  assignManualAwb: (params: {
    poId: string;
    courierName: string;
    awbCode: string;
    trackingUrl?: string;
    notes?: string;
  }) =>
    api<{ success: boolean; shipment: any; tracking: any }>('/api/shipments/manual-awb', {
      method: 'POST',
      body: JSON.stringify(params)
    }),
  bookShiprocket: (params: {
    poId: string;
    pickupAddress: any;
    deliveryAddress: any;
    packageDetails: any;
  }) =>
    api<{ success: boolean; booking: any }>('/api/shipments/book', {
      method: 'POST',
      body: JSON.stringify(params)
    }),
  track: (idOrAwb: string) =>
    api<{
      success: boolean;
      status: string;
      hasAwb: boolean;
      awbCode?: string;
      courierName?: string;
      currentStatus?: string;
      lastScanLocation?: string;
      lastScanTime?: string;
      planningEstimate?: string;
      courierEstimate?: string | null;
      isDelivered?: boolean;
      deliveredAt?: string;
      trackingUrl?: string;
      podUrl?: string;
      events: any[];
    }>(`/api/shipments/${idOrAwb}/track`),
  sync: (id: string) =>
    api<{ success: boolean; syncedAt: string; tracking: any }>(`/api/shipments/${id}/sync`, {
      method: 'POST'
    }),
  addEvent: (id: string, eventData: any) =>
    api<{ success: boolean; event: any; shipment: Shipment }>(`/api/shipments/${id}/event`, {
      method: 'POST',
      body: JSON.stringify(eventData)
    }),
  query: (poOrQuery: string) =>
    api<{ success: boolean; found: boolean; message: string; poNumber?: string; status?: string }>(
      `/api/shipments/query?po=${encodeURIComponent(poOrQuery)}`
    )
};

/**
 * Risk & Recovery Service
 */
export const riskService = {
  list: () => api<{ success: boolean; data: RiskEventDTO[] }>('/api/risks', undefined, { success: true, data: [] })
};

export const recoveryService = {
  list: (shipmentId?: string) =>
    api<{ success: boolean; options: RecoveryOptionDTO[] }>(
      `/api/recovery${shipmentId ? `?shipmentId=${shipmentId}` : ''}`
    ),
  approve: (optionId: string) =>
    api<{ success: boolean; message: string; option: RecoveryOptionDTO; shipment: Shipment }>(
      `/api/recovery/${optionId}/approve`,
      {
        method: 'POST'
      }
    )
};

/**
 * Notifications Service
 */
export const notificationService = {
  list: () =>
    api<{ success: boolean; unreadCount: number; notifications: NotificationDTO[] }>('/api/notifications', undefined, {
      success: true,
      unreadCount: 0,
      notifications: []
    }),
  markRead: (id: string) =>
    api<{ success: boolean }>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ id })
    })
};

/**
 * Analytics Service
 */
export const analyticsService = {
  get: () => api<{ success: boolean; data: AnalyticsDTO }>('/api/analytics')
};

/**
 * AI Copilot Service
 */
export const copilotService = {
  ask: (query: string) =>
    api<{
      success: boolean;
      data: {
        answer: string;
        suggestedActions?: { label: string; href: string }[];
        factsGrounded: string[];
      };
    }>('/api/copilot', {
      method: 'POST',
      body: JSON.stringify({ query })
    })
};

/**
 * Supplier Sources Service
 */
export const sourceService = {
  list: () => api<{ success: boolean; sources: SupplierSourceDTO[] }>('/api/sources'),
  connect: (sourceCode: string, token: string, accountName: string) =>
    api<{ success: boolean; message: string }>('/api/sources', {
      method: 'POST',
      body: JSON.stringify({ sourceCode, token, accountName })
    })
};

/**
 * Google Shopping Market Search Service (SerpApi)
 */
export const marketSearchService = {
  search: (query: string, location?: string, budget?: number) =>
    api<{
      success: boolean;
      query: string;
      location: string;
      total: number;
      top5: import('./types').MarketProductResult[];
      results: import('./types').MarketProductResult[];
      fromCache?: boolean;
      error?: string;
      message?: string;
    }>('/api/market-search', {
      method: 'POST',
      body: JSON.stringify({ query, location, budget })
    })
};

/**
 * Auth Service
 */
export const authService = {
  login: (credentials: { email: string; password: string }) =>
    api<{ success: boolean; user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  signup: (data: any) =>
    api<{ success: boolean; user: any; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  me: () => api<{ authenticated: boolean; user: any }>('/api/auth/me'),
  logout: () => api<{ success: boolean }>('/api/auth/logout', { method: 'POST' })
};
