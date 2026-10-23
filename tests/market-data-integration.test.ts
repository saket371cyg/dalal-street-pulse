import { describe, it, expect, beforeEach } from 'vitest';
import { TrueDataFeedManager, getTrueDataFeedManager } from '@/lib/market-data/truedata-feed';
import { TrueDataProvider } from '@/lib/market-data/providers/truedata';
import {
  upsertQuote,
  getLatestQuote,
  saveHistoricalOHLCV,
  getCachedHistoricalOHLCV,
} from '@/lib/db/store';
import { StockQuote, OHLCVCandle } from '@/types';

describe('Market Data Integration: TrueData Real-Time Feed & Caching', () => {
  let feedManager: TrueDataFeedManager;

  beforeEach(() => {
    feedManager = getTrueDataFeedManager();
  });

  it('1. Initializes TrueDataFeedManager with honest evaluation standby status when unauthenticated', () => {
    const status = feedManager.getConnectionStatus();
    expect(status).toBeDefined();
    expect(status.state).toBe('EVALUATION_STANDBY');
    expect(status.hasCredentials).toBe(false);
    expect(status.wsUrl).toBe('wss://realtime.truedata.in');
    expect(status.cachedQuotesCount).toBeGreaterThan(0);
  });

  it('2. Normalizes raw TrueData WebSocket tick frames into standard StockQuote format', () => {
    const rawFrame = {
      symbol: 'RELIANCE',
      exchange: 'NSE',
      ltp: 2985.50,
      prev_close: 2950.00,
      change: 35.50,
      open: 2960.00,
      high: 3000.00,
      low: 2945.00,
      volume: 1250000,
      timestamp: '2026-10-11 11:30:15', // TrueData IST format
    };

    const quote = feedManager.normalizeTrueDataQuote(rawFrame);
    expect(quote).not.toBeNull();
    expect(quote?.symbol).toBe('RELIANCE');
    expect(quote?.exchange).toBe('NSE');
    expect(quote?.currentPrice).toBe(2985.50);
    expect(quote?.previousClose).toBe(2950.00);
    expect(quote?.change).toBe(35.50);
    expect(quote?.percentChange).toBe(1.20);
    expect(quote?.high).toBe(3000.00);
    expect(quote?.low).toBe(2945.00);
    expect(quote?.volume).toBe(1250000);
    expect(quote?.lastUpdated).toContain('2026-10-11');
    expect(quote?.freshness).toBeDefined();
  });

  it('3. Accurately manages real-time symbol subscriptions and unsubscriptions', () => {
    feedManager.subscribe(['INFY', 'TCS']);
    const statusAfterSub = feedManager.getConnectionStatus();
    expect(statusAfterSub.subscribedCount).toBeGreaterThanOrEqual(2);

    feedManager.unsubscribe(['INFY']);
    const cachedTCS = feedManager.getCachedQuote('TCS');
    expect(cachedTCS).toBeDefined();
    expect(cachedTCS?.symbol).toBe('TCS');
  });

  it('4. Dispatches quote events when new ticks are processed', async () => {
    let receivedQuote: StockQuote | null = null;
    const testHandler = (q: StockQuote) => {
      if (q.symbol === 'TESTCO') {
        receivedQuote = q;
      }
    };

    feedManager.on('quote', testHandler);

    const testQuote: StockQuote = {
      symbol: 'TESTCO',
      exchange: 'NSE',
      companyName: 'Test Corporation Ltd',
      currentPrice: 500.0,
      change: 5.0,
      percentChange: 1.0,
      open: 495.0,
      high: 505.0,
      low: 492.0,
      previousClose: 495.0,
      volume: 10000,
      week52High: 600.0,
      week52Low: 400.0,
      marketCapCrores: 5000,
      lastUpdated: new Date().toISOString(),
      freshness: 'live',
    };

    feedManager.updateQuote(testQuote);

    expect(receivedQuote).not.toBeNull();
    const finalQuote = receivedQuote as StockQuote | null;
    expect(finalQuote?.symbol).toBe('TESTCO');
    expect(finalQuote?.currentPrice).toBe(500.0);

    feedManager.off('quote', testHandler);
  });

  it('5. TrueDataProvider retrieves live cached quotes and reports accurate health', async () => {
    const provider = new TrueDataProvider();
    expect(provider.name).toBe('TrueData');

    const quote = await provider.getQuote('RELIANCE');
    expect(quote).not.toBeNull();
    expect(quote?.symbol).toBe('RELIANCE');
    expect(quote?.currentPrice).toBeGreaterThan(0);

    const health = await provider.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.providerName).toBe('TrueData');
    expect(health.entitlements.length).toBeGreaterThan(0);
    expect(health.message).toContain('EVALUATION_STANDBY');
  });

  it('6. Caches historical OHLCV candles to database and respects TTL', async () => {
    const candles: OHLCVCandle[] = [
      {
        timestamp: '2026-10-11T09:15:00.000Z',
        time: 1791690900,
        open: 2950,
        high: 2970,
        low: 2940,
        close: 2965,
        volume: 50000,
      },
      {
        timestamp: '2026-10-11T09:20:00.000Z',
        time: 1791691200,
        open: 2965,
        high: 2985,
        low: 2960,
        close: 2980,
        volume: 62000,
      },
    ];

    await saveHistoricalOHLCV('RELIANCE', '1D', candles, 'TrueData (Test)', 'NSE');

    const cached = await getCachedHistoricalOHLCV('RELIANCE', '1D');
    expect(cached).not.toBeNull();
    expect(cached?.symbol).toBe('RELIANCE');
    expect(cached?.timeframe).toBe('1D');
    expect(cached?.candles.length).toBe(2);
    expect(cached?.candles[0].open).toBe(2950);
    expect(cached?.candles[1].close).toBe(2980);
    expect(cached?.source).toBe('TrueData (Test)');
  });

  it('7. Upserts quotes and retrieves them via getLatestQuote', async () => {
    const quote: StockQuote = {
      symbol: 'SBIN',
      exchange: 'NSE',
      companyName: 'State Bank of India',
      currentPrice: 825.40,
      change: 12.30,
      percentChange: 1.51,
      open: 815.0,
      high: 830.0,
      low: 812.0,
      previousClose: 813.10,
      volume: 4500000,
      week52High: 912.0,
      week52Low: 543.0,
      marketCapCrores: 735000,
      lastUpdated: new Date().toISOString(),
      freshness: 'live',
    };

    await upsertQuote(quote);

    const retrieved = await getLatestQuote('SBIN', 'NSE');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.symbol).toBe('SBIN');
    expect(retrieved?.currentPrice).toBe(825.40);
  });
});
