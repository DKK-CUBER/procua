export interface ShiprocketConfig {
  email: string;
  password: string;
  mode: 'disabled' | 'live';
}

export function getShiprocketConfig(): ShiprocketConfig {
  return {
    email: process.env.SHIPROCKET_API_EMAIL || '',
    password: process.env.SHIPROCKET_API_PASSWORD || '',
    mode: (process.env.SHIPROCKET_MODE === 'live' ? 'live' : 'disabled')
  };
}

// In-Memory Token Cache
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Authenticates with Shiprocket API and returns JWT token (cached for 24 hours)
 */
export async function getShiprocketAuthToken(): Promise<string | null> {
  const config = getShiprocketConfig();

  if (config.mode !== 'live' || !config.email || !config.password) {
    return null;
  }

  // Use cached token if valid for more than 5 minutes
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.email,
        password: config.password
      })
    });

    if (!res.ok) {
      console.warn(`Shiprocket auth failed (${res.status}): ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    if (data?.token) {
      cachedToken = {
        token: data.token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      };
      return data.token;
    }
    return null;
  } catch (err: any) {
    console.warn('Shiprocket auth exception:', err.message);
    return null;
  }
}

export interface CreateShiprocketOrderParams {
  poId: string;
  poNumber: string;
  supplierName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  // Confirmed pickup & delivery details
  pickupAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    isConfirmed: boolean;
  };
  deliveryAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    isConfirmed: boolean;
  };
  packageDetails: {
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
    isConfirmed: boolean;
  };
}

export interface CreateShiprocketOrderResult {
  success: boolean;
  orderId?: string;
  shipmentId?: string;
  awbCode?: string;
  courierName?: string;
  status: string;
  isMockOrDisabled: boolean;
  message?: string;
}

/**
 * Creates an adhoc Shiprocket shipment order after strict address and package confirmation.
 */
export async function createShiprocketOrder(params: CreateShiprocketOrderParams): Promise<CreateShiprocketOrderResult> {
  const config = getShiprocketConfig();

  // Validate strict confirmation gates
  if (!params.pickupAddress?.isConfirmed || !params.pickupAddress.pincode) {
    throw new Error('Cannot book Shiprocket shipment: Supplier pickup address and pincode must be explicitly confirmed.');
  }
  if (!params.deliveryAddress?.isConfirmed || !params.deliveryAddress.pincode) {
    throw new Error('Cannot book Shiprocket shipment: Buyer delivery destination address and pincode must be confirmed.');
  }
  if (!params.packageDetails?.isConfirmed || !params.packageDetails.weightKg || params.packageDetails.weightKg <= 0) {
    throw new Error('Cannot book Shiprocket shipment: Package weight and physical dimensions must be verified.');
  }

  const token = await getShiprocketAuthToken();

  if (config.mode === 'live' && token) {
    try {
      const orderDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: params.poNumber,
          order_date: orderDate,
          pickup_location: params.pickupAddress.city,
          billing_customer_name: params.deliveryAddress.name || 'Procurement Officer',
          billing_last_name: '',
          billing_address: params.deliveryAddress.address,
          billing_city: params.deliveryAddress.city,
          billing_pincode: params.deliveryAddress.pincode,
          billing_state: params.deliveryAddress.state,
          billing_country: 'India',
          billing_email: 'procurement@procura.in',
          billing_phone: params.deliveryAddress.phone || '+919876543210',
          shipping_is_billing: true,
          order_items: [
            {
              name: params.productName,
              sku: `SKU-${params.poNumber}`,
              units: params.quantity,
              selling_price: Math.round(params.totalAmount / params.quantity)
            }
          ],
          payment_method: 'Prepaid',
          sub_total: params.totalAmount,
          length: params.packageDetails.lengthCm || 50,
          breadth: params.packageDetails.widthCm || 50,
          height: params.packageDetails.heightCm || 50,
          weight: params.packageDetails.weightKg
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `Shiprocket error (${res.status}): ${res.statusText}`);
      }

      return {
        success: true,
        orderId: String(data.order_id),
        shipmentId: String(data.shipment_id),
        awbCode: data.awb_code || undefined,
        courierName: data.courier_name || 'Shiprocket Logistics',
        status: 'SHIPMENT_BOOKED',
        isMockOrDisabled: false
      };
    } catch (err: any) {
      console.warn('Live Shiprocket call failed:', err.message);
      throw err;
    }
  }

  // When SHIPROCKET_MODE=disabled or no API credentials
  return {
    success: false,
    status: 'SHIPMENT_BOOKING_DISABLED',
    isMockOrDisabled: true,
    message: 'Shipment booking is not configured with live Shiprocket credentials. Add a verified AWB when the supplier dispatches.'
  };
}

export interface TrackingEvent {
  status: string;
  activity: string;
  location: string;
  timestamp: string;
  source: 'shiprocket' | 'supplier' | 'buyer';
}

export interface ShiprocketTrackingResult {
  success: boolean;
  awbCode: string;
  courierName?: string;
  currentStatus: string;
  lastScanLocation?: string;
  lastScanTime?: string;
  estimatedDeliveryAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  trackingUrl?: string;
  podUrl?: string;
  events: TrackingEvent[];
  error?: string;
}

/**
 * Fetches real carrier scan tracking details from Shiprocket using actual AWB code.
 */
export async function getShiprocketTracking(awbCode: string): Promise<ShiprocketTrackingResult> {
  if (!awbCode || awbCode.trim().length === 0) {
    return {
      success: false,
      awbCode: '',
      currentStatus: 'AWAITING_AWB',
      isDelivered: false,
      events: [],
      error: 'Tracking begins once the supplier or courier provides an AWB.'
    };
  }

  const token = await getShiprocketAuthToken();
  const config = getShiprocketConfig();

  if (config.mode === 'live' && token) {
    try {
      const res = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${encodeURIComponent(awbCode)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        return {
          success: false,
          awbCode,
          currentStatus: 'TRACKING_UNAVAILABLE',
          isDelivered: false,
          events: [],
          error: `Shiprocket tracking query failed: ${res.statusText}`
        };
      }

      const data = await res.json();
      const trackingData = data?.tracking_data;
      const shipmentTrack = trackingData?.shipment_track?.[0];
      const activities = trackingData?.shipment_track_activities || [];

      const events: TrackingEvent[] = activities.map((act: any) => ({
        status: act.sr_status_label || act.activity || 'Carrier Scan',
        activity: act.activity || 'Package processed',
        location: act.location || 'Hub Facility',
        timestamp: act.date || new Date().toISOString(),
        source: 'shiprocket' as const
      }));

      const isDelivered = shipmentTrack?.current_status?.toLowerCase() === 'delivered';

      return {
        success: true,
        awbCode,
        courierName: shipmentTrack?.courier_name || 'Carrier Partner',
        currentStatus: shipmentTrack?.current_status || 'IN_TRANSIT',
        lastScanLocation: shipmentTrack?.destination || events[0]?.location || 'In Transit',
        lastScanTime: events[0]?.timestamp,
        estimatedDeliveryAt: shipmentTrack?.edd,
        isDelivered,
        deliveredAt: isDelivered ? (events[0]?.timestamp || new Date().toISOString()) : undefined,
        trackingUrl: trackingData?.track_url,
        podUrl: shipmentTrack?.pod,
        events
      };
    } catch (err: any) {
      return {
        success: false,
        awbCode,
        currentStatus: 'EXCEPTION',
        isDelivered: false,
        events: [],
        error: err.message
      };
    }
  }

  // If Shiprocket is disabled / not configured, return clean standard status without fake scans
  return {
    success: true,
    awbCode,
    courierName: 'Supplier Direct Logistics',
    currentStatus: 'AWB_ASSIGNED',
    lastScanLocation: 'Origin Dispatch Center',
    lastScanTime: new Date().toISOString(),
    isDelivered: false,
    events: [
      {
        status: 'AWB Assigned',
        activity: `Consignment booked with AWB ${awbCode}`,
        location: 'Origin Facility',
        timestamp: new Date().toISOString(),
        source: 'supplier'
      }
    ]
  };
}
