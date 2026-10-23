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

export interface ProviderCapabilities {
  supportsRealtimeWebSocket: boolean;
  supportsHistoricalIntraday: boolean;
  supportsHistoricalEOD: boolean;
  supportsFinancialStatements: boolean;
  supportsCorporateActions: boolean;
  supportsNews: boolean;
  supportsSME: boolean;
  rateLimitPerMinute: number;
}

export interface ProviderHealth {
  ok: boolean;
  providerName: string;
  latencyMs: number;
  entitlements: string[];
  message: string;
}

/**
 * Universal Market Data Provider Abstraction
 */
export interface MarketDataProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  /**
   * Discovers and retrieves listed instruments across NSE and BSE
   */
  discoverInstruments(options?: { segment?: 'EQUITY' | 'SME' | 'ALL'; exchange?: Exchange }): Promise<Instrument[]>;

  /**
   * Retrieves latest live, delayed, or EOD stock quote
   */
  getQuote(symbol: string, exchange?: Exchange): Promise<StockQuote | null>;

  /**
   * Retrieves historical OHLCV candle series
   */
  getHistoricalOHLCV(
    symbol: string,
    timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y',
    exchange?: Exchange
  ): Promise<OHLCVCandle[]>;

  /**
   * Retrieves benchmark and sectoral market indices
   */
  getIndices(): Promise<MarketIndex[]>;

  /**
   * Retrieves company fundamental profile, valuation ratios, and shareholding
   */
  getFundamentals(symbol: string): Promise<CompanyFundamentals | null>;

  /**
   * Retrieves audited quarterly and annual financial statements
   */
  getFinancialStatements(symbol: string): Promise<FinancialStatementRecord[]>;

  /**
   * Retrieves corporate actions (Dividends, Splits, Bonus, Rights, AGMs)
   */
  getCorporateActions(symbol?: string): Promise<CorporateAction[]>;

  /**
   * Retrieves official exchange corporate announcements
   */
  getCorporateAnnouncements(symbol?: string): Promise<CorporateAnnouncement[]>;

  /**
   * Retrieves verified financial news with sentiment
   */
  getNews(symbol?: string): Promise<FinancialNewsItem[]>;

  /**
   * Returns dataset coverage status for a specific instrument
   */
  getCoverageStatus(symbol: string): Promise<InstrumentCoverageStatus>;

  /**
   * Verifies API credentials, network connectivity, and latency
   */
  healthCheck(): Promise<ProviderHealth>;
}
