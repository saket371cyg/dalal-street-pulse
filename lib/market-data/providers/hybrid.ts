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
import { TrueDataProvider } from './truedata';
import { EODHDProvider } from './eodhd';
import { ExchangeMasterProvider } from './exchange-master';
import { normalizeIndianSymbol } from '@/lib/utils/indian-market';
import { VERIFIED_INDIAN_STOCKS, VERIFIED_INDIAN_NEWS, INDIAN_MARKET_INDICES } from '../dataset';

/**
 * Hybrid Ingestion Provider: Production tier combining Official Exchange Masters,
 * TrueData real-time feeds, EODHD historical fundamentals & news, and SEBI disclosures.
 */
export class HybridProvider implements MarketDataProvider {
  readonly name = 'Hybrid (NSE/BSE + TrueData + EODHD)';
  readonly capabilities: ProviderCapabilities = {
    supportsRealtimeWebSocket: true,
    supportsHistoricalIntraday: true,
    supportsHistoricalEOD: true,
    supportsFinancialStatements: true,
    supportsCorporateActions: true,
    supportsNews: true,
    supportsSME: true,
    rateLimitPerMinute: 600,
  };

  private trueData = new TrueDataProvider();
  private eodhd = new EODHDProvider();
  private exchangeMaster = new ExchangeMasterProvider();

  async discoverInstruments(options?: { segment?: 'EQUITY' | 'SME' | 'ALL'; exchange?: Exchange }): Promise<Instrument[]> {
    return await this.exchangeMaster.discoverInstruments(options);
  }

  async getQuote(symbol: string, exchange: Exchange = 'NSE'): Promise<StockQuote | null> {
    const quote = await this.trueData.getQuote(symbol, exchange);
    if (quote) return quote;
    return await this.eodhd.getQuote(symbol, exchange);
  }

  async getHistoricalOHLCV(
    symbol: string,
    timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y',
    exchange?: Exchange
  ): Promise<OHLCVCandle[]> {
    const tdCandles = await this.trueData.getHistoricalOHLCV(symbol, timeframe, exchange);
    if (tdCandles && tdCandles.length > 0) return tdCandles;
    return await this.eodhd.getHistoricalOHLCV(symbol, timeframe);
  }

  async getIndices(): Promise<MarketIndex[]> {
    return await this.trueData.getIndices();
  }

  async getFundamentals(symbol: string): Promise<CompanyFundamentals | null> {
    return await this.eodhd.getFundamentals(symbol);
  }

  async getFinancialStatements(symbol: string): Promise<FinancialStatementRecord[]> {
    return await this.eodhd.getFinancialStatements(symbol);
  }

  async getCorporateActions(symbol?: string): Promise<CorporateAction[]> {
    return await this.exchangeMaster.getCorporateActions(symbol);
  }

  async getCorporateAnnouncements(symbol?: string): Promise<CorporateAnnouncement[]> {
    return await this.exchangeMaster.getCorporateAnnouncements(symbol);
  }

  async getNews(symbol?: string): Promise<FinancialNewsItem[]> {
    return await this.eodhd.getNews(symbol);
  }

  async getCoverageStatus(symbol: string): Promise<InstrumentCoverageStatus> {
    const { cleanSymbol } = normalizeIndianSymbol(symbol);
    const item = VERIFIED_INDIAN_STOCKS[cleanSymbol];

    // If it's an SME stock (e.g. DRONACHARYA)
    const isSmeSymbol = ['DRONACHARYA', 'BASILIC', 'TAC', 'K2INFRA', 'ALUFLUOR'].includes(cleanSymbol);

    if (isSmeSymbol) {
      return {
        quotes: true,
        historicalOHLCV: true,
        fundamentals: false, // SME half-yearly only
        financialStatements: false, // Not on standard quarterly schedule
        corporateActions: true,
        news: false,
      };
    }

    if (item) {
      return {
        quotes: true,
        historicalOHLCV: true,
        fundamentals: true,
        financialStatements: true,
        corporateActions: true,
        news: true,
      };
    }

    // Default unknown counter
    return {
      quotes: false,
      historicalOHLCV: false,
      fundamentals: false,
      financialStatements: false,
      corporateActions: false,
      news: false,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const [tdHealth, eodHealth, exchHealth] = await Promise.all([
      this.trueData.healthCheck(),
      this.eodhd.healthCheck(),
      this.exchangeMaster.healthCheck(),
    ]);

    return {
      ok: tdHealth.ok && eodHealth.ok && exchHealth.ok,
      providerName: this.name,
      latencyMs: Math.max(tdHealth.latencyMs, eodHealth.latencyMs, exchHealth.latencyMs),
      entitlements: [
        'NSE_SECURITY_MASTER',
        'BSE_SECURITY_DIRECTORY',
        'TRUEDATA_L1_QUOTES',
        'EODHD_FUNDAMENTALS_AND_NEWS',
        'EXCHANGE_CORPORATE_ACTIONS',
      ],
      message: 'Hybrid orchestration engine active with multi-tier failover',
    };
  }
}
