export type DomainClassification =
  | 'direct_supplier'
  | 'manufacturer'
  | 'distributor'
  | 'wholesaler'
  | 'retailer'
  | 'marketplace_b2b'
  | 'marketplace_retail'
  | 'marketplace_seller'
  | 'directory_listing'
  | 'social_profile'
  | 'service_business'
  | 'irrelevant'
  | 'unknown';

export type WebsiteType =
  | 'official_website'
  | 'marketplace_listing'
  | 'b2b_listing'
  | 'directory_listing'
  | 'social_profile'
  | 'product_listing'
  | 'unknown';

// Known domains registry
const B2B_MARKETPLACES = new Set([
  'indiamart.com',
  'tradeindia.com',
  'alibaba.com',
  'exportersindia.com',
  'globalsources.com',
  'made-in-china.com',
  'b2bfreeads.com',
  'ec21.com',
  'fibre2fashion.com',
  'industrybuying.com',
  'moglix.com',
  'udaan.com'
]);

const RETAIL_MARKETPLACES = new Set([
  'amazon.in',
  'amazon.com',
  'flipkart.com',
  'meesho.com',
  'jiomart.com',
  'snapdeal.com',
  'myntra.com',
  'tatacliq.com',
  'nykaa.com',
  'ebay.com',
  'croma.com',
  'reliancedigital.in',
  'pepperfry.com',
  'urbanladder.com',
  'firstcry.com'
]);

const DIRECTORIES = new Set([
  'justdial.com',
  'sulekha.com',
  'yellowpages.in',
  'indialistings.com',
  'asklaila.com',
  'yelp.com',
  'tradekey.com',
  'business-standard.com',
  'zaubacorp.com',
  'tofler.in',
  'fundoodata.com',
  'zoominfo.com'
]);

const SOCIAL_PLATFORMS = new Set([
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'pinterest.com',
  'reddit.com',
  'quora.com',
  'tiktok.com'
]);

export function extractDomain(urlOrHost: string): string {
  if (!urlOrHost) return '';
  let cleaned = urlOrHost.trim().toLowerCase();
  try {
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned;
    }
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (_) {
    // Fallback regex if URL parsing fails
    const match = cleaned.match(/^(?:https?:\/\/)?(?:www\.)?([^\/\?#:]+)/i);
    return match ? match[1].toLowerCase() : cleaned;
  }
}

export function classifyDomain(urlOrHost: string): DomainClassification {
  const domain = extractDomain(urlOrHost);
  if (!domain) return 'unknown';

  for (const b2b of B2B_MARKETPLACES) {
    if (domain === b2b || domain.endsWith('.' + b2b)) {
      return 'marketplace_b2b';
    }
  }

  for (const retail of RETAIL_MARKETPLACES) {
    if (domain === retail || domain.endsWith('.' + retail)) {
      return 'marketplace_retail';
    }
  }

  for (const dir of DIRECTORIES) {
    if (domain === dir || domain.endsWith('.' + dir)) {
      return 'directory_listing';
    }
  }

  for (const social of SOCIAL_PLATFORMS) {
    if (domain === social || domain.endsWith('.' + social)) {
      return 'social_profile';
    }
  }

  return 'direct_supplier';
}

export function classifyWebsiteType(url: string): WebsiteType {
  const classification = classifyDomain(url);
  switch (classification) {
    case 'marketplace_b2b':
      return 'b2b_listing';
    case 'marketplace_retail':
      return 'marketplace_listing';
    case 'directory_listing':
      return 'directory_listing';
    case 'social_profile':
      return 'social_profile';
    case 'direct_supplier':
    case 'manufacturer':
    case 'distributor':
    case 'wholesaler':
      return 'official_website';
    default:
      return 'unknown';
  }
}

export function isRestrictedPlatform(urlOrHost: string): boolean {
  const classification = classifyDomain(urlOrHost);
  return (
    classification === 'marketplace_b2b' ||
    classification === 'marketplace_retail' ||
    classification === 'directory_listing' ||
    classification === 'social_profile'
  );
}
