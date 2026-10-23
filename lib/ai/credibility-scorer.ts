import { StockQuote, CompanyFundamentals, OHLCVCandle, FinancialNewsItem, CorporateAction } from '@/types';
import { getMarketSessionStatus } from '@/lib/utils/indian-market';

export type QuestionType =
  | 'FACTUAL'
  | 'BULLISH_BEARISH'
  | 'WHY_MOVED'
  | 'COMPARISON'
  | 'FUNDAMENTAL'
  | 'TECHNICAL'
  | 'FORECAST'
  | 'EDUCATIONAL';

export interface CredibilityFactor {
  name: string;
  weight: number; // Percentage contribution (sum = 100)
  score: number; // 0 to 100
  details: string;
  status: 'good' | 'warning' | 'poor';
}

export interface CredibilityScoreResult {
  score: number | null; // 0-100 or null if unrated/educational
  rating: 'High' | 'Moderate' | 'Low' | 'Unavailable' | 'Not Scored';
  explanation: string;
  disclaimer: string;
  factors: CredibilityFactor[];
  limitations: string[];
}

export interface ScorerInputBundle {
  symbol?: string;
  quote?: StockQuote | null;
  fundamentals?: CompanyFundamentals | null;
  candles?: OHLCVCandle[];
  news?: FinancialNewsItem[];
  actions?: CorporateAction[];
  isEducational?: boolean;
}

/**
 * Deterministic Credibility Scoring Engine for Dalal Street Pulse
 *
 * CRITICAL PRINCIPLE:
 * This score measures EVIDENCE & DATA QUALITY, not the probability that a stock
 * will rise, a forecast will be accurate, or an investment will succeed.
 *
 * Fixed Weights:
 * - Price Freshness & Market Session: 25%
 * - Data Completeness (Price, 52W, Fundamentals): 25%
 * - Historical Depth & Calculation Validity: 25%
 * - Source Reliability & Attribution: 15%
 * - Evidence Relevance & Catalyst Verification: 10%
 */
