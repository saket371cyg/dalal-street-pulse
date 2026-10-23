import {
  StockQuote,
  CompanyFundamentals,
  MarketIndex,
  OHLCVCandle,
  FinancialNewsItem,
  Exchange,
  InstrumentCoverageStatus,
  StockSearchResult,
  CorporateAction,
  FinancialStatementRecord,
  DataFreshness,
} from '@/types';
import {
  VERIFIED_INDIAN_STOCKS,
} from './dataset';
import { normalizeIndianSymbol } from '@/lib/utils/indian-market';
import {
  searchUniverseInstruments,
  getInstrumentBySymbol,
  resolveSymbolAlias,
  getCorporateActions as dbGetCorporateActions,
  getFinancialStatements as dbGetFinancialStatements,
} from '@/lib/db/store';
import { getMarketDataProvider } from './providers';
import { runSecurityMasterIngestion } from './ingestion';
import { fetchLiveIndianFinancialNews } from './news';

let universeSeeded = false;

async function ensureInitialUniverseSeeded() {
  if (universeSeeded) return;
  const existing = await searchUniverseInstruments({ limit: 1 });
  if (existing.totalCount === 0) {
    try {
      await runSecurityMasterIngestion();
    } catch (e) {
      console.warn('Initial universe seed warning:', e);
    }
  }
  universeSeeded = true;
}

/**
 * Get all major Indian market benchmark and sectoral indices
 */
export async function getMarketIndices(): Promise<MarketIndex[]> {
  const provider = getMarketDataProvider();
  return await provider.getIndices();
}

/**
 * Search Indian listed stocks across NSE & BSE
 */
export async function searchIndianStocks(
  query: string,
  filter?: {
    exchange?: Exchange | 'ALL';
    sector?: string;
    marketCapCategory?: 'ALL' | 'LARGE' | 'MID' | 'SMALL';
  }
): Promise<StockQuote[]> {
  const result = await searchUniverseStockCatalog({
    query,
    exchange: filter?.exchange,
    sector: filter?.sector,
    marketCapCategory: filter?.marketCapCategory,
    limit: 50,
  });

  return result.stocks;
}

/**
 * Full Global Search across the complete imported Indian stock universe
 * Supports company names, NSE symbols, BSE symbols, ISINs, SME platform,
 * symbol alias resolution, and pagination.
 */
