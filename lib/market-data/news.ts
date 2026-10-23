import { FinancialNewsItem } from '@/types';
import { VERIFIED_INDIAN_NEWS } from './dataset';

export interface LiveNewsOptions {
  symbol?: string;
  companyName?: string;
  category?: string;
  limit?: number;
}

interface CacheEntry {
  timestamp: number;
  data: FinancialNewsItem[];
}

const newsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const KNOWN_TICKERS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS',
  'SUNPHARMA', 'TITAN', 'BAJFINANCE', 'MARUTI', 'HCLTECH',
  'WIPRO', 'NTPC', 'ONGC', 'POWERGRID', 'ADANIENT',
  'KOTAKBANK', 'AXISBANK', 'ULTRACEMCO', 'ASIANPAINT', 'NESTLEIND'
];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function detectSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  const bullishKeywords = [
    'surge', 'surges', 'rally', 'rallies', 'jump', 'jumps', 'soar', 'soars',
    'gains', 'gain', 'profit rises', 'profit surges', 'record high', 'all-time high',
    'upgrade', 'buy rating', 'outperform', 'beats estimates', 'strong growth',
    'upbeat', 'bullish', 'climbs', 'climb', 'advances'
  ];
  const bearishKeywords = [
    'fall', 'falls', 'plunge', 'plunges', 'drop', 'drops', 'crash', 'crashes',
    'slip', 'slips', 'decline', 'declines', 'profit drops', 'loss widens',
    'downgrade', 'sell rating', 'underperform', 'misses estimates', 'slump',
    'bearish', 'dives', 'tumbles', 'tumble', 'retreats'
  ];

  const hasBullish = bullishKeywords.some(kw => lower.includes(kw));
  const hasBearish = bearishKeywords.some(kw => lower.includes(kw));

  if (hasBullish && !hasBearish) return 'bullish';
  if (hasBearish && !hasBullish) return 'bearish';
  return 'neutral';
}

function detectCategory(
  text: string,
  preferredCategory?: string
): 'Macro' | 'Earnings' | 'Policy' | 'Corporate' | 'Banking' {
  if (
    preferredCategory &&
    ['Macro', 'Earnings', 'Policy', 'Corporate', 'Banking'].includes(preferredCategory)
  ) {
    return preferredCategory as any;
  }

  const lower = text.toLowerCase();
  if (/rbi|sebi|repo rate|monetary policy|inflation|finance ministry|budget|tax|circular/i.test(lower)) {
    return 'Policy';
  }
  if (/q[1-4]|quarterly|results|profit|revenue|ebitda|earnings|net profit/i.test(lower)) {
    return 'Earnings';
  }
  if (/bank|lending|npa|credit growth|deposit|psu bank|private bank/i.test(lower)) {
    return 'Banking';
  }
  if (/gdp|rupee|dollar|forex|crude|oil prices|fii|dii|trade deficit|economy/i.test(lower)) {
    return 'Macro';
  }
  return 'Corporate';
}

function detectRelatedSymbols(text: string, currentSymbol?: string): string[] {
  const symbols = new Set<string>();
  if (currentSymbol) {
    symbols.add(currentSymbol);
  }

  const upper = text.toUpperCase();
  for (const ticker of KNOWN_TICKERS) {
    if (upper.includes(ticker)) {
      symbols.add(ticker);
    }
  }

  return Array.from(symbols).slice(0, 4);
}

/**
 * Fetches live Indian financial news from Google News RSS (India edition)
 * Covers Economic Times, Livemint, Moneycontrol, Business Standard, NDTV Profit, etc.
 */
