import { describe, it, expect } from 'vitest';
import {
  calculatePercentageChange,
  calculatePeriodReturn,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculatePivotPoints,
  calculateVWAP,
  calculate52WeekMetrics,
} from '@/lib/utils/financial-math';
import { resolveSecurityContext } from '@/lib/ai/security-resolver';
import { evaluateDataQuality } from '@/lib/ai/confidence-gate';
import { getStockQuantitativeBundle, runGroundedAnalystPipeline } from '@/lib/ai/grounded-analyst';
import { StockQuote, OHLCVCandle } from '@/types';

describe('Quantitative Financial Math Engine', () => {
  it('correctly calculates percentage price change with zero-denominator guard', () => {
    // Normal case: ((110 - 100) / 100) * 100 = 10%
    const res1 = calculatePercentageChange(110, 100);
    expect(res1.valid).toBe(true);
    expect(res1.value).toBe(10);

    // Negative case: ((95 - 100) / 100) * 100 = -5%
    const res2 = calculatePercentageChange(95, 100);
    expect(res2.valid).toBe(true);
    expect(res2.value).toBe(-5);

    // Zero previous close safeguard
    const res3 = calculatePercentageChange(100, 0);
    expect(res3.valid).toBe(false);
    expect(res3.value).toBe(0);
    expect(res3.reason).toBeDefined();
  });

  it('correctly calculates period returns with negative/zero starting price safeguards', () => {
    // Return: ((2500 / 2000) - 1) * 100 = 25%
    const res1 = calculatePeriodReturn(2000, 2500);
    expect(res1.valid).toBe(true);
    expect(res1.value).toBe(25);

    // Loss: ((1500 / 2000) - 1) * 100 = -25%
    const res2 = calculatePeriodReturn(2000, 1500);
    expect(res2.valid).toBe(true);
    expect(res2.value).toBe(-25);

    // Invalid non-positive starting price
    const res3 = calculatePeriodReturn(-10, 50);
    expect(res3.valid).toBe(false);
    expect(res3.value).toBe(0);
  });

  it('calculates Simple Moving Average (SMA) and rejects insufficient history', () => {
    const prices = [10, 20, 30, 40, 50];
    const sma3 = calculateSMA(prices, 3);
    // last 3 are 30, 40, 50 -> avg = 40
    expect(sma3.valid).toBe(true);
    expect(sma3.value).toBe(40);

    // Insufficient history: requesting 200 SMA on 5 prices
    const sma200 = calculateSMA(prices, 200);
    expect(sma200.valid).toBe(false);
    expect(sma200.value).toBeNull();
    expect(sma200.reason).toContain('Insufficient historical observations');
  });

  it('calculates Exponential Moving Average (EMA)', () => {
    const prices = [10, 12, 14, 16, 18, 20, 22, 24, 26, 30];
    const ema5 = calculateEMA(prices, 5);
    expect(ema5.valid).toBe(true);
    expect(ema5.value).toBeGreaterThan(0);

    const invalid = calculateEMA(prices, 50);
    expect(invalid.valid).toBe(false);
    expect(invalid.value).toBeNull();
  });

  it('calculates RSI (14) with overbought, oversold, and neutral classifications', () => {
    // Strictly increasing prices -> RSI should be high (overbought)
    const bullishPrices = Array.from({ length: 25 }, (_, i) => 100 + i * 5);
    const rsiBull = calculateRSI(bullishPrices, 14);
    expect(rsiBull.valid).toBe(true);
    expect(rsiBull.value?.rsi).toBeGreaterThan(70);
    expect(rsiBull.value?.condition).toBe('OVERBOUGHT');

    // Strictly decreasing prices -> RSI should be low (oversold)
    const bearishPrices = Array.from({ length: 25 }, (_, i) => 200 - i * 5);
    const rsiBear = calculateRSI(bearishPrices, 14);
    expect(rsiBear.valid).toBe(true);
    expect(rsiBear.value?.rsi).toBeLessThan(30);
    expect(rsiBear.value?.condition).toBe('OVERSOLD');

    // Insufficient history guard (< 15 prices)
    const insufficient = calculateRSI([100, 105, 110], 14);
    expect(insufficient.valid).toBe(false);
    expect(insufficient.value).toBeNull();
  });

  it('calculates MACD and detects signals and trends', () => {
    const prices = Array.from({ length: 45 }, (_, i) => 100 + Math.sin(i) * 10 + i * 0.5);
    const macdRes = calculateMACD(prices, 12, 26, 9);

    expect(macdRes.valid).toBe(true);
    expect(macdRes.value).toBeDefined();
    expect(typeof macdRes.value?.macdLine).toBe('number');
    expect(typeof macdRes.value?.signalLine).toBe('number');
    expect(typeof macdRes.value?.histogram).toBe('number');
    expect(['BULLISH', 'BEARISH', 'BULLISH_CROSSOVER', 'BEARISH_CROSSOVER']).toContain(macdRes.value?.trend);

    // Insufficient history guard (< 35 prices for 12, 26, 9)
    const shortPrices = [10, 20, 30];
    const invalidMacd = calculateMACD(shortPrices);
    expect(invalidMacd.valid).toBe(false);
    expect(invalidMacd.value).toBeNull();
  });

  it('calculates classic floor pivot points correctly', () => {
    // High: 105, Low: 95, Close: 100
    // Pivot = (105 + 95 + 100) / 3 = 100
    // R1 = 2 * 100 - 95 = 105
    // S1 = 2 * 100 - 105 = 95
    // R2 = 100 + (105 - 95) = 110
    // S2 = 100 - (105 - 95) = 90
    const pivots = calculatePivotPoints(105, 95, 100);
    expect(pivots.valid).toBe(true);
    expect(pivots.value?.pivot).toBe(100);
    expect(pivots.value?.r1).toBe(105);
    expect(pivots.value?.s1).toBe(95);
    expect(pivots.value?.r2).toBe(110);
    expect(pivots.value?.s2).toBe(90);

    // Negative or inverted check
    const invalid = calculatePivotPoints(90, 100, 95);
    expect(invalid.valid).toBe(false);
  });

  it('calculates VWAP and protects against zero volume', () => {
    const candles: OHLCVCandle[] = [
      { timestamp: '2026-10-01', time: 1727740800, open: 100, high: 105, low: 95, close: 100, volume: 1000 },
      { timestamp: '2026-10-02', time: 1727827200, open: 100, high: 110, low: 98, close: 108, volume: 2000 },
    ];
    const res = calculateVWAP(candles);
    expect(res.valid).toBe(true);
    expect(res.value).toBeGreaterThan(95);
    expect(res.value).toBeLessThan(110);

    const zeroVolCandles: OHLCVCandle[] = [
      { timestamp: '2026-10-01', time: 1727740800, open: 100, high: 105, low: 95, close: 100, volume: 0 },
    ];
    const zeroRes = calculateVWAP(zeroVolCandles);
    expect(zeroRes.valid).toBe(false);
    expect(zeroRes.value).toBeNull();
  });

  it('calculates 52-week position and distance metrics', () => {
    // Low: 100, High: 200, Current: 150 -> range position should be 50%
    const res = calculate52WeekMetrics(150, 200, 100);
    expect(res.valid).toBe(true);
    expect(res.value?.rangePositionPercent).toBe(50);
    expect(res.value?.percentFromHigh).toBe(-25); // ((150-200)/200)*100
    expect(res.value?.percentFromLow).toBe(50);   // ((150-100)/100)*100
  });
});