export async function searchUniverseStockCatalog(options: {
  query?: string;
  exchange?: Exchange | 'ALL';
  segment?: 'ALL' | 'MAIN' | 'SME';
  sector?: string;
  marketCapCategory?: 'ALL' | 'LARGE' | 'MID' | 'SMALL';
  page?: number;
  limit?: number;
}): Promise<StockSearchResult> {
  await ensureInitialUniverseSeeded();

  const q = (options.query || '').trim().toUpperCase();
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));

  // 1. Check if user searched for an old historical symbol alias
  let aliasRedirect: StockSearchResult['aliasRedirect'];
  if (q) {
    const alias = await resolveSymbolAlias(q);
    if (alias) {
      aliasRedirect = {
        searchedSymbol: q,
        currentSymbol: alias.newSymbol,
        effectiveDate: alias.changeDate,
      };
    }
  }

  // 2. Query the indexed universe store
  const universeRes = await searchUniverseInstruments({
    query: aliasRedirect ? aliasRedirect.currentSymbol : q,
    exchange: options.exchange,
    segment: options.segment,
    sector: options.sector,
    page,
    limit,
  });

  const provider = getMarketDataProvider();

  // 3. Map instruments into enriched StockQuote with coverage and ISIN identifiers
  const stocks: (StockQuote & {
    isin?: string;
    bseCode?: string;
    isSME?: boolean;
    coverage?: InstrumentCoverageStatus;
  })[] = await Promise.all(
    universeRes.instruments.map(async inst => {
      const primarySymbol = inst.nseSymbol || inst.bseScripId || inst.bseCode || inst.isin;
      const quote = await provider.getQuote(primarySymbol, inst.exchanges[0]);

      return {
        ...(quote || {
          symbol: primarySymbol,
          exchange: inst.exchanges[0],
          companyName: inst.companyName,
          currentPrice: 0,
          change: 0,
          percentChange: 0,
          open: 0,
          high: 0,
          low: 0,
          previousClose: 0,
          volume: 0,
          week52High: 0,
          week52Low: 0,
          marketCapCrores: 0,
          lastUpdated: inst.lastSyncAt || new Date().toISOString(),
          freshness: 'unavailable' as DataFreshness,
        }),
        isin: inst.isin,
        bseCode: inst.bseCode,
        isSME: inst.isSME,
        coverage: inst.coverage,
      };
    })
  );

  // 4. Fallback: If no stocks found in local catalog but query exists, try live Yahoo lookup
  if (stocks.length === 0 && q) {
    try {
      const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        const seenSymbols = new Set<string>();
        const rawFound = (data.quotes || [])
          .filter((x: any) => x.exchange === "NSI" || x.exchange === "BSE" || x.symbol.endsWith(".NS") || x.symbol.endsWith(".BO"))
          .map((x: any) => {
            const clean = x.symbol.replace(/\.(NS|BO)$/, "");
            return {
              symbol: clean,
              companyName: x.shortname || x.longname || clean,
              exchange: (x.symbol.endsWith(".BO") || x.exchange === "BSE" ? "BSE" : "NSE") as Exchange,
              currentPrice: 0,
              change: 0,
              percentChange: 0,
              open: 0,
              high: 0,
              low: 0,
              previousClose: 0,
              volume: 0,
              week52High: 0,
              week52Low: 0,
              marketCapCrores: 0,
              lastUpdated: new Date().toISOString(),
              freshness: "unavailable" as DataFreshness,
              coverage: { quotes: true, historicalOHLCV: true, fundamentals: false, financialStatements: false, corporateActions: false, news: false },
            };
          })
          .filter((item: any) => {
            if (seenSymbols.has(item.symbol)) return false;
            seenSymbols.add(item.symbol);
            return true;
          });

        // Enrich the top results with real quotes from provider
        const enriched = await Promise.all(
          rawFound.slice(0, 6).map(async (item: any) => {
            try {
              const liveQuote = await provider.getQuote(item.symbol, item.exchange);
              if (liveQuote && liveQuote.currentPrice > 0) {
                return {
                  ...item,
                  ...liveQuote,
                  companyName: liveQuote.companyName || item.companyName,
                };
              }
            } catch {}
            return item;
          })
        );

        const finalFound = [...enriched, ...rawFound.slice(6)];

        return {
          count: finalFound.length,
          totalCount: finalFound.length,
          page: 1,
          totalPages: 1,
          stocks: finalFound,
          aliasRedirect,
        };
      }
    } catch {}
  }

  return {
    count: stocks.length,
    totalCount: universeRes.totalCount,
    page: universeRes.page,
    totalPages: universeRes.totalPages,
    stocks,
    aliasRedirect,
  };
}

/**
 * Get real-time / delayed quote for an Indian stock
 */
export async function getStockQuote(rawSymbol: string, exchange?: Exchange): Promise<StockQuote | null> {
  const { cleanSymbol } = normalizeIndianSymbol(rawSymbol);

  // Check alias redirect first
  const alias = await resolveSymbolAlias(cleanSymbol);
  const targetSymbol = alias ? alias.newSymbol : cleanSymbol;

  const provider = getMarketDataProvider();
  const quote = await provider.getQuote(targetSymbol, exchange);
  if (quote) return quote;

  // Check verified seed fallback
  const record = VERIFIED_INDIAN_STOCKS[targetSymbol];
  return record ? record.quote : null;
}

/**
 * Get company fundamentals, ratios, shareholding, and quarterly reports
 */
