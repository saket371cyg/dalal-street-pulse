import { describe, it, expect } from 'vitest';
import { calculateEvidenceCredibility } from '@/lib/ai/credibility-scorer';
import { classifyQuestionType } from '@/lib/ai/security-resolver';
import {
  getStockQuantitativeBundle,
  buildConciseStockReport,
  buildConciseComparisonReport,
  runGroundedAnalystPipeline,
} from '@/lib/ai/grounded-analyst';
import { StockQuote, CompanyFundamentals, OHLCVCandle } from '@/types';

describe('Dalal Street Pulse - Concise, Evidence-Based AI Analyst', () => {
  // 1. Question Type Classification
  describe('Analytical Intent & Question Type Classification', () => {
    it('classifies bullish/bearish questions correctly', () => {
      expect(classifyQuestionType('Is Reliance bullish right now?', true)).toBe('BULLISH_BEARISH');
      expect(classifyQuestionType('What is the outlook for Tata Motors?', true)).toBe('BULLISH_BEARISH');
      expect(classifyQuestionType('Should I buy TCS?', true)).toBe('BULLISH_BEARISH');
    });

    it('classifies "why did it move" questions correctly', () => {
      expect(classifyQuestionType('Why did this stock fall today?', true)).toBe('WHY_MOVED');
      expect(classifyQuestionType('Why is HDFC Bank down today?', true)).toBe('WHY_MOVED');
      expect(classifyQuestionType('Reason for Infosys surge', true)).toBe('WHY_MOVED');
    });

    it('classifies stock comparison queries correctly', () => {
      expect(classifyQuestionType('Compare TCS vs INFY', true)).toBe('COMPARISON');
      expect(classifyQuestionType('Which is better between Reliance and Adani?', true)).toBe('COMPARISON');
    });

    it('classifies technical and fundamental questions correctly', () => {
      expect(classifyQuestionType('What are the key technical support and resistance levels for SBIN?', true)).toBe('TECHNICAL');
      expect(classifyQuestionType('What is the P/E ratio and debt profile of ITC?', true)).toBe('FUNDAMENTAL');
    });

    it('classifies general educational questions without symbols', () => {
      expect(classifyQuestionType('What does P/E ratio mean in Indian markets?', false)).toBe('EDUCATIONAL');
      expect(classifyQuestionType('Explain ROCE vs ROE with examples', false)).toBe('EDUCATIONAL');
    });
  });

  // 2. Direct Answer First Sentence & Strict Length
  describe('Direct Answer First Sentence & Strict Length', async () => {
    it('answers bullish/bearish question directly in the very first sentence', async () => {
      const bundle = await getStockQuantitativeBundle('RELIANCE');
      const concise = buildConciseStockReport(bundle, 'Is Reliance bullish right now?', 'BULLISH_BEARISH');

      // First sentence must answer directly with Outlook
      expect(concise.conclusion).toMatch(/^\*\*Outlook:\s+(Cautiously bullish|Bearish bias|Neutral \/ Consolidating)\.\*\*/i);
      // Supporting evidence should be <= 3 bullets
      expect(concise.supportingEvidence.length).toBeGreaterThan(0);
      expect(concise.supportingEvidence.length).toBeLessThanOrEqual(3);
      // Caveat present
      expect(concise.caveat).toBeDefined();
      expect(concise.caveat.length).toBeGreaterThan(10);

      // Target word count: 40-100 words
      const wordCount = concise.formattedAnswer.split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeGreaterThanOrEqual(25);
      expect(wordCount).toBeLessThanOrEqual(130);
    });

    it('answers "why did stock move" question directly with main finding and causation uncertainty if no news', async () => {
      const bundle = await getStockQuantitativeBundle('RELIANCE');
      const concise = buildConciseStockReport(bundle, 'Why did Reliance fall today?', 'WHY_MOVED');

      // First sentence must be main finding
      expect(concise.conclusion).toMatch(/^\*\*Main finding:\*\*/i);
      expect(concise.supportingEvidence.length).toBeLessThanOrEqual(3);

      // If no news, must state causation cannot be verified
      if (bundle.news.length === 0) {
        expect(concise.formattedAnswer.toLowerCase()).toContain('causation');
      }
    });

    it('answers factual question with exact price and session range without generic fluff', async () => {
      const bundle = await getStockQuantitativeBundle('TCS');
      const concise = buildConciseStockReport(bundle, 'What is the price of TCS?', 'FACTUAL');

      expect(concise.conclusion).toContain('TCS');
      expect(concise.conclusion).toContain('₹');
      // No boilerplate intro like "TCS is an IT company..."
      expect(concise.conclusion.toLowerCase()).not.toContain('major indian multinational');
      expect(concise.conclusion.toLowerCase()).not.toContain('operating across multiple sectors');
    });

    it('generates a concise comparison report with direct conclusion and side-by-side metrics', async () => {
      const [bundleA, bundleB] = await Promise.all([
        getStockQuantitativeBundle('TCS'),
        getStockQuantitativeBundle('INFY'),
      ]);
      const comparison = buildConciseComparisonReport(bundleA, bundleB, 'Compare TCS vs INFY');

      expect(comparison.conclusion).toContain('TCS');
      expect(comparison.conclusion).toContain('INFY');
      expect(comparison.supportingEvidence.length).toBeLessThanOrEqual(3);
      expect(comparison.detailedAnalysis).toContain('Comparative Equity Analysis');
    });
  });

  // 3. Stock-Specific Retrieved Numbers
  describe('Stock-Specific Numbers & Verification', async () => {
    it('matches exact CMP, 50-day SMA, and RSI values in supporting evidence', async () => {
      const bundle = await getStockQuantitativeBundle('RELIANCE');
      const concise = buildConciseStockReport(bundle, 'Technical outlook for Reliance', 'TECHNICAL');

      expect(bundle.quote).toBeDefined();
      // Supporting evidence must contain the real price
      const priceString = bundle.quote!.currentPrice.toLocaleString('en-IN');
      expect(concise.formattedAnswer).toContain(priceString);

      // Must contain technical metrics if calculated
      if (bundle.technicals.rsi14) {
        expect(concise.formattedAnswer).toContain(bundle.technicals.rsi14.rsi.toString());
      }
    });
  });

  // 4. Deterministic Credibility Scoring Engine
  describe('Deterministic Credibility Scoring Engine', () => {
    const mockQuote: StockQuote = {
      symbol: 'INFY',
      exchange: 'NSE',
      companyName: 'Infosys Limited',
      currentPrice: 1500,
      change: 15,
      percentChange: 1.0,
      open: 1490,
      high: 1510,
      low: 1485,
      previousClose: 1485,
      volume: 500000,
      week52High: 1800,
      week52Low: 1300,
      marketCapCrores: 620000,
      lastUpdated: new Date().toISOString(),
      freshness: 'live',
    };

    const mockFundamentals: CompanyFundamentals = {
      symbol: 'INFY',
      exchange: 'NSE',
      companyName: 'Infosys Limited',
      sector: 'Information Technology',
      industry: 'IT Services',
      about: 'IT exporter',
      headquarters: 'Bengaluru',
      marketCapCrores: 620000,
      peRatio: 26.5,
      industryPE: 28.0,
      pbRatio: 7.2,
      eps: 56.6,
      dividendYield: 2.4,
      roe: 31.5,
      roce: 39.8,
      debtToEquity: 0.05,
      bookValuePerShare: 208,
      faceValue: 5,
      promoterHoldingPercent: 14.8,
      fiiHoldingPercent: 34.2,
      diiHoldingPercent: 35.1,
      publicHoldingPercent: 15.9,
      quarterlyResults: [
        { period: 'Q2 FY26', revenueCrores: 40500, profitCrores: 6500, operatingMarginPercent: 21.2 },
      ],
      annualResults: [
        { year: 'FY25', revenueCrores: 153000, profitCrores: 26000 },
      ],
    };

    const mockCandles: OHLCVCandle[] = Array.from({ length: 220 }, (_, i) => ({
      timestamp: `2026-0${(i % 9) + 1}-01`,
      time: 1720000000 + i * 86400,
      open: 1400 + i,
      high: 1420 + i,
      low: 1390 + i,
      close: 1410 + i,
      volume: 400000,
    }));

    it('computes deterministic score with identical inputs producing the exact same score', () => {
      const input = {
        symbol: 'INFY',
        quote: mockQuote,
        fundamentals: mockFundamentals,
        candles: mockCandles,
      };

      const score1 = calculateEvidenceCredibility(input, 'FACTUAL');
      const score2 = calculateEvidenceCredibility(input, 'FACTUAL');

      expect(score1.score).toBe(score2.score);
      expect(score1.rating).toBe(score2.rating);
      expect(score1.score).toBeGreaterThanOrEqual(75);
      expect(score1.rating).toBe('High');
      expect(score1.factors.length).toBe(5);
    });

    it('lowers score when data is missing or candle history is truncated', () => {
      const fullInput = {
        symbol: 'INFY',
        quote: mockQuote,
        fundamentals: mockFundamentals,
        candles: mockCandles,
      };

      const truncatedInput = {
        symbol: 'INFY',
        quote: mockQuote,
        fundamentals: null, // missing fundamentals
        candles: mockCandles.slice(0, 15), // only 15 candles
      };

      const fullResult = calculateEvidenceCredibility(fullInput, 'FACTUAL');
      const truncatedResult = calculateEvidenceCredibility(truncatedInput, 'FACTUAL');

      expect(truncatedResult.score).toBeLessThan(fullResult.score!);
      expect(truncatedResult.limitations.length).toBeGreaterThan(0);
    });

    it('marks score as Unavailable (0) when quote is missing', () => {
      const result = calculateEvidenceCredibility({ quote: null }, 'FACTUAL');

      expect(result.score).toBe(0);
      expect(result.rating).toBe('Unavailable');
    });

    it('marks general educational questions as "Not Scored" with null score', () => {
      const result = calculateEvidenceCredibility({ isEducational: true }, 'EDUCATIONAL');

      expect(result.score).toBeNull();
      expect(result.rating).toBe('Not Scored');
      expect(result.explanation.toLowerCase()).toContain('conceptual');
    });

    it('prominently distinguishes evidence credibility from market outcome prediction', () => {
      const result = calculateEvidenceCredibility(
        { symbol: 'INFY', quote: mockQuote, fundamentals: mockFundamentals, candles: mockCandles },
        'BULLISH_BEARISH'
      );

      // Must clearly state distinction
      expect(result.disclaimer).toContain('Credibility measures the quality');
      expect(result.disclaimer).toContain('not the certainty of the market outlook');
      // Must NOT contain words implying prediction certainty
      expect(result.disclaimer.toLowerCase()).not.toContain('chance of success');
      expect(result.disclaimer.toLowerCase()).not.toContain('prediction probability');
    });
  });

  // 5. End-to-end Pipeline Verification
  describe('End-to-End Pipeline Concise Output & Detailed Analysis', async () => {
    it('returns structured conclusion, supportingEvidence, caveat, and detailedAnalysis in RAGAskResponse', async () => {
      const res = await runGroundedAnalystPipeline('Is Reliance bullish right now?');

      expect(res.conclusion).toBeDefined();
      expect(res.supportingEvidence).toBeDefined();
      expect(res.supportingEvidence!.length).toBeGreaterThan(0);
      expect(res.supportingEvidence!.length).toBeLessThanOrEqual(3);
      expect(res.caveat).toBeDefined();
      expect(res.credibility).toBeDefined();
      expect(res.credibility?.score).toBeGreaterThan(0);
      expect(res.detailedAnalysis).toBeDefined();
      expect(res.detailedAnalysis).toContain('Market Snapshot');
    });
  });
});