describe('Security & Intent Resolution Engine', () => {
  it('resolves colloquial company names and aliases to canonical NSE tickers', () => {
    expect(resolveSecurityContext('What is the outlook for Reliance Industries?').primarySymbol).toBe('RELIANCE');
    expect(resolveSecurityContext('How are Jio and RIL performing?').primarySymbol).toBe('RELIANCE');
    expect(resolveSecurityContext('Explain TCS profit margins').primarySymbol).toBe('TCS');
    expect(resolveSecurityContext('Is HDFC Bank fairly valued?').primarySymbol).toBe('HDFCBANK');
    expect(resolveSecurityContext('What is the RSI of Infy?').primarySymbol).toBe('INFY');
    expect(resolveSecurityContext('TaMo EV order book').primarySymbol).toBe('TATAMOTORS');
    expect(resolveSecurityContext('SBI NPA levels').primarySymbol).toBe('SBIN');
    expect(resolveSecurityContext('L&T infrastructure order pipeline').primarySymbol).toBe('LT');
  });

  it('detects comparative queries and extracts multiple securities', () => {
    const comp1 = resolveSecurityContext('Compare TCS vs Infosys for long term investing');
    expect(comp1.intent).toBe('COMPARISON');
    expect(comp1.isExplicitComparison).toBe(true);
    expect(comp1.allSymbols).toContain('TCS');
    expect(comp1.allSymbols).toContain('INFY');

    const comp2 = resolveSecurityContext('Which is better: HDFC Bank or ICICI Bank?');
    expect(comp2.intent).toBe('COMPARISON');
    expect(comp2.allSymbols).toContain('HDFCBANK');
    expect(comp2.allSymbols).toContain('ICICIBANK');
  });

  it('detects requested timeframes in queries', () => {
    expect(resolveSecurityContext('RELIANCE daily chart').timeframeRequested).toBe('1D');
    expect(resolveSecurityContext('TCS 1 month performance').timeframeRequested).toBe('1M');
    expect(resolveSecurityContext('HDFCBANK 1 year return').timeframeRequested).toBe('1Y');
  });
});

