import { MarketProductResult } from '@/lib/types';

interface CacheEntry {
  timestamp: number;
  data: {
    results: MarketProductResult[];
    top5: MarketProductResult[];
    total: number;
    location: string;
    query: string;
  };
}

// In-memory cache for market search queries (TTL: 30 minutes)
const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCacheKey(query: string, location: string): string {
  return `${query.toLowerCase().trim()}:::${location.toLowerCase().trim()}`;
}

export async function searchMarketProducts(params: {
  query: string;
  location?: string;
  budget?: number;
}): Promise<{
  success: boolean;
  query: string;
  location: string;
  total: number;
  top5: MarketProductResult[];
  results: MarketProductResult[];
  fromCache?: boolean;
  error?: string;
  message?: string;
}> {
  const query = (params.query || '').trim();
  if (!query || query.length < 2) {
    return {
      success: false,
      query,
      location: params.location || 'Chennai, Tamil Nadu, India',
      total: 0,
      top5: [],
      results: [],
      error: 'Query too short',
      message: 'Please enter a search query with at least 2 characters.'
    };
  }

  const location = params.location?.trim() || 'Chennai, Tamil Nadu, India';
  const cacheKey = getCacheKey(query, location);

  // Check cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      success: true,
      query,
      location,
      total: cached.data.total,
      top5: cached.data.top5,
      results: cached.data.results,
      fromCache: true
    };
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      query,
      location,
      total: 0,
      top5: [],
      results: [],
      error: 'MISSING_API_KEY',
      message: 'SERPAPI_API_KEY is not configured on the server. Market discovery requires a valid API key.'
    };
  }

  try {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', query);
    url.searchParams.set('gl', 'in');
    url.searchParams.set('hl', 'en');
    url.searchParams.set('location', location);
    url.searchParams.set('device', 'desktop');
    url.searchParams.set('api_key', apiKey);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          query,
          location,
          total: 0,
          top5: [],
          results: [],
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'SerpApi rate limit exceeded. Please wait a moment and try again.'
        };
      }
      return {
        success: false,
        query,
        location,
        total: 0,
        top5: [],
        results: [],
        error: 'API_ERROR',
        message: `Market search provider responded with status ${response.status}.`
      };
    }

    const rawData = await response.json();

    if (rawData.error) {
      return {
        success: false,
        query,
        location,
        total: 0,
        top5: [],
        results: [],
        error: 'PROVIDER_ERROR',
        message: 'Search provider returned an error while querying market listings.'
      };
    }

    // Merge shopping_results and inline_shopping_results
    const rawItems: any[] = [];
    if (Array.isArray(rawData.shopping_results)) {
      rawItems.push(...rawData.shopping_results);
    }
    if (Array.isArray(rawData.inline_shopping_results)) {
      rawItems.push(...rawData.inline_shopping_results);
    }

    if (rawItems.length === 0) {
      return {
        success: true,
        query,
        location,
        total: 0,
        top5: [],
        results: [],
        message: `No Google Shopping market results found for "${query}" in ${location}.`
      };
    }

    const nowIso = new Date().toISOString();

    const normalizedResults: MarketProductResult[] = rawItems.map((item, index) => {
      const merchantName = item.source || item.merchant || item.seller || 'Google Shopping Merchant';
      const productId = item.product_id || item.id || `item_${index}`;
      const id = `serpapi:${productId}:${merchantName.replace(/\s+/g, '_').toLowerCase()}`;

      // Extract numeric price
      let observedPrice = 0;
      if (typeof item.extracted_price === 'number') {
        observedPrice = item.extracted_price;
      } else if (typeof item.price === 'string') {
        const cleaned = item.price.replace(/[^0-9.]/g, '');
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) observedPrice = parsed;
      }

      const observedPriceText = item.price || (observedPrice > 0 ? `₹${observedPrice.toLocaleString('en-IN')}` : 'Price unlisted');
      const rating = typeof item.rating === 'number' ? item.rating : 4.4;
      const reviews = typeof item.reviews === 'number' ? item.reviews : 0;
      const deliveryText = item.delivery || item.shipping || 'Standard delivery';

      // Estimate delivery days from delivery text
      let deliveryDays = 5;
      if (deliveryText.toLowerCase().includes('next day') || deliveryText.toLowerCase().includes('1-day')) {
        deliveryDays = 1;
      } else if (deliveryText.toLowerCase().includes('2-day') || deliveryText.toLowerCase().includes('2 day')) {
        deliveryDays = 2;
      } else if (deliveryText.toLowerCase().includes('3-day') || deliveryText.toLowerCase().includes('3 day')) {
        deliveryDays = 3;
      }

      // Calculate calculated reliability indicator (derived from merchant presence and ratings)
      const reliabilityScore = Math.min(98, Math.max(82, Math.round(rating * 18 + (reviews > 10 ? 8 : 2))));

      return {
        id,
        source: 'google_shopping_serpapi',
        sourceLabel: 'Google Shopping',
        productId,
        title: item.title || query,
        merchantName,
        observedPriceText,
        observedPrice,
        currency: 'INR',
        thumbnailUrl: item.thumbnail || item.thumbnail_url || item.image || '',
        productUrl: item.link || item.product_link || '',
        deliveryText,
        deliveryDays,
        rating,
        reviewCount: reviews,
        multipleSources: Boolean(item.multiple_sources || item.merchants_count > 1),
        availability: 'unverified',
        lastObservedAt: nowIso,
        contact: {
          status: 'not_available',
          phone: null
        },
        why: `Market discovery listing observed on Google Shopping from ${merchantName}.`,
        reliability: reliabilityScore
      };
    });

    // Rank results (favor reasonable price & high rating/reliability)
    const ranked = [...normalizedResults].sort((a, b) => {
      // Prioritize items with valid price
      if (a.observedPrice > 0 && b.observedPrice === 0) return -1;
      if (b.observedPrice > 0 && a.observedPrice === 0) return 1;

      // Score = (1 / price) * 0.5 + (rating / 5) * 0.5
      const scoreA = (a.observedPrice > 0 ? 1000 / a.observedPrice : 0) * 0.4 + (a.rating || 4) * 0.6;
      const scoreB = (b.observedPrice > 0 ? 1000 / b.observedPrice : 0) * 0.4 + (b.rating || 4) * 0.6;
      return scoreB - scoreA;
    });

    const top5 = ranked.slice(0, 5);

    // Cache successful search
    searchCache.set(cacheKey, {
      timestamp: Date.now(),
      data: {
        results: ranked,
        top5,
        total: ranked.length,
        location,
        query
      }
    });

    return {
      success: true,
      query,
      location,
      total: ranked.length,
      top5,
      results: ranked
    };
  } catch (error: any) {
    return {
      success: false,
      query,
      location,
      total: 0,
      top5: [],
      results: [],
      error: 'NETWORK_ERROR',
      message: 'Failed to contact market search provider. Please check network connection.'
    };
  }
}
