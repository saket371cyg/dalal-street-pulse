import { normalizeIndianSymbol } from '@/lib/utils/indian-market';

/**
 * Common colloquially referenced Indian companies and their canonical NSE symbols
 */
const COMPANY_NAME_MAP: Record<string, string> = {
  'RELIANCE': 'RELIANCE',
  'RELIANCE INDUSTRIES': 'RELIANCE',
  'RIL': 'RELIANCE',
  'JIO': 'RELIANCE',
  'TCS': 'TCS',
  'TATA CONSULTANCY SERVICES': 'TCS',
  'TATA CONSULTANCY': 'TCS',
  'HDFC': 'HDFCBANK',
  'HDFC BANK': 'HDFCBANK',
  'HDFCBANK': 'HDFCBANK',
  'INFOSYS': 'INFY',
  'INFY': 'INFY',
  'ICICI': 'ICICIBANK',
  'ICICI BANK': 'ICICIBANK',
  'ICICIBANK': 'ICICIBANK',
  'SBI': 'SBIN',
  'STATE BANK': 'SBIN',
  'STATE BANK OF INDIA': 'SBIN',
  'SBIN': 'SBIN',
  'AIRTEL': 'BHARTIARTL',
  'BHARTI AIRTEL': 'BHARTIARTL',
  'BHARTIARTL': 'BHARTIARTL',
  'ITC': 'ITC',
  'L&T': 'LT',
  'LARSEN': 'LT',
  'LARSEN & TOUBRO': 'LT',
  'LARSEN AND TOUBRO': 'LT',
  'LT': 'LT',
  'TATA MOTORS': 'TATAMOTORS',
  'TATAMOTORS': 'TATAMOTORS',
  'TAMO': 'TATAMOTORS',
  'KOTAK': 'KOTAKBANK',
  'KOTAK BANK': 'KOTAKBANK',
  'KOTAK MAHINDRA': 'KOTAKBANK',
  'KOTAKBANK': 'KOTAKBANK',
  'AXIS': 'AXISBANK',
  'AXIS BANK': 'AXISBANK',
  'AXISBANK': 'AXISBANK',
  'BAJAJ FINANCE': 'BAJFINANCE',
  'BAJFINANCE': 'BAJFINANCE',
  'MARUTI': 'MARUTI',
  'MARUTI SUZUKI': 'MARUTI',
  'SUN PHARMA': 'SUNPHARMA',
  'SUNPHARMA': 'SUNPHARMA',
  'TITAN': 'TITAN',
  'TITAN COMPANY': 'TITAN',
  'WIPRO': 'WIPRO',
  'HCL': 'HCLTECH',
  'HCL TECH': 'HCLTECH',
  'HCL TECHNOLOGIES': 'HCLTECH',
  'HCLTECH': 'HCLTECH',
  'NTPC': 'NTPC',
  'ONGC': 'ONGC',
  'POWERGRID': 'POWERGRID',
  'POWER GRID': 'POWERGRID',
  'M&M': 'M&M',
  'MAHINDRA': 'M&M',
  'MAHINDRA & MAHINDRA': 'M&M',
  'ASIAN PAINTS': 'ASIANPAINT',
  'ASIANPAINT': 'ASIANPAINT',
  'ULTRATECH': 'ULTRACEMCO',
  'ULTRATECH CEMENT': 'ULTRACEMCO',
  'ULTRACEMCO': 'ULTRACEMCO',
  'NESTLE': 'NESTLEIND',
  'NESTLE INDIA': 'NESTLEIND',
  'NESTLEIND': 'NESTLEIND',
  'TATA STEEL': 'TATASTEEL',
  'TATASTEEL': 'TATASTEEL',
  'COAL INDIA': 'COALINDIA',
  'COALINDIA': 'COALINDIA',
  'ADANI ENTERPRISES': 'ADANIENT',
  'ADANIENT': 'ADANIENT',
  'ADANI PORTS': 'ADANIPORTS',
  'ADANIPORTS': 'ADANIPORTS',
};