describe('Data Quality and Confidence Gate', () => {
  it('assigns LOW confidence when quote data is missing or invalid', () => {
    const report = evaluateDataQuality(null, null, []);
    expect(report.score).toBe('LOW');
    expect(report.isQuoteValid).toBe(false);
    expect(report.missingFields).toContain('currentPrice');
    expect(report.limitations.length).toBeGreaterThan(0);
  });

  it('assigns MODERATE confidence when fundamentals or full candle history is limited', () => {
    const mockQuote: StockQuote = {
      symbol: 'TEST',
      exchange: 'NSE',
      companyName: 'Test India Ltd',
      currentPrice: 500,
      change: 5,
      percentChange: 1.0,
      open: 495,
      high: 505,
      low: 492,
      previousClose: 495,
      volume: 100000,
      week52High: 600,
      week52Low: 400,
      marketCapCrores: 5000,
      lastUpdated: new Date().toISOString(),
      freshness: 'live',
    };

    // No fundamentals and only 5 candles
    const report = evaluateDataQuality(mockQuote, null, [
      { timestamp: '2026-10-01', time: 1727740800, open: 490, high: 500, low: 485, close: 495, volume: 10000 },
    ]);

    expect(report.score).toBe('MODERATE');
    expect(report.hasFundamentals).toBe(false);
    expect(report.limitations.some(l => l.includes('50-day and 200-day'))).toBe(true);
  });
});

describe('End-to-End Quantitative AI Analyst Pipeline', () => {
  it('assembles a complete quantitative bundle for an Indian stock with verified metrics', async () => {
    const bundle = await getStockQuantitativeBundle('RELIANCE');

    expect(bundle.symbol).toBe('RELIANCE');
    expect(bundle.quote).toBeDefined();
    expect(bundle.quote?.currentPrice).toBeGreaterThan(0);
    expect(bundle.fundamentals).toBeDefined();
    expect(bundle.fundamentals?.peRatio).toBeGreaterThan(0);
    expect(bundle.technicals.pivots).toBeDefined();
    expect(bundle.quality.score).toBeDefined();
  });

  it('generates a concise evidence-grounded report with direct conclusion, credibility, and detailed analysis', async () => {
    const response = await runGroundedAnalystPipeline('Give me a full fundamental and technical breakdown of RELIANCE');

    expect(response.answer).toBeDefined();
    expect(response.conclusion).toBeDefined();
    expect(response.supportingEvidence).toBeDefined();
    expect(response.supportingEvidence?.length).toBeGreaterThan(0);
    expect(response.supportingEvidence?.length).toBeLessThanOrEqual(3);
    expect(response.credibility).toBeDefined();
    expect(response.credibility?.score).toBeGreaterThan(0);

    // Detailed analysis contains the full comprehensive sections
    expect(response.detailedAnalysis).toBeDefined();
    expect(response.detailedAnalysis).toContain('Market Snapshot');
    expect(response.detailedAnalysis).toContain('Technical Structure');
    expect(response.detailedAnalysis).toContain('Fundamental Health');
    expect(response.groundedSources.length).toBeGreaterThan(0);
  });

  it('generates a structured concise comparative analysis and detailed side-by-side metrics', async () => {
    const response = await runGroundedAnalystPipeline('Compare TCS vs INFY');

    expect(response.answer).toBeDefined();
    expect(response.conclusion).toBeDefined();
    expect(response.conclusion).toContain('TCS');
    expect(response.conclusion).toContain('INFY');
    expect(response.supportingEvidence?.length).toBeGreaterThan(0);
    expect(response.credibility).toBeDefined();

    // Detailed comparison report contains full metrics table
    expect(response.detailedAnalysis).toBeDefined();
    expect(response.detailedAnalysis).toContain('Return on Capital (ROCE)');
    expect(response.detailedAnalysis).toContain('P/E Ratio (Trailing)');
    expect(response.detailedAnalysis).toContain('Debt-to-Equity Ratio');
    expect(response.detailedAnalysis).toContain('Side-by-Side Financial & Valuation Metrics');
  });
});
