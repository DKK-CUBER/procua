import { classifyDomain, extractDomain, isRestrictedPlatform } from './classification';

export interface WebsiteConfidenceResult {
  url: string | null;
  domain: string | null;
  confidence: number;
  isOfficialWebsite: boolean;
  scoreBreakdown: {
    businessNameMatch: number; // Max 0.40
    locationMatch: number;     // Max 0.20
    productMatch: number;      // Max 0.20
    domainMatch: number;       // Max 0.20
  };
  reasons: string[];
}

export function calculateWebsiteConfidence(params: {
  candidateUrl?: string | null;
  businessName: string;
  city?: string;
  state?: string;
  productKeyword?: string;
  pageSnippetOrTitle?: string;
}): WebsiteConfidenceResult {
  const candidateUrl = params.candidateUrl?.trim() || null;
  if (!candidateUrl) {
    return {
      url: null,
      domain: null,
      confidence: 0,
      isOfficialWebsite: false,
      scoreBreakdown: {
        businessNameMatch: 0,
        locationMatch: 0,
        productMatch: 0,
        domainMatch: 0
      },
      reasons: ['No website URL candidate provided']
    };
  }

  const domain = extractDomain(candidateUrl);
  const reasons: string[] = [];

  // Check 1: Restricted platform check (Hard rule)
  if (isRestrictedPlatform(domain)) {
    reasons.push(`Domain ${domain} is classified as a marketplace or directory platform and cannot be an official website.`);
    return {
      url: candidateUrl,
      domain,
      confidence: 0,
      isOfficialWebsite: false,
      scoreBreakdown: {
        businessNameMatch: 0,
        locationMatch: 0,
        productMatch: 0,
        domainMatch: 0
      },
      reasons
    };
  }

  const normalizedBizName = (params.businessName || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
  const bizTokens = normalizedBizName.split(/\s+/).filter((t) => t.length > 2);

  const normalizedDomain = domain
    .replace(/\.[a-z]{2,}$/i, '')
    .replace(/[^a-z0-9]/g, ' ')
    .toLowerCase();

  const snippet = (params.pageSnippetOrTitle || '').toLowerCase();
  const city = (params.city || '').toLowerCase().trim();
  const state = (params.state || '').toLowerCase().trim();
  const product = (params.productKeyword || '').toLowerCase().trim();
  const productTokens = product.split(/\s+/).filter((t) => t.length > 2);

  let businessNameMatch = 0;
  let locationMatch = 0;
  let productMatch = 0;
  let domainMatch = 0;

  // 1. Business Name Match (Weight: 40%)
  if (bizTokens.length > 0) {
    const matchedTokens = bizTokens.filter((t) => snippet.includes(t) || normalizedDomain.includes(t));
    const matchRatio = matchedTokens.length / bizTokens.length;
    if (snippet.includes(normalizedBizName)) {
      businessNameMatch = 0.40;
      reasons.push('Exact business name matched on source snippet/page title (+40%).');
    } else if (matchRatio >= 0.75) {
      businessNameMatch = 0.35;
      reasons.push(`Strong business name tokens matched (${Math.round(matchRatio * 100)}%) (+35%).`);
    } else if (matchRatio >= 0.5) {
      businessNameMatch = 0.20;
      reasons.push(`Partial business name tokens matched (+20%).`);
    }
  }

  // 2. Domain / Company Name Match (Weight: 20%)
  if (bizTokens.length > 0) {
    const domainTokenMatch = bizTokens.filter((t) => normalizedDomain.includes(t));
    if (normalizedDomain.includes(normalizedBizName.replace(/\s+/g, ''))) {
      domainMatch = 0.20;
      reasons.push('Domain matches full company name (+20%).');
    } else if (domainTokenMatch.length > 0) {
      domainMatch = Math.min(0.20, (domainTokenMatch.length / bizTokens.length) * 0.20);
      reasons.push('Domain contains core business name keywords (+15%).');
    }
  }

  // 3. Location Match (Weight: 20%)
  if (city && (snippet.includes(city) || candidateUrl.toLowerCase().includes(city))) {
    locationMatch = 0.20;
    reasons.push(`Target city "${city}" confirmed on website evidence (+20%).`);
  } else if (state && (snippet.includes(state) || candidateUrl.toLowerCase().includes(state))) {
    locationMatch = 0.15;
    reasons.push(`Target state "${state}" confirmed on website evidence (+15%).`);
  } else if (candidateUrl.endsWith('.in') || snippet.includes('india')) {
    locationMatch = 0.10;
    reasons.push('India country domain / presence confirmed (+10%).');
  }

  // 4. Product / Category Match (Weight: 20%)
  if (productTokens.length > 0) {
    const matchedProd = productTokens.filter((p) => snippet.includes(p) || candidateUrl.toLowerCase().includes(p));
    const prodRatio = matchedProd.length / productTokens.length;
    if (prodRatio >= 0.75) {
      productMatch = 0.20;
      reasons.push('Product specifications and category strongly matched (+20%).');
    } else if (prodRatio >= 0.4) {
      productMatch = 0.12;
      reasons.push('Partial product category alignment (+12%).');
    }
  }

  const rawConfidence = businessNameMatch + locationMatch + productMatch + domainMatch;
  const confidence = Math.round(rawConfidence * 100) / 100;
  const isOfficialWebsite = confidence >= 0.90 && !isRestrictedPlatform(domain);

  if (isOfficialWebsite) {
    reasons.push('Verified as official direct supplier website (Confidence >= 0.90).');
  } else {
    reasons.push(`Confidence is ${Math.round(confidence * 100)}% (<90% threshold for official verification).`);
  }

  return {
    url: candidateUrl,
    domain,
    confidence,
    isOfficialWebsite,
    scoreBreakdown: {
      businessNameMatch,
      locationMatch,
      productMatch,
      domainMatch
    },
    reasons
  };
}
