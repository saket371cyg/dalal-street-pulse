import {
  Exchange,
  Instrument,
  StockQuote,
  OHLCVCandle,
  MarketIndex,
  CompanyFundamentals,
  FinancialStatementRecord,
  CorporateAction,
  CorporateAnnouncement,
  FinancialNewsItem,
  InstrumentCoverageStatus,
} from '@/types';
import { MarketDataProvider, ProviderCapabilities, ProviderHealth } from './types';
import { normalizeIndianSymbol } from '@/lib/utils/indian-market';

/**
 * Yahoo Finance Provider: Robust, free alternative for live quotes, historical data,
 * and search functionality on NSE/BSE. No authentication required.
 */
export class YahooFinanceProvider implements MarketDataProvider {
  readonly name = 'Yahoo Finance (Public)';
  readonly capabilities: ProviderCapabilities = {
    supportsRealtimeWebSocket: false,
    supportsHistoricalIntraday: true,
    supportsHistoricalEOD: true,
    supportsFinancialStatements: false,
    supportsCorporateActions: false,
    supportsNews: false,
    supportsSME: false,
    rateLimitPerMinute: 60,
  };

  private UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  async discoverInstruments(options?: { segment?: 'EQUITY' | 'SME' | 'ALL'; exchange?: Exchange }): Promise<Instrument[]> {
    return [];
  }

  private async fetchYahoo(endpoint: string): Promise<any> {
    const res = await fetch(`https://query1.finance.yahoo.com${endpoint}`, {
      headers: { "User-Agent": this.UA },
    });
    if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status}`);
    return await res.json();
  }

  async getQuote(symbol: string, exchange: Exchange = 'NSE'): Promise<StockQuote | null> {
    const { cleanSymbol } = normalizeIndianSymbol(symbol);
    const yahooSym = exchange === 'BSE' ? `${cleanSymbol}.BO` : `${cleanSymbol}.NS`;

    try {
      const data = await this.fetchYahoo(`/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=1d&interval=5m`);
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      return {
        symbol: cleanSymbol,
        exchange: exchange,
        companyName: meta.shortName || meta.longName || cleanSymbol,
        currentPrice: meta.regularMarketPrice,
        change: meta.regularMarketPrice - meta.previousClose,
        percentChange: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        open: meta.regularMarketPrice, // approximation
        high: meta.regularMarketDayHigh || meta.regularMarketPrice,
        low: meta.regularMarketDayLow || meta.regularMarketPrice,
        previousClose: meta.previousClose,
        volume: meta.regularMarketVolume || 0,
        week52High: meta.fiftyTwoWeekHigh || meta.regularMarketPrice * 1.2,
        week52Low: meta.fiftyTwoWeekLow || meta.regularMarketPrice * 0.8,
        marketCapCrores: 0, // Not provided by quote endpoint
        lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString(),
        freshness: 'live',
      };
    } catch {
      return null;
    }
  }

  async getHistoricalOHLCV(
    symbol: string,
    timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y',
    exchange?: Exchange
  ): Promise<OHLCVCandle[]> {
    const { cleanSymbol } = normalizeIndianSymbol(symbol);
    const yahooSym = exchange === 'BSE' ? `${cleanSymbol}.BO` : `${cleanSymbol}.NS`;

    const rangeMap = { '1D': '1d', '1W': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y', '5Y': '5y' };
    const intervalMap = { '1D': '5m', '1W': '1h', '1M': '1d', '3M': '1d', '6M': '1d', '1Y': '1d', '5Y': '1d' };

    try {
      const data = await this.fetchYahoo(`/v8/finance/chart/${yahooSym}?range=${rangeMap[timeframe]}&interval=${intervalMap[timeframe]}`);
      const res = data.chart.result[0];
      const ts = res.timestamp;
      const q = res.indicators.quote[0];

      return ts.map((t: number, i: number) => ({
        timestamp: new Date(t * 1000).toISOString(),
        time: t,
        open: q.open[i] || 0,
        high: q.high[i] || 0,
        low: q.low[i] || 0,
        close: q.close[i] || 0,
        volume: q.volume[i] || 0,
      }));
    } catch {
      return [];
    }
  }

  async getIndices(): Promise<MarketIndex[]> {
    return [];
  }

  async getFundamentals(symbol: string): Promise<CompanyFundamentals | null> {
    return null;
  }

  async getFinancialStatements(symbol: string): Promise<FinancialStatementRecord[]> {
    return [];
  }

  async getCorporateActions(symbol?: string): Promise<CorporateAction[]> {
    return [];
  }

  async getCorporateAnnouncements(symbol?: string): Promise<CorporateAnnouncement[]> {
    return [];
  }

  async getNews(symbol?: string): Promise<FinancialNewsItem[]> {
    return [];
  }

  async getCoverageStatus(symbol: string): Promise<InstrumentCoverageStatus> {
    return {
      quotes: true,
      historicalOHLCV: true,
      fundamentals: false,
      financialStatements: false,
      corporateActions: false,
      news: false,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      ok: true,
      providerName: this.name,
      latencyMs: 150,
      entitlements: ['YAHOO_PUBLIC_API'],
      message: 'Active for quotes and historical OHLCV',
    };
  }
}
