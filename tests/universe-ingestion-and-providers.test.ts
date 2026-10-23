import { describe, it, expect } from 'vitest';
import {
  parseNseCsv,
  parseBseCsv,
  parseSymbolChangeCsv,
  reconcileExchangeMasters,
  SEED_NSE_EQUITIES,
  SEED_NSE_SME,
  SEED_BSE_SECURITIES,
  SEED_SYMBOL_CHANGES,
} from '@/lib/market-data/ingestion';
import {
  TrueDataProvider,
  EODHDProvider,
  HybridProvider,
  getMarketDataProvider,
} from '@/lib/market-data/providers';
import {
  searchUniverseInstruments,
  upsertInstruments,
  recordSymbolAliases,
  resolveSymbolAlias,
  getUniverseStatistics,
} from '@/lib/db/store';

describe('A. Security Master Ingestion & Multi-Exchange Reconciliation', () => {
  it('parses official NSE EQUITY_L.csv format with headers and quotes', () => {
    const sampleCsv = `SYMBOL,NAME OF COMPANY,SERIES,DATE OF LISTING,PAID UP VALUE,MARKET LOT,ISIN NUMBER,FACE VALUE
RELIANCE,"Reliance Industries Limited",EQ,29-NOV-1977,10,1,INE002A01018,10
TCS,"Tata Consultancy Services Limited",EQ,25-AUG-2004,1,1,INE467B01029,1`;

    const records = parseNseCsv(sampleCsv);
    expect(records.length).toBe(2);
    expect(records[0].symbol).toBe('RELIANCE');
    expect(records[0].isin).toBe('INE002A01018');
    expect(records[0].series).toBe('EQ');
    expect(records[0].marketLot).toBe(1);
    expect(records[1].symbol).toBe('TCS');
  });

  it('parses official BSE Security Directory CSV format', () => {
    const sampleCsv = `Security Code,Security Id,Security Name,Status,Group,Face Value,ISIN No,Industry
500325,RELIANCE,"Reliance Industries Limited",Active,A,10,INE002A01018,Oil & Gas Refining
500020,BOMDYEING,"Bombay Dyeing & Mfg. Co. Ltd.",Active,B,2,INE032A01023,Textiles`;

    const records = parseBseCsv(sampleCsv);
    expect(records.length).toBe(2);
    expect(records[0].securityCode).toBe('500325');
    expect(records[0].securityId).toBe('RELIANCE');
    expect(records[0].isin).toBe('INE002A01018');
    expect(records[1].securityCode).toBe('500020');
  });

  it('parses NSE symbol change CSV format', () => {
    const sampleCsv = `Company Name,Old Symbol,New Symbol,Change Date
"LTIMindtree Limited",MINDTREE,LTIM,2022-11-24
"Tata Motors Limited - DVR",TATAMTRDVR,TATAMOTORS,2024-09-01`;

    const records = parseSymbolChangeCsv(sampleCsv);
    expect(records.length).toBe(2);
    expect(records[0].oldSymbol).toBe('MINDTREE');
    expect(records[0].newSymbol).toBe('LTIM');
  });

  it('deduplicates and links dual-listed equities using ISIN as canonical key', () => {
    const { instruments, stats } = reconcileExchangeMasters({
      nseEquities: SEED_NSE_EQUITIES,
      nseSme: SEED_NSE_SME,
      bseRecords: SEED_BSE_SECURITIES,
      symbolChanges: SEED_SYMBOL_CHANGES,
    });

    // Check Reliance is unified
    const reliance = instruments.find(i => i.isin === 'INE002A01018');
    expect(reliance).toBeDefined();
    expect(reliance?.nseSymbol).toBe('RELIANCE');
    expect(reliance?.bseCode).toBe('500325');
    expect(reliance?.bseScripId).toBe('RELIANCE');
    expect(reliance?.exchanges).toContain('NSE');
    expect(reliance?.exchanges).toContain('BSE');
    expect(stats.dualListedCount).toBeGreaterThan(0);
  });

  it('preserves BSE-only listed securities', () => {
    const { instruments } = reconcileExchangeMasters({
      nseEquities: SEED_NSE_EQUITIES,
      nseSme: SEED_NSE_SME,
      bseRecords: SEED_BSE_SECURITIES,
      symbolChanges: SEED_SYMBOL_CHANGES,
    });

    const bomdyeing = instruments.find(i => i.bseCode === '500020');
    expect(bomdyeing).toBeDefined();
    expect(bomdyeing?.exchanges).toEqual(['BSE']);
    expect(bomdyeing?.nseSymbol).toBeUndefined();
  });

  it('correctly classifies SME platform securities across NSE EMERGE and BSE SME', () => {
    const { instruments } = reconcileExchangeMasters({
      nseEquities: SEED_NSE_EQUITIES,
      nseSme: SEED_NSE_SME,
      bseRecords: SEED_BSE_SECURITIES,
      symbolChanges: SEED_SYMBOL_CHANGES,
    });

    const dronacharya = instruments.find(i => i.nseSymbol === 'DRONACHARYA');
    expect(dronacharya).toBeDefined();
    expect(dronacharya?.isSME).toBe(true);
    expect(dronacharya?.series).toBe('SM');

    const alufluor = instruments.find(i => i.bseScripId === 'ALUFLUOR');
    expect(alufluor).toBeDefined();
    expect(alufluor?.isSME).toBe(true);
  });
});

