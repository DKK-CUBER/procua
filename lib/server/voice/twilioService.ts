export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  apiKey?: string;
  apiSecret?: string;
  fromPhoneNumber: string;
  baseUrl: string;
  recordCalls: boolean;
}

export function getTwilioConfig(): TwilioConfig {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    apiKey: process.env.TWILIO_API_KEY || '',
    apiSecret: process.env.TWILIO_API_SECRET || '',
    fromPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '+17372508034',
    baseUrl: process.env.PUBLIC_BASE_URL || process.env.APP_URL || 'http://localhost:3000',
    recordCalls: process.env.TWILIO_RECORD_CALLS === 'true'
  };
}

export interface InitiateCallParams {
  toPhoneNumber: string;
  negotiationId: string;
  procurementId: string;
  supplierId: string;
  supplierName: string;
  product?: string;
  quantity?: number;
  targetPrice?: number;
  maximumPrice?: number;
  buyerName?: string;
  customWebhookUrl?: string;
  isSimulation?: boolean;
}

export interface InitiateCallResponse {
  success: boolean;
  callSid: string;
  status: 'initiated' | 'queued' | 'simulated' | 'failed';
  to: string;
  from: string;
  message?: string;
  webhookUrl: string;
}

/**
 * Initiates an outbound voice call via Twilio REST API
 */
export async function initiateTwilioCall(params: InitiateCallParams): Promise<InitiateCallResponse> {
  const config = getTwilioConfig();

  // Webhook URL for Twilio to request TwiML on connect
  const webhookUrl = params.customWebhookUrl ||
    `${config.baseUrl}/api/webhooks/twilio/voice?negId=${encodeURIComponent(params.negotiationId)}&supplierId=${encodeURIComponent(params.supplierId)}`;
  
  const statusCallbackUrl = `${config.baseUrl}/api/webhooks/twilio/status?negId=${encodeURIComponent(params.negotiationId)}`;

  if (params.isSimulation || process.env.NODE_ENV === 'test') {
    const simSid = 'CA_SIM_' + Math.random().toString(36).substring(2, 12);
    return {
      success: true,
      callSid: simSid,
      status: 'simulated',
      to: params.toPhoneNumber,
      from: config.fromPhoneNumber,
      message: 'Simulated voice call initiated for testing environment',
      webhookUrl
    };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`;

    // Direct Hackathon live destination: Route calls to +916369763938
    const liveTargetPhone = process.env.DEMO_DESTINATION_PHONE || '+916369763938';

    const bodyParams = new URLSearchParams();
    bodyParams.append('To', liveTargetPhone);
    bodyParams.append('From', config.fromPhoneNumber);

    let targetUrl = webhookUrl;

    const isLocalhost = config.baseUrl.includes('localhost') || config.baseUrl.includes('127.0.0.1');
    if (isLocalhost) {
      try {
        const prod = params.product || 'Procurement Item';
        const qty = params.quantity || 500;
        const buyer = params.buyerName || 'Sadwik';
        const supName = params.supplierName || 'Supplier';

        const speechXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Vanakkam. This is ${escapeXml(buyer)} calling from Procura regarding ${escapeXml(qty.toString())} units of ${escapeXml(prod)} from ${escapeXml(supName)}.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">Could you please confirm your best bulk commercial quote and lead time for delivery to Chennai?</Say>
  <Pause length="3"/>
  <Say voice="Polly.Aditi" language="en-IN">Thank you. I have recorded your quote and will review it with the buyer for purchase order approval.</Say>
</Response>`;

        const tokenRes = await fetch('https://webhook.site/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            default_status: 200,
            default_content_type: 'application/xml',
            default_content: speechXml
          })
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData?.uuid) {
            targetUrl = `https://webhook.site/${tokenData.uuid}`;
          }
        }
      } catch (_) {
        targetUrl = 'http://demo.twilio.com/docs/voice.xml';
      }
    }

    bodyParams.append('Url', targetUrl);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    const data = await res.json();

    if (!res.ok) {
      // In trial accounts with unverified destination numbers, provide clear diagnostic message
      return {
        success: false,
        callSid: data.sid || '',
        status: 'failed',
        to: params.toPhoneNumber,
        from: config.fromPhoneNumber,
        message: data.message || `Twilio error code: ${data.code}`,
        webhookUrl
      };
    }

    return {
      success: true,
      callSid: data.sid,
      status: (data.status as any) || 'initiated',
      to: params.toPhoneNumber,
      from: config.fromPhoneNumber,
      webhookUrl
    };
  } catch (err: any) {
    return {
      success: false,
      callSid: '',
      status: 'failed',
      to: params.toPhoneNumber,
      from: config.fromPhoneNumber,
      message: err.message || 'Twilio connection failed',
      webhookUrl
    };
  }
}

/**
 * Builds standard XML TwiML for speech gathering and conversational responses.
 */
export function buildVoiceTwiml(params: {
  speechText: string;
  actionUrl: string;
  isEnd?: boolean;
  language?: string;
}): string {
  const voice = params.language === 'hi' || params.language === 'ta' ? 'Polly.Aditi' : 'Polly.Aditi';
  const speechHints = 'price, per unit, discount, GST, delivery, days, shipping, freight, bulk, ready stock, confirmation';

  if (params.isEnd) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="en-IN">${escapeXml(params.speechText)}</Say>
  <Hangup/>
</Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${escapeXml(params.actionUrl)}" method="POST" speechTimeout="auto" hints="${speechHints}" language="en-IN,hi-IN,ta-IN">
    <Say voice="${voice}" language="en-IN">${escapeXml(params.speechText)}</Say>
  </Gather>
  <Say voice="${voice}" language="en-IN">Sorry, I didn't catch that. Could you please repeat your offer?</Say>
  <Redirect method="POST">${escapeXml(params.actionUrl)}</Redirect>
</Response>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
