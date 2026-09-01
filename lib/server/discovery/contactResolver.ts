import * as cheerio from 'cheerio';
import { extractDomain, isRestrictedPlatform } from './classification';

export interface ContactResolutionResult {
  supplierId: string;
  domain: string | null;
  email: string | null;
  phone: string | null;
  status: 'verified' | 'unverified' | 'unavailable';
  source: 'official_site' | 'hunter' | 'manual' | 'marketplace_inquiry' | null;
  evidenceUrl: string | null;
  evidenceSnippet?: string;
  notes: string[];
}

const GENERIC_PREFIXES = ['sales', 'rfq', 'procurement', 'purchase', 'enquiries', 'enquiry', 'info', 'contact', 'support', 'orders'];
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export async function resolveSupplierContact(params: {
  supplierId: string;
  officialWebsiteUrl?: string | null;
  manualEmail?: string | null;
  manualPhone?: string | null;
}): Promise<ContactResolutionResult> {
  const notes: string[] = [];

  // Priority 1: Manual Buyer-Confirmed Email
  if (params.manualEmail && params.manualEmail.includes('@')) {
    const cleanEmail = params.manualEmail.trim().toLowerCase();
    notes.push('Supplier email manually entered and verified by buyer.');
    return {
      supplierId: params.supplierId,
      domain: extractDomain(cleanEmail.split('@')[1]),
      email: cleanEmail,
      phone: params.manualPhone || null,
      status: 'verified',
      source: 'manual',
      evidenceUrl: null,
      notes
    };
  }

  const url = params.officialWebsiteUrl?.trim();
  if (!url) {
    notes.push('No official website available for contact scraping.');
    return {
      supplierId: params.supplierId,
      domain: null,
      email: null,
      phone: params.manualPhone || null,
      status: 'unavailable',
      source: null,
      evidenceUrl: null,
      notes
    };
  }

  const domain = extractDomain(url);

  // Safety guard: Never scrape or run Hunter on marketplaces or directory platforms
  if (isRestrictedPlatform(domain)) {
    notes.push(`Restricted marketplace domain ${domain}. Automatic email resolution blocked.`);
    return {
      supplierId: params.supplierId,
      domain,
      email: null,
      phone: params.manualPhone || null,
      status: 'unavailable',
      source: null,
      evidenceUrl: null,
      notes
    };
  }

  const baseUrl = url.startsWith('http') ? url : `https://${url}`;
  const pagesToTest = [
    baseUrl,
    `${baseUrl.replace(/\/+$/, '')}/contact`,
    `${baseUrl.replace(/\/+$/, '')}/contact-us`,
    `${baseUrl.replace(/\/+$/, '')}/about`,
    `${baseUrl.replace(/\/+$/, '')}/rfq`,
    `${baseUrl.replace(/\/+$/, '')}/request-quote`
  ];

  const foundEmails: Array<{ email: string; evidenceUrl: string; isGeneric: boolean }> = [];

  // Crawl public pages with timeout
  for (const pageUrl of pagesToTest) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(pageUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Procura-Procurement-Bot/1.0',
          'Accept': 'text/html,application/xhtml+xml'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const html = await resp.text();
        const $ = cheerio.load(html);

        // Check mailto: links
        $('a[href^="mailto:"]').each((_, el) => {
          const href = $(el).attr('href') || '';
          const mailtoMatch = href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
          if (mailtoMatch.includes('@') && !mailtoMatch.endsWith('.png') && !mailtoMatch.endsWith('.jpg')) {
            const prefix = mailtoMatch.split('@')[0];
            foundEmails.push({
              email: mailtoMatch,
              evidenceUrl: pageUrl,
              isGeneric: GENERIC_PREFIXES.includes(prefix)
            });
          }
        });

        // Regex check in visible text
        const bodyText = $('body').text();
        const matches = bodyText.match(EMAIL_REGEX) || [];
        for (const match of matches) {
          const clean = match.toLowerCase();
          if (!clean.endsWith('.png') && !clean.endsWith('.jpg') && !clean.includes('example.com') && !clean.includes('wixpress.com')) {
            const prefix = clean.split('@')[0];
            foundEmails.push({
              email: clean,
              evidenceUrl: pageUrl,
              isGeneric: GENERIC_PREFIXES.includes(prefix)
            });
          }
        }

        if (foundEmails.length > 0) {
          break; // Found emails on first successful page
        }
      }
    } catch (_) {
      // Ignore network timeout or 404s on subpages
    }
  }

  // Pick best public email (prefer sales@, rfq@, info@)
  if (foundEmails.length > 0) {
    foundEmails.sort((a, b) => (b.isGeneric ? 1 : 0) - (a.isGeneric ? 1 : 0));
    const best = foundEmails[0];
    notes.push(`Public verified business email extracted from official website (${best.evidenceUrl}).`);
    return {
      supplierId: params.supplierId,
      domain,
      email: best.email,
      phone: params.manualPhone || null,
      status: 'verified',
      source: 'official_site',
      evidenceUrl: best.evidenceUrl,
      notes
    };
  }

  // Priority 2: Hunter API Domain Search (Only for supplier-owned domains)
  const hunterKey = process.env.HUNTER_API_KEY;
  if (hunterKey && domain && !isRestrictedPlatform(domain)) {
    try {
      const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}`;
      const hunterResp = await fetch(hunterUrl, { method: 'GET', headers: { Accept: 'application/json' } });
      if (hunterResp.ok) {
        const data = await hunterResp.json();
        const emails = data?.data?.emails;
        if (Array.isArray(emails) && emails.length > 0) {
          const firstEmail = emails[0].value;
          notes.push(`Verified domain email resolved via Hunter.io API (${domain}).`);
          return {
            supplierId: params.supplierId,
            domain,
            email: firstEmail.toLowerCase(),
            phone: params.manualPhone || null,
            status: 'verified',
            source: 'hunter',
            evidenceUrl: `https://${domain}`,
            notes
          };
        }
      }
    } catch (_) {}
  }

  notes.push('No public verified email found on supplier domain. Manual confirmation required before negotiation.');
  return {
    supplierId: params.supplierId,
    domain,
    email: null,
    phone: params.manualPhone || null,
    status: 'unverified',
    source: null,
    evidenceUrl: null,
    notes
  };
}