export interface ResolvedQueryContext {
  intent: 'COMPARISON' | 'SINGLE_STOCK' | 'GENERAL_MARKET';
  primarySymbol?: string;
  secondarySymbol?: string;
  allSymbols: string[];
  isExplicitComparison: boolean;
  timeframeRequested?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
}

/**
 * Extracts and resolves Indian stock tickers and user intent from free-text queries
 */
export function resolveSecurityContext(
  question: string,
  explicitSymbol?: string
): ResolvedQueryContext {
  const qUpper = question.toUpperCase();
  const cleaned = qUpper.replace(/[^A-Z0-9\s&]/g, ' ');
  const foundSymbols = new Set<string>();

  // If explicit context symbol is provided (e.g. from stock detail page)
  if (explicitSymbol) {
    const { cleanSymbol } = normalizeIndianSymbol(explicitSymbol);
    foundSymbols.add(cleanSymbol);
  }

  // 1. Check for multi-word company names first
  const sortedNames = Object.keys(COMPANY_NAME_MAP).sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    // Word boundary match
    const regex = new RegExp(`\\b${name.replace('&', '\\&')}\\b`, 'i');
    if (regex.test(cleaned)) {
      foundSymbols.add(COMPANY_NAME_MAP[name]);
    }
  }

  // 2. Check individual words against symbol patterns (e.g. RELIANCE, TCS, INFY)
  const tokens = cleaned.split(/\s+/).filter(t => t.length >= 2 && t.length <= 15);
  for (const token of tokens) {
    if (COMPANY_NAME_MAP[token]) {
      foundSymbols.add(COMPANY_NAME_MAP[token]);
    }
  }

  const symbolsList = Array.from(foundSymbols).sort((symA, symB) => {
    const findEarliest = (sym: string) => {
      let earliest = 999999;
      for (const [k, v] of Object.entries(COMPANY_NAME_MAP)) {
        if (v === sym) {
          const idx = cleaned.indexOf(k);
          if (idx !== -1 && idx < earliest) earliest = idx;
        }
      }
      return earliest;
    };
    return findEarliest(symA) - findEarliest(symB);
  });

  // 3. Detect comparison intent
  const comparisonRegex = /\b(vs|versus|compare|compared to|better than|or|and)\b/i;
  const isExplicitComparison = symbolsList.length >= 2 && comparisonRegex.test(question);

  // 4. Detect requested timeframe
  let timeframeRequested: ResolvedQueryContext['timeframeRequested'];
  if (/\b(1\s*day|today|intraday|daily|1d)\b/i.test(question)) timeframeRequested = '1D';
  else if (/\b(1\s*week|weekly|1w)\b/i.test(question)) timeframeRequested = '1W';
  else if (/\b(1\s*month|monthly|1m)\b/i.test(question)) timeframeRequested = '1M';
  else if (/\b(3\s*months?|quarterly|3m)\b/i.test(question)) timeframeRequested = '3M';
  else if (/\b(6\s*months?|half\s*year|6m)\b/i.test(question)) timeframeRequested = '6M';
  else if (/\b(1\s*year|yearly|annual|1y)\b/i.test(question)) timeframeRequested = '1Y';
  else if (/\b(5\s*years?|long\s*term|5y)\b/i.test(question)) timeframeRequested = '5Y';

  let intent: ResolvedQueryContext['intent'] = 'GENERAL_MARKET';
  if (isExplicitComparison || symbolsList.length >= 2) {
    intent = 'COMPARISON';
  } else if (symbolsList.length === 1) {
    intent = 'SINGLE_STOCK';
  }

  return {
    intent,
    primarySymbol: symbolsList[0],
    secondarySymbol: symbolsList[1],
    allSymbols: symbolsList,
    isExplicitComparison,
    timeframeRequested,
  };
}