describe('B. Provider Abstraction & Dataset Coverage Matrix', () => {
  it('TrueDataProvider truthful coverage and limitation reporting', async () => {
    const td = new TrueDataProvider();
    expect(td.name).toBe('TrueData');
    expect(td.capabilities.supportsRealtimeWebSocket).toBe(true);
    expect(td.capabilities.supportsSME).toBe(true);

    // TrueData limitation: Does NOT fabricate financial statements or news
    const stmts = await td.getFinancialStatements('RELIANCE');
    expect(stmts).toEqual([]);
    const news = await td.getNews('RELIANCE');
    expect(news).toEqual([]);

    const coverage = await td.getCoverageStatus('RELIANCE');
    expect(coverage.quotes).toBe(true);
    expect(coverage.historicalOHLCV).toBe(true);
    expect(coverage.financialStatements).toBe(false);
    expect(coverage.news).toBe(false);
  });

  it('EODHDProvider provides multi-year OHLCV, statements, and sentiment news', async () => {
    const eodhd = new EODHDProvider();
    expect(eodhd.capabilities.supportsFinancialStatements).toBe(true);
    expect(eodhd.capabilities.supportsNews).toBe(true);

    const stmts = await eodhd.getFinancialStatements('RELIANCE');
    expect(stmts.length).toBeGreaterThan(0);
    expect(stmts[0].statementType).toBe('INCOME_STATEMENT');

    const news = await eodhd.getNews('RELIANCE');
    expect(news.length).toBeGreaterThan(0);
    expect(news[0].source).toBeDefined();
  });

  it('HybridProvider orchestrates all feeds and resolves coverage gracefully', async () => {
    const hybrid = new HybridProvider();
    const coverage = await hybrid.getCoverageStatus('RELIANCE');
    expect(coverage.quotes).toBe(true);
    expect(coverage.historicalOHLCV).toBe(true);
    expect(coverage.financialStatements).toBe(true);
    expect(coverage.corporateActions).toBe(true);
    expect(coverage.news).toBe(true);

    // SME coverage gracefully reflects that SME does not have full quarterly statements
    const smeCoverage = await hybrid.getCoverageStatus('DRONACHARYA');
    expect(smeCoverage.quotes).toBe(true);
    expect(smeCoverage.financialStatements).toBe(false);
  });

  it('getMarketDataProvider factory supports switching and defaults to HYBRID', () => {
    const provider = getMarketDataProvider('HYBRID');
    expect(provider).toBeInstanceOf(HybridProvider);

    const trueDataProvider = getMarketDataProvider('TRUEDATA');
    expect(trueDataProvider).toBeInstanceOf(TrueDataProvider);

    const eodhdProvider = getMarketDataProvider('EODHD');
    expect(eodhdProvider).toBeInstanceOf(EODHDProvider);
  });
});

describe('C. Global Universe Search, Aliases, and Pagination', () => {
  it('resolves historical symbol aliases and redirects old symbols', async () => {
    await recordSymbolAliases([
      {
        id: 'alias_MINDTREE_LTIM',
        isin: 'INE214T01019',
        oldSymbol: 'MINDTREE',
        newSymbol: 'LTIM',
        companyName: 'LTIMindtree Limited',
        changeDate: '2022-11-24',
        exchange: 'NSE',
      },
    ]);

    const alias = await resolveSymbolAlias('MINDTREE');
    expect(alias).toBeDefined();
    expect(alias?.newSymbol).toBe('LTIM');
  });

  it('searches universe by ISIN, BSE code, and symbol with pagination', async () => {
    const { instruments } = reconcileExchangeMasters({
      nseEquities: SEED_NSE_EQUITIES,
      nseSme: SEED_NSE_SME,
      bseRecords: SEED_BSE_SECURITIES,
      symbolChanges: SEED_SYMBOL_CHANGES,
    });
    await upsertInstruments(instruments);

    // Search by ISIN
    const isinResult = await searchUniverseInstruments({ query: 'INE002A01018' });
    expect(isinResult.instruments.length).toBe(1);
    expect(isinResult.instruments[0].nseSymbol).toBe('RELIANCE');

    // Search by BSE Scrip Code
    const bseResult = await searchUniverseInstruments({ query: '500325' });
    expect(bseResult.instruments.length).toBe(1);
    expect(bseResult.instruments[0].bseCode).toBe('500325');

    // Pagination test
    const page1 = await searchUniverseInstruments({ page: 1, limit: 5 });
    expect(page1.instruments.length).toBe(5);
    expect(page1.page).toBe(1);
    expect(page1.totalPages).toBeGreaterThan(1);
  });

  it('computes accurate universe diagnostics statistics', async () => {
    const stats = await getUniverseStatistics();
    expect(stats.totalInstruments).toBeGreaterThan(0);
    expect(stats.nseCount).toBeGreaterThan(0);
    expect(stats.bseCount).toBeGreaterThan(0);
    expect(stats.smeCount).toBeGreaterThan(0);
    expect(stats.providerCoverage.quotesPercent).toBeGreaterThan(0);
  });
});
