export type Exchange = 'NSE' | 'BSE';

export type MarketSessionStatus = 'PRE_OPEN' | 'REGULAR' | 'POST_CLOSING' | 'CLOSED' | 'HOLIDAY';

export type DataFreshness = 'live' | 'delayed' | 'eod' | 'cached' | 'unavailable';

export interface InstrumentCoverageStatus {
  quotes: boolean;
  historicalOHLCV: boolean;
  fundamentals: boolean;
  financialStatements: boolean;
  corporateActions: boolean;
  news: boolean;
}

export interface Instrument {
  id: string; // usually isin or slug
  isin: string; // Universal unique identifier (e.g. INE002A01018)
  nseSymbol?: string; // e.g. "RELIANCE"
  bseCode?: string; // e.g. "500325"
  bseScripId?: string; // e.g. "RELIANCE"
  companyName: string;
  series?: string; // e.g. "EQ", "BE", "SM"
  isSME: boolean;
  exchanges: Exchange[];
  industry?: string;
  sector?: string;
  listingDate?: string;
  faceValue?: number;
  paidUpValue?: number;
  marketLot?: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELISTED';
  coverage: InstrumentCoverageStatus;
  source: string;
  lastSyncAt: string;
}

export interface SymbolAlias {
  id: string;
  isin: string;
  oldSymbol: string;
  newSymbol: string;
  companyName: string;
  changeDate: string; // ISO date
  exchange: Exchange;
}

export interface CorporateAction {
  id: string;
  symbol: string;
  isin?: string;
  exchange: Exchange;
  companyName: string;
  actionType: 'DIVIDEND' | 'SPLIT' | 'BONUS' | 'RIGHTS' | 'AGM' | 'BOARD_MEETING' | 'BUYBACK';
  exDate: string; // YYYY-MM-DD
  recordDate?: string;
  ratio?: string; // e.g. "1:1", "1:2"
  amount?: number; // dividend amount in INR
  details: string;
  status: 'ANNOUNCED' | 'EXECUTED';
}

export interface CorporateAnnouncement {
  id: string;
  symbol: string;
  isin?: string;
  exchange: Exchange;
  companyName: string;
  title: string;
  category: string;
  broadcastDateTime: string; // IST ISO
  attachmentUrl?: string;
}

export interface FinancialStatementRecord {
  id: string;
  symbol: string;
  isin?: string;
  period: string; // e.g. "Q3 FY26", "FY25"
  statementType: 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW';
  frequency: 'QUARTERLY' | 'ANNUAL';
  reportedDate: string;
  currency: 'INR';
  values: Record<string, number>;
  source: string;
}

export type SyncJobType =
  | 'SECURITY_MASTER'
  | 'QUOTES_SNAPSHOT'
  | 'OHLCV_HISTORICAL'
  | 'FUNDAMENTALS'
  | 'CORPORATE_ACTIONS'
  | 'NEWS';

