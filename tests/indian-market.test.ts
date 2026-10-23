import { describe, it, expect } from 'vitest';
import {
  formatINR,
  formatCrores,
  formatPercent,
  formatVolume,
  normalizeIndianSymbol,
  getMarketSessionStatus,
} from '@/lib/utils/indian-market';
import {
  getStockQuote,
  getStockFundamentals,
  searchIndianStocks,
  getMarketIndices,
} from '@/lib/market-data';

describe('Indian Market Conventions & Utilities', () => {
  it('formats Indian Rupee currency correctly with Indian digit grouping', () => {
    expect(formatINR(1234.50)).toBe('₹1,234.50');
    expect(formatINR(1234567.89)).toBe('₹12,34,567.89');
    expect(formatINR(0)).toBe('₹0.00');
    expect(formatINR(-5432.10)).toBe('-₹5,432.10');
  });

  it('formats large figures into Crores and Lakh Crores', () => {
    // 20,00,000 Cr -> ₹20.00 Lakh Cr (e.g. Reliance Market Cap)
    expect(formatCrores(2018500)).toBe('₹20.18 Lakh Cr');
    // 45,000 Cr -> ₹45,000 Cr
    expect(formatCrores(45000)).toBe('₹45,000 Cr');
    expect(formatCrores(0)).toBe('₹0 Cr');
  });

  it('formats percentage with explicit +/- signs', () => {
    expect(formatPercent(1.45)).toBe('+1.45%');
    expect(formatPercent(-0.82)).toBe('-0.82%');
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('formats Indian equity volume into readable Indian units', () => {
    expect(formatVolume(15000000)).toBe('1.50 Cr');
    expect(formatVolume(250000)).toBe('2.50 L');
    expect(formatVolume(1500)).toBe('1.5 K');
  });

  it('normalizes Indian symbols across NSE, BSE, and tickers', () => {
    const rel = normalizeIndianSymbol('RELIANCE.NS');
    expect(rel.cleanSymbol).toBe('RELIANCE');
    expect(rel.nseSymbol).toBe('RELIANCE.NS');
    expect(rel.bseSymbol).toBe('RELIANCE.BO');

    const tcs = normalizeIndianSymbol('tcs.bo');
    expect(tcs.cleanSymbol).toBe('TCS');
    expect(tcs.nseSymbol).toBe('TCS.NS');
  });

  it('evaluates market session status in IST', () => {
    const session = getMarketSessionStatus();
    expect(session).toBeDefined();
    expect(['PRE_OPEN', 'REGULAR', 'POST_CLOSING', 'CLOSED', 'HOLIDAY']).toContain(session.status);
    expect(session.istTime).toContain('IST');
  });
});

describe('Indian Market Data Provider', () => {
  it('retrieves major Indian benchmark indices', async () => {
    const indices = await getMarketIndices();
    expect(indices.length).toBeGreaterThanOrEqual(4);
    const nifty = indices.find(i => i.symbol === '^NSEI');
    expect(nifty).toBeDefined();
    expect(nifty?.name).toBe('NIFTY 50');
    expect(nifty?.currentValue).toBeGreaterThan(20000);
  });

  it('retrieves quotes and fundamentals for Indian listed companies', async () => {
    const quote = await getStockQuote('RELIANCE');
    expect(quote).toBeDefined();
    expect(quote?.exchange).toBe('NSE');
    expect(quote?.currentPrice).toBeGreaterThan(1000);

    const fundamentals = await getStockFundamentals('TCS');
    expect(fundamentals).toBeDefined();
    expect(fundamentals?.sector).toBe('Information Technology');
    expect(fundamentals?.roce).toBeGreaterThan(25);
    expect(fundamentals?.promoterHoldingPercent).toBeGreaterThan(50);
  });

  it('searches and filters Indian stocks', async () => {
    const searchRes = await searchIndianStocks('HDFC');
    expect(searchRes.length).toBeGreaterThan(0);
    expect(searchRes[0].symbol).toBe('HDFCBANK');

    const itStocks = await searchIndianStocks('', { sector: 'Information Technology' });
    expect(itStocks.some(s => s.symbol === 'TCS')).toBe(true);
    expect(itStocks.some(s => s.symbol === 'INFY')).toBe(true);
  });
});