export async function getStockFundamentals(rawSymbol: string): Promise<CompanyFundamentals | null> {
  const { cleanSymbol } = normalizeIndianSymbol(rawSymbol);

  const alias = await resolveSymbolAlias(cleanSymbol);
  const targetSymbol = alias ? alias.newSymbol : cleanSymbol;

  const provider = getMarketDataProvider();
  const fundamentals = await provider.getFundamentals(targetSymbol);
  if (fundamentals) return fundamentals;

  const record = VERIFIED_INDIAN_STOCKS[targetSymbol];
  return record ? record.fundamentals : null;
}

/**
 * Generate accurate historical OHLCV candles for Indian market timeframes
 */
export async function getHistoricalOHLCV(
  rawSymbol: string,
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' = '1M',
  exchange?: Exchange
): Promise<OHLCVCandle[]> {
  const { cleanSymbol } = normalizeIndianSymbol(rawSymbol);
  const provider = getMarketDataProvider();
  return await provider.getHistoricalOHLCV(cleanSymbol, timeframe, exchange);
}

/**
 * Get verified Indian financial news, optionally filtered by symbol or category
 */
export async function getIndianFinancialNews(symbol?: string): Promise<FinancialNewsItem[]> {
  if (!symbol) {
    return await fetchLiveIndianFinancialNews();
  }
  const { cleanSymbol } = normalizeIndianSymbol(symbol);
  const inst = await getInstrumentBySymbol(cleanSymbol);
  const companyName = inst?.companyName || VERIFIED_INDIAN_STOCKS[cleanSymbol]?.quote?.companyName;

  return await fetchLiveIndianFinancialNews({
    symbol: cleanSymbol,
    companyName,
  });
}

export { fetchLiveIndianFinancialNews };

/**
 * Get corporate actions for a stock or full market
 */
export async function getCorporateActionsForStock(symbol?: string): Promise<CorporateAction[]> {
  if (!symbol) {
    return await dbGetCorporateActions();
  }
  const { cleanSymbol } = normalizeIndianSymbol(symbol);
  const fromDb = await dbGetCorporateActions(cleanSymbol);
  if (fromDb.length > 0) return fromDb;

  const provider = getMarketDataProvider();
  return await provider.getCorporateActions(cleanSymbol);
}

/**
 * Get financial statements for a stock
 */
export async function getFinancialStatementsForStock(symbol: string): Promise<FinancialStatementRecord[]> {
  const { cleanSymbol } = normalizeIndianSymbol(symbol);
  const fromDb = await dbGetFinancialStatements(cleanSymbol);
  if (fromDb.length > 0) return fromDb;

  const provider = getMarketDataProvider();
  return await provider.getFinancialStatements(cleanSymbol);
}

/**
 * Get explicit coverage status for a stock
 */
export async function getInstrumentCoverage(symbol: string): Promise<InstrumentCoverageStatus> {
  const { cleanSymbol } = normalizeIndianSymbol(symbol);
  const inst = await getInstrumentBySymbol(cleanSymbol);
  if (inst?.coverage) return inst.coverage;

  const provider = getMarketDataProvider();
  return await provider.getCoverageStatus(cleanSymbol);
}

/**
 * Get top market movers (Gainers, Losers, Most Active)
 */
export async function getMarketMovers(): Promise<{
  gainers: StockQuote[];
  losers: StockQuote[];
  mostActive: StockQuote[];
}> {
  const provider = getMarketDataProvider();
  const symbols = Object.keys(VERIFIED_INDIAN_STOCKS);
  const liveQuotes = (
    await Promise.all(symbols.map(sym => provider.getQuote(sym)))
  ).filter((q): q is StockQuote => q !== null);

  const quotes = liveQuotes.length > 0 ? liveQuotes : Object.values(VERIFIED_INDIAN_STOCKS).map(s => s.quote);

  const gainers = [...quotes].filter(q => q.change > 0).sort((a, b) => b.percentChange - a.percentChange).slice(0, 5);
  const losers = [...quotes].filter(q => q.change < 0).sort((a, b) => a.percentChange - b.percentChange).slice(0, 5);
  const mostActive = [...quotes].sort((a, b) => b.volume - a.volume).slice(0, 5);

  return { gainers, losers, mostActive };
}