export async function fetchLiveIndianFinancialNews(
  options: LiveNewsOptions = {}
): Promise<FinancialNewsItem[]> {
  const { symbol, companyName, category, limit = 25 } = options;

  let query = '';
  if (symbol) {
    const term = companyName ? `"${companyName}" OR "${symbol}"` : `"${symbol}"`;
    query = `${term} (share price OR stock market OR quarterly OR earnings)`;
  } else if (category && category !== 'ALL') {
    switch (category) {
      case 'Policy':
        query = 'RBI OR SEBI OR "repo rate" OR "monetary policy" OR "finance ministry" India';
        break;
      case 'Earnings':
        query = '"quarterly results" OR "earnings" OR "Q2 results" OR "Q3 results" OR "net profit" NSE BSE';
        break;
      case 'Macro':
        query = 'GDP OR inflation OR rupee OR "crude oil" OR "FII flows" Indian economy';
        break;
      case 'Banking':
        query = '"banking sector" OR "credit growth" OR "HDFC Bank" OR "SBI" OR "ICICI Bank" RBI';
        break;
      case 'Corporate':
        query = 'Indian corporate OR "merger" OR "acquisition" OR "order win" NSE BSE';
        break;
      default:
        query = 'NSE OR BSE OR NIFTY OR SENSEX OR "Indian stock market"';
    }
  } else {
    query = 'NSE OR BSE OR NIFTY OR SENSEX OR "Indian stock market" OR RBI OR SEBI';
  }

  const cacheKey = `${query}_${limit}`;
  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Google News RSS returned HTTP status ${res.status}`);
    }

    const xml = await res.text();
    const rawItems = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    if (rawItems.length === 0) {
      throw new Error('No news items found in RSS response');
    }

    const parsedItems: FinancialNewsItem[] = [];

    const getXmlTag = (itemXml: string, tag: string): string => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      if (!match) return '';
      return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    };

    for (let i = 0; i < rawItems.length && parsedItems.length < limit; i++) {
      const itemXml = rawItems[i];
      let rawTitle = decodeHtmlEntities(getXmlTag(itemXml, 'title'));
      const link = getXmlTag(itemXml, 'link');
      const pubDateRaw = getXmlTag(itemXml, 'pubDate');
      let source = decodeHtmlEntities(getXmlTag(itemXml, 'source')) || 'Financial Media';

      // Clean publisher from title if suffix exists: "Headline - Source"
      const dashIdx = rawTitle.lastIndexOf(' - ');
      if (dashIdx > 0 && dashIdx >= rawTitle.length - 40) {
        if (!source || source === 'Financial Media') {
          source = rawTitle.substring(dashIdx + 3).trim();
        }
        rawTitle = rawTitle.substring(0, dashIdx).trim();
      }

      const descriptionRaw = decodeHtmlEntities(getXmlTag(itemXml, 'description'));
      const summary = descriptionRaw.length > 20 ? descriptionRaw : rawTitle;

      let publishedAtFormatted = new Date().toISOString();
      if (pubDateRaw) {
        const d = new Date(pubDateRaw);
        if (!isNaN(d.getTime())) {
          publishedAtFormatted = d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short',
          });
        }
      }

      parsedItems.push({
        id: `news_${i}_${Math.random().toString(36).substring(2, 7)}`,
        title: rawTitle,
        summary,
        source: source || 'Indian Financial News',
        sourceUrl: link || 'https://news.google.com',
        publishedAt: publishedAtFormatted,
        sentiment: detectSentiment(`${rawTitle} ${summary}`),
        relatedSymbols: detectRelatedSymbols(`${rawTitle} ${summary}`, symbol),
        category: detectCategory(`${rawTitle} ${summary}`, category !== 'ALL' ? category : undefined),
      });
    }

    if (parsedItems.length > 0) {
      newsCache.set(cacheKey, { timestamp: Date.now(), data: parsedItems });
      return parsedItems;
    }
  } catch (error) {
    console.warn(`[LiveNews] Failed to fetch live news for query "${query}":`, error);
  }

  // Graceful fallback to verified Indian news dataset
  let fallback = [...VERIFIED_INDIAN_NEWS];
  if (symbol) {
    fallback = fallback.filter(n => n.relatedSymbols.includes(symbol));
    if (fallback.length === 0) fallback = VERIFIED_INDIAN_NEWS.slice(0, 3);
  } else if (category && category !== 'ALL') {
    const catFiltered = fallback.filter(n => n.category === category);
    if (catFiltered.length > 0) fallback = catFiltered;
  }

  return fallback.slice(0, limit);
}

/**
 * Backward compatibility alias
 */
export async function fetchLiveNews(symbol?: string): Promise<FinancialNewsItem[]> {
  return fetchLiveIndianFinancialNews({ symbol });
}
