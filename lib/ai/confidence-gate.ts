import { StockQuote, CompanyFundamentals, OHLCVCandle, DataFreshness } from '@/types';
import { getMarketSessionStatus } from '@/lib/utils/indian-market';

export type ConfidenceScore = 'HIGH' | 'MODERATE' | 'LOW';

export interface DataQualityReport {
  score: ConfidenceScore;
  scoreExplanation: string;
  isQuoteValid: boolean;
  freshness: DataFreshness;
  sessionStatus: string;
  hasSufficientHistory: boolean;
  historyLength: number;
  hasFundamentals: boolean;
  missingFields: string[];
  dataAnomalies: string[];
  limitations: string[];
}

/**
 * Evaluates the quality, freshness, and completeness of retrieved market data
 */
export function evaluateDataQuality(
  quote: StockQuote | null,
  fundamentals: CompanyFundamentals | null,
  candles: OHLCVCandle[]
): DataQualityReport {
  const missingFields: string[] = [];
  const dataAnomalies: string[] = [];
  const limitations: string[] = [];

  const session = getMarketSessionStatus();

  // 1. Check Quote Existence & Plausibility
  if (!quote) {
    return {
      score: 'LOW',
      scoreExplanation: 'No price quote could be retrieved from active Indian equity providers.',
      isQuoteValid: false,
      freshness: 'unavailable',
      sessionStatus: session.statusLabel,
      hasSufficientHistory: false,
      historyLength: 0,
      hasFundamentals: false,
      missingFields: ['currentPrice', 'change', 'volume', 'previousClose'],
      dataAnomalies: ['Security quote missing entirely'],
      limitations: ['Analysis is speculative or conceptual only because live price observations are missing.'],
    };
  }

  let isQuoteValid = true;
  if (quote.currentPrice <= 0) {
    isQuoteValid = false;
    dataAnomalies.push(`Non-positive current price recorded: ₹${quote.currentPrice}`);
  }
  if (quote.previousClose <= 0) {
    dataAnomalies.push(`Invalid previous close price: ₹${quote.previousClose}`);
  }
  if (quote.high > 0 && quote.low > 0 && quote.high < quote.low) {
    dataAnomalies.push(`Day high (₹${quote.high}) is lower than day low (₹${quote.low})`);
  }

  // 2. Check Freshness & Market Hours
  const freshness = quote.freshness || 'cached';
  if (session.status === 'CLOSED' || session.status === 'HOLIDAY') {
    limitations.push(`NSE/BSE is currently ${session.statusLabel}. Quotes reflect last available official closing session.`);
  } else if (freshness === 'delayed') {
    limitations.push('Quotes are delayed by up to 15 minutes as per exchange feed tiers.');
  }

  // 3. Check Candle History Length
  const historyLength = candles?.length || 0;
  const hasSufficientHistory = historyLength >= 20;

  if (historyLength === 0) {
    missingFields.push('historicalOHLCV');
    limitations.push('No historical OHLCV candles available; moving averages and technical oscillators cannot be calculated.');
  } else if (historyLength < 50) {
    limitations.push(`Limited candle history (${historyLength} periods). 50-day and 200-day moving averages disabled.`);
  }

  // 4. Check Fundamentals Completeness
  const hasFundamentals = fundamentals != null;
  if (!fundamentals) {
    missingFields.push('fundamentals', 'peRatio', 'roce', 'financialStatements');
    limitations.push('Audited company balance sheet metrics and quarterly statements unavailable from current feed.');
  } else {
    if (fundamentals.peRatio <= 0) missingFields.push('peRatio');
    if (fundamentals.roce == null) missingFields.push('roce');
    if (!fundamentals.quarterlyResults || fundamentals.quarterlyResults.length === 0) {
      missingFields.push('quarterlyStatements');
    }
  }

  // 5. Calculate Confidence Score
  let score: ConfidenceScore = 'HIGH';
  let reasons: string[] = [];

  if (!isQuoteValid || dataAnomalies.length > 0) {
    score = 'LOW';
    reasons.push('Data anomalies or non-positive price detected');
  } else if (!hasFundamentals || historyLength < 20) {
    score = 'MODERATE';
    if (!hasFundamentals) reasons.push('Fundamental financial statements missing');
    if (historyLength < 20) reasons.push(`Short historical timeframe (${historyLength} candles)`);
  } else if (freshness === 'cached' || session.status === 'CLOSED' || session.status === 'HOLIDAY') {
    score = 'MODERATE';
    reasons.push(`Session closed/cached: observations timestamped from last official session`);
  } else {
    score = 'HIGH';
    reasons.push('Live/delayed quote, sufficient candle history (20+ bars), and audited quarterly fundamentals verified');
  }

  const scoreExplanation = `${score} Confidence: ${reasons.join('; ')}.`;

  return {
    score,
    scoreExplanation,
    isQuoteValid,
    freshness,
    sessionStatus: session.statusLabel,
    hasSufficientHistory,
    historyLength,
    hasFundamentals,
    missingFields,
    dataAnomalies,
    limitations,
  };
}
