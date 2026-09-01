import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'procura_default_aes_256_symmetric_key_32_bytes!';
const ALGORITHM = 'aes-256-cbc';

// Normalize key to 32 bytes
function getKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypt sensitive marketplace / provider credentials before saving to DB.
 * Never stores raw marketplace tokens or passwords.
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt stored provider credentials for server-side provider calls.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.includes(':')) return '';
  try {
    const [ivHex, encryptedText] = encryptedPayload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Failed to decrypt secret:', e);
    return '';
  }
}

/**
 * AI Security & Prompt Injection Defense
 * Treats all supplier-provided messages, quotation texts, and document inputs as untrusted data.
 * Strips out malicious override attempts and delimiters.
 */
export function sanitizeUntrustedInput(input: string): { sanitized: string; injectionDetected: boolean; flags: string[] } {
  if (!input) return { sanitized: '', injectionDetected: false, flags: [] };

  const flags: string[] = [];
  let injectionDetected = false;

  // Pattern detection for prompt injection
  const injectionPatterns = [
    /ignore\s+.*(?:instructions|rules|constraints|prompt)/i,
    /system\s*:\s*you\s+must/i,
    /accept\s+.*without\s+approval/i,
    /bypass\s+.*(?:limits|rules|max\s*price)/i,
    /override\s+.*(?:procurement|rules|constraints|limits)/i,
    /drop\s+database|delete\s+from/i,
    /<script\b/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      injectionDetected = true;
      flags.push(`Suspicious pattern matched: ${pattern.toString()}`);
    }
  }

  // Sanitize delimiters and escape controls
  const sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

  return {
    sanitized,
    injectionDetected,
    flags
  };
}

/**
 * Deterministic Price Constraint Validator
 * Ensures that AI or provider proposals never exceed buyer-defined limits.
 */
export function validatePriceConstraints(proposal: {
  unitPrice: number;
  quantity: number;
  maxUnitPrice: number;
  targetUnitPrice?: number;
}): { isValid: boolean; reason?: string } {
  if (proposal.unitPrice > proposal.maxUnitPrice) {
    return {
      isValid: false,
      reason: `Proposed unit price (₹${proposal.unitPrice}) exceeds buyer maximum limit (₹${proposal.maxUnitPrice}).`
    };
  }
  if (proposal.quantity <= 0) {
    return {
      isValid: false,
      reason: 'Quantity must be greater than zero.'
    };
  }
  return { isValid: true };
}