export interface SyncJobHistory {
  id: string;
  jobType: SyncJobType;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  provider: string;
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface StockSearchResult {
  count: number;
  totalCount: number;
  page: number;
  totalPages: number;
  stocks: (StockQuote & {
    isin?: string;
    bseCode?: string;
    isSME?: boolean;
    coverage?: InstrumentCoverageStatus;
  })[];
  aliasRedirect?: {
    searchedSymbol: string;
    currentSymbol: string;
    effectiveDate: string;
  };
}

export interface MarketIndex {
  symbol: string;
  name: string;
  currentValue: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  previousClose: number;
  lastUpdated: string; // IST ISO string
  status: DataFreshness;
}

export interface StockQuote {
  symbol: string;
  isin?: string;
  exchange: Exchange;
  companyName: string;
  currentPrice: number; // in INR
  change: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  week52High: number;
  week52Low: number;
  marketCapCrores: number; // in ₹ Crores
  lastUpdated: string; // IST
  freshness: DataFreshness;
  vwap?: number; // Volume Weighted Average Price
  turnoverCrores?: number;
  dayRangePercent?: number;
  fiftyTwoWeekRangePercent?: number;
  upperCircuit?: number;
  lowerCircuit?: number;
  tradingStatus?: string;
}

export interface OHLCVCandle {
  timestamp: string; // IST date/time
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CompanyFundamentals {
  symbol: string;
  exchange: Exchange;
  companyName: string;
  sector: string;
  industry: string;
  about: string;
  headquarters: string;
  ceo?: string;
  website?: string;
  marketCapCrores: number;
  peRatio: number;
  industryPE: number;
  pbRatio: number;
  eps: number;
  dividendYield: number; // in %
  roe: number; // Return on Equity in %
  roce: number; // Return on Capital Employed in %
  debtToEquity: number;
  bookValuePerShare: number;
  faceValue: number;
  promoterHoldingPercent: number;
  fiiHoldingPercent: number;
  diiHoldingPercent: number;
  publicHoldingPercent: number;
  quarterlyResults: {
    period: string; // e.g. "Q3 FY26"
    revenueCrores: number;
    profitCrores: number;
    operatingMarginPercent: number;
  }[];
  annualResults: {
    year: string; // e.g. "FY25"
    revenueCrores: number;
    profitCrores: number;
  }[];
}

export interface FinancialNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string; // IST string
  sentiment: 'bullish' | 'bearish' | 'neutral';
  relatedSymbols: string[];
  category: 'Macro' | 'Earnings' | 'Policy' | 'Corporate' | 'Banking';
}

export interface AIAnalysisResult {
  symbol: string;
  companyName: string;
  summary: string;
  valuationVerdict: 'Undervalued' | 'Fairly Valued' | 'Overvalued' | 'Neutral';
  fundamentalHealthScore: number; // 1 to 10
  strengths: string[];
  risksAndUncertainties: string[];
  technicalMomentum: string;
  sourcesGrounded: string[];
  generatedAt: string;
}

export interface DailyMarketBriefing {
  id: string;
  date: string; // e.g. "2026-10-11"
  title: string;
  executiveSummary: string;
  niftyMoveReason: string;
  sensexMoveReason: string;
  topSectors: { sector: string; change: number; commentary: string }[];
  keyStories: { headline: string; impact: string }[];
  upcomingEvents: string[];
  generatedAt: string;
  sources: string[];
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  symbols: string[]; // e.g. ["RELIANCE", "TCS", "HDFCBANK"]
  createdAt: string;
  updatedAt: string;
}

export type AlertCondition = 'PRICE_ABOVE' | 'PRICE_BELOW' | 'PCT_GAIN_ABOVE' | 'PCT_LOSS_BELOW';

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  exchange: Exchange;
  companyName: string;
  condition: AlertCondition;
  thresholdValue: number; // price in INR or % value
  initialPrice: number;
  active: boolean;
  triggered: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
  createdAt: string;
  notes?: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ALERT' | 'BRIEFING' | 'SYSTEM';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  defaultMarket: Exchange;
  currency: 'INR';
  timezone: 'Asia/Kolkata';
  emailBriefingEnabled: boolean;
  briefingDeliveryTime: string; // e.g. "16:30"
  theme: 'dark' | 'light' | 'system';
  createdAt: string;
}

// ============================================================================
// RAG (Retrieval-Augmented Generation) Types
// ============================================================================

export type RAGCategory = 'news' | 'earnings' | 'filing' | 'macro' | 'educational';

export interface RAGDocumentChunk {
  id: string;
  documentId: string;
  symbol?: string; // e.g. 'RELIANCE', 'TCS'
  companyName?: string;
  title: string;
  content: string;
  category: RAGCategory;
  embedding?: number[];
  metadata?: Record<string, any>;
  sourceUrl?: string;
  publishedAt: string;
  score?: number;
}

export interface RAGChunkSnippet {
  title: string;
  category: RAGCategory;
  symbol?: string;
  snippet: string;
  sourceUrl?: string;
  publishedAt: string;
  relevanceScore?: number;
}

export interface CredibilityFactor {
  name: string;
  weight: number;
  score: number;
  details: string;
  status: 'good' | 'warning' | 'poor';
}

export interface CredibilityScoreResult {
  score: number | null;
  rating: 'High' | 'Moderate' | 'Low' | 'Unavailable' | 'Not Scored';
  explanation: string;
  disclaimer: string;
  factors: CredibilityFactor[];
  limitations: string[];
}

export interface RAGAskResponse {
  answer: string;
  conclusion?: string;
  supportingEvidence?: string[];
  caveat?: string;
  detailedAnalysis?: string;
  credibility?: CredibilityScoreResult;
  questionType?: string;
  stockSymbol?: string;
  relatedMetrics: string[];
  groundedSources: string[];
  chunksUsed?: RAGChunkSnippet[];
  modelUsed?: string;
  executionTimeMs?: number;
}

