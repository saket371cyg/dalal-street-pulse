import { describe, it, expect } from 'vitest';
import {
  getWatchlistsByUserId,
  createWatchlist,
  addStockToWatchlist,
  removeStockFromWatchlist,
  createPriceAlert,
  getAlertsByUserId,
} from '@/lib/db/store';
import { evaluatePriceAlerts } from '@/lib/alerts';
import { analyzeIndianStock, askAIAnalyst } from '@/lib/ai';

describe('Watchlists & Alerts Persistence', () => {
  const testUserId = `test_user_${Date.now()}`;

  it('creates and manages watchlists with stock deduplication', async () => {
    const wl = await createWatchlist(testUserId, 'Banking Tech', ['HDFCBANK']);
    expect(wl).toBeDefined();
    expect(wl.name).toBe('Banking Tech');
    expect(wl.symbols).toContain('HDFCBANK');

    // Add duplicate stock (should not create duplicate entries)
    const updated = await addStockToWatchlist(testUserId, wl.id, 'HDFCBANK');
    expect(updated?.symbols.filter(s => s === 'HDFCBANK').length).toBe(1);

    // Add another stock
    const withTcs = await addStockToWatchlist(testUserId, wl.id, 'TCS');
    expect(withTcs?.symbols).toContain('TCS');

    // Remove stock
    const removed = await removeStockFromWatchlist(testUserId, wl.id, 'HDFCBANK');
    expect(removed?.symbols).not.toContain('HDFCBANK');
  });

  it('creates and evaluates price alerts', async () => {
    const alert = await createPriceAlert({
      userId: testUserId,
      symbol: 'RELIANCE',
      exchange: 'NSE',
      companyName: 'Reliance Industries Ltd.',
      condition: 'PRICE_ABOVE',
      thresholdValue: 2000, // Price is currently ~2984, so this should trigger
      initialPrice: 2984.50,
      active: true,
      notes: 'Test breakout alert',
    });

    expect(alert).toBeDefined();
    expect(alert.active).toBe(true);
    expect(alert.triggered).toBe(false);

    // Evaluate alerts
    const evalResult = await evaluatePriceAlerts();
    expect(evalResult).toBeDefined();
    expect(evalResult.checkedCount).toBeGreaterThan(0);
  });
});

describe('AI Intelligence & Groundedness', () => {
  it('generates grounded AI fundamental analysis for an Indian stock', async () => {
    const analysis = await analyzeIndianStock('RELIANCE');
    expect(analysis).toBeDefined();
    expect(analysis?.symbol).toBe('RELIANCE');
    expect(analysis?.fundamentalHealthScore).toBeGreaterThanOrEqual(1);
    expect(analysis?.fundamentalHealthScore).toBeLessThanOrEqual(10);
    expect(analysis?.strengths.length).toBeGreaterThan(0);
    expect(analysis?.risksAndUncertainties.length).toBeGreaterThan(0);
    expect(analysis?.sourcesGrounded.length).toBeGreaterThan(0);
  });

  it('answers educational questions with grounded Indian financial concepts', async () => {
    const peResponse = await askAIAnalyst('What is the P/E ratio in Indian markets?');
    expect(peResponse.answer).toContain('P/E');
    expect(peResponse.groundedSources.length).toBeGreaterThan(0);

    const roceResponse = await askAIAnalyst('Explain ROCE');
    expect(roceResponse.answer).toContain('ROCE');
  });
});