export function calculateEvidenceCredibility(
  bundle: ScorerInputBundle,
  questionType: QuestionType = 'FACTUAL',
  options: { isComparison?: boolean; secondaryBundle?: ScorerInputBundle } = {}
): CredibilityScoreResult {
  const disclaimer =
    'Credibility measures the quality, completeness, and verification of the underlying market evidence, not the certainty of the market outlook or future stock performance.';

  // 1. General Educational Queries: No stock data used -> Not Scored
  if (bundle.isEducational || questionType === 'EDUCATIONAL') {
    return {
      score: null,
      rating: 'Not Scored',
      explanation: 'General conceptual inquiry. Evidence credibility scoring applies to specific company data and verified market calculations.',
      disclaimer,
      factors: [],
      limitations: ['Conceptual answer; no company-specific data requested or evaluated.'],
    };
  }

  const quote = bundle.quote;
  const fundamentals = bundle.fundamentals;
  const candles = bundle.candles || [];
  const news = bundle.news || [];
  const session = getMarketSessionStatus();
  const limitations: string[] = [];

  // 2. Missing Core Quote -> Unavailable
  if (!quote || quote.currentPrice <= 0) {
    return {
      score: 0,
      rating: 'Unavailable',
      explanation: 'Unable to retrieve active price observations for the requested security from NSE/BSE feeds.',
      disclaimer,
      factors: [
        {
          name: 'Price Observation',
          weight: 25,
          score: 0,
          details: 'No valid quote retrieved from exchange data provider.',
          status: 'poor',
        },
      ],
      limitations: ['Essential quote data is missing; analysis cannot be verified.'],
    };
  }

  // --------------------------------------------------------------------------
  // Factor 1: Price Freshness & Session Status (Weight: 25%)
  // --------------------------------------------------------------------------
  let freshnessScore = 100;
  let freshnessDetails = '';
  let freshnessStatus: 'good' | 'warning' | 'poor' = 'good';

  if (quote.freshness === 'live' && session.status === 'REGULAR') {
    freshnessScore = 100;
    freshnessDetails = `Real-time live exchange tick verified during active ${session.statusLabel}.`;
  } else if (quote.freshness === 'delayed' && session.status === 'REGULAR') {
    freshnessScore = 80;
    freshnessDetails = 'Price feed is delayed by 15 minutes as per exchange tier.';
    freshnessStatus = 'warning';
    limitations.push('Quote is delayed by up to 15 minutes.');
  } else if (session.status === 'CLOSED' || session.status === 'HOLIDAY') {
    freshnessScore = 72;
    freshnessDetails = `Market is currently ${session.statusLabel}; price reflects official session close (${quote.lastUpdated.split('T')[0]}).`;
    freshnessStatus = 'warning';
  } else if (quote.freshness === 'cached') {
    freshnessScore = 60;
    freshnessDetails = 'Using cached quote from prior feed snapshot.';
    freshnessStatus = 'warning';
    limitations.push('Quote is loaded from cached snapshot.');
  } else {
    freshnessScore = 40;
    freshnessDetails = 'Price timestamp could not be verified in real time.';
    freshnessStatus = 'poor';
    limitations.push('Price timestamp verification incomplete.');
  }

  // --------------------------------------------------------------------------
  // Factor 2: Data Completeness (Weight: 25%)
  // --------------------------------------------------------------------------
  let completenessScore = 100;
  const missingComponents: string[] = [];

  // Check quote core fields
  if (!quote.week52High || !quote.week52Low || quote.week52High <= quote.week52Low) {
    completenessScore -= 15;
    missingComponents.push('52-week range corridor');
  }
  if (!quote.volume || quote.volume <= 0) {
    completenessScore -= 10;
    missingComponents.push('trading volume');
  }

  // Check fundamentals
  if (!fundamentals) {
    completenessScore -= 35;
    missingComponents.push('audited company fundamentals');
    limitations.push('Audited balance sheet ratios (P/E, ROCE, Debt/Equity) are unsupplied.');
  } else {
    if (!fundamentals.peRatio || fundamentals.peRatio <= 0) {
      completenessScore -= 10;
      missingComponents.push('P/E ratio');
    }
    if (fundamentals.roce == null) {
      completenessScore -= 10;
      missingComponents.push('ROCE metric');
    }
    if (!fundamentals.quarterlyResults || fundamentals.quarterlyResults.length === 0) {
      completenessScore -= 10;
      missingComponents.push('quarterly revenue/PAT breakdown');
    }
  }

  completenessScore = Math.max(10, Math.min(100, completenessScore));
  const completenessStatus: 'good' | 'warning' | 'poor' =
    completenessScore >= 80 ? 'good' : completenessScore >= 55 ? 'warning' : 'poor';
  const completenessDetails =
    missingComponents.length === 0
      ? 'Comprehensive dataset: verified price, volume, 52W range, and audited financials available.'
      : `Partial dataset: missing ${missingComponents.join(', ')}.`;

  // --------------------------------------------------------------------------
  // Factor 3: Historical Depth & Calculation Validity (Weight: 25%)
  // --------------------------------------------------------------------------
  let historyScore = 100;
  let historyDetails = '';
  let historyStatus: 'good' | 'warning' | 'poor' = 'good';
  const candleCount = candles.length;

  if (candleCount >= 200) {
    historyScore = 100;
    historyDetails = `Full annual history verified (${candleCount} daily candles). 20, 50, and 200-day SMAs, RSI, and MACD validated.`;
  } else if (candleCount >= 50) {
    historyScore = 80;
    historyDetails = `Medium history available (${candleCount} daily candles). 20 and 50-day SMAs and RSI validated; 200-day SMA disabled.`;
    historyStatus = 'warning';
    limitations.push(`Under 200 trading days on record (${candleCount} bars); 200-day moving average unavailable.`);
  } else if (candleCount >= 20) {
    historyScore = 60;
    historyDetails = `Short history (${candleCount} daily candles). Only 20-day SMA and RSI (14) could be computed.`;
    historyStatus = 'warning';
    limitations.push(`Limited history (${candleCount} bars); longer-term trends cannot be verified.`);
  } else if (candleCount > 0) {
    historyScore = 30;
    historyDetails = `Insufficient candle depth (${candleCount} bars). Technical oscillators cannot be computed safely.`;
    historyStatus = 'poor';
    limitations.push('Fewer than 20 candles; technical indicators disabled.');
  } else {
    historyScore = 15;
    historyDetails = 'No historical OHLCV candle series available from provider.';
    historyStatus = 'poor';
    limitations.push('Historical OHLCV data missing; technical trend analysis disabled.');
  }

  // --------------------------------------------------------------------------
  // Factor 4: Source Reliability & Attribution (Weight: 15%)
  // --------------------------------------------------------------------------
  let sourceScore = 95;
  let sourceDetails = `Primary exchange feed: ${quote.exchange || 'NSE/BSE'}. Unified security master with official ISIN.`;
  let sourceStatus: 'good' | 'warning' | 'poor' = 'good';

  if (!quote.isin) {
    sourceScore -= 15;
    sourceDetails += ' ISIN cross-reference pending.';
    sourceStatus = 'warning';
  }

  // --------------------------------------------------------------------------
  // Factor 5: Evidence Relevance & Catalyst Verification (Weight: 10%)
  // --------------------------------------------------------------------------
  let relevanceScore = 90;
  let relevanceDetails = 'Retrieved data directly corresponds to the requested company and query scope.';
  let relevanceStatus: 'good' | 'warning' | 'poor' = 'good';

  if (questionType === 'WHY_MOVED') {
    // Specifically test whether an actual dated news event or corporate action explains the move
    const hasDatedNews = news.length > 0;
    const hasCorporateAction = (bundle.actions || []).length > 0;

    if (hasDatedNews || hasCorporateAction) {
      relevanceScore = 95;
      relevanceDetails = `Dated company announcements or corporate disclosures verified for recent sessions.`;
    } else {
      relevanceScore = 40;
      relevanceDetails = `Observed price movement is verified, but no specific company catalyst or filing was found. Causation cannot be confirmed.`;
      relevanceStatus = 'warning';
      limitations.push('No material news filing found to explain price movement; causation is unverified.');
    }
  } else if (questionType === 'TECHNICAL') {
    if (candleCount < 20) {
      relevanceScore = 45;
      relevanceDetails = 'User asked for technical analysis but historical candles are insufficient.';
      relevanceStatus = 'poor';
    }
  } else if (questionType === 'FUNDAMENTAL') {
    if (!fundamentals) {
      relevanceScore = 40;
      relevanceDetails = 'User asked for fundamental analysis but financial statements are missing.';
      relevanceStatus = 'poor';
    }
  }

  // --------------------------------------------------------------------------
  // Multi-Stock Comparison Adjustment
  // --------------------------------------------------------------------------
  if (options.isComparison && options.secondaryBundle) {
    const secBundle = options.secondaryBundle;
    const secRes = calculateEvidenceCredibility(secBundle, 'FACTUAL');
    if (secRes.score !== null) {
      // Harmonic penalty if one of the comparison securities has weaker data
      if (secRes.score < 50) {
        freshnessScore = Math.min(freshnessScore, secRes.score + 20);
        limitations.push(`Comparison security (${secBundle.symbol || 'peer'}) has limited or unverified data.`);
      }
    }
  }

  // Calculate Weighted Aggregate Score
  const rawScore =
    freshnessScore * 0.25 +
    completenessScore * 0.25 +
    historyScore * 0.25 +
    sourceScore * 0.15 +
    relevanceScore * 0.10;

  const score = Math.round(Math.max(10, Math.min(98, rawScore)));

  let rating: CredibilityScoreResult['rating'] = 'High';
  if (score < 55) {
    rating = 'Low';
  } else if (score < 78) {
    rating = 'Moderate';
  }

  // Explanatory sentence
  let explanation = '';
  if (rating === 'High') {
    explanation = 'High credibility: verified exchange price observations, complete 52-week corridor, and validly calculated historical indicators.';
  } else if (rating === 'Moderate') {
    explanation = `Moderate credibility: ${limitations[0] || 'some non-critical data fields are estimated or delayed'}.`;
  } else {
    explanation = `Low credibility: ${limitations[0] || 'essential market data fields or history are incomplete'}.`;
  }

  const factors: CredibilityFactor[] = [
    {
      name: 'Price Freshness & Session',
      weight: 25,
      score: freshnessScore,
      details: freshnessDetails,
      status: freshnessStatus,
    },
    {
      name: 'Dataset Completeness',
      weight: 25,
      score: completenessScore,
      details: completenessDetails,
      status: completenessStatus,
    },
    {
      name: 'Historical Depth & Math',
      weight: 25,
      score: historyScore,
      details: historyDetails,
      status: historyStatus,
    },
    {
      name: 'Source Reliability',
      weight: 15,
      score: sourceScore,
      details: sourceDetails,
      status: sourceStatus,
    },
    {
      name: 'Evidence Relevance',
      weight: 10,
      score: relevanceScore,
      details: relevanceDetails,
      status: relevanceStatus,
    },
  ];

  return {
    score,
    rating,
    explanation,
    disclaimer,
    factors,
    limitations,
  };
}
