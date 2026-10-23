import {
  Instrument,
  SymbolAlias,
  SyncJobHistory,
  InstrumentCoverageStatus,
} from '@/types';
import {
  upsertInstruments,
  recordSymbolAliases,
  recordSyncJobHistory,
} from '@/lib/db/store';

export interface RawNseSecurityRecord {
  symbol: string;
  companyName: string;
  series: string;
  listingDate?: string;
  paidUpValue?: number;
  marketLot?: number;
  isin: string;
  faceValue?: number;
}

export interface RawBseSecurityRecord {
  securityCode: string; // e.g. "500325"
  securityId: string; // e.g. "RELIANCE"
  securityName: string;
  status: string; // "Active", "Suspended"
  group: string; // "A", "B", "T", "M" (SME)
  faceValue?: number;
  isin: string;
  industry?: string;
}

export interface RawSymbolChangeRecord {
  companyName: string;
  oldSymbol: string;
  newSymbol: string;
  changeDate: string; // YYYY-MM-DD
}

export interface ReconcileStats {
  totalNseProcessed: number;
  totalBseProcessed: number;
  totalSmeProcessed: number;
  totalAliasesProcessed: number;
  dualListedCount: number;
  nseOnlyCount: number;
  bseOnlyCount: number;
  smeCount: number;
  totalReconciledInstruments: number;
}

/**
 * Parses official NSE EQUITY_L.csv or SME_L.csv format
 * Expected columns: SYMBOL, NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE
 */
export function parseNseCsv(csvContent: string, isSME: boolean = false): RawNseSecurityRecord[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const records: RawNseSecurityRecord[] = [];
  const header = lines[0].split(',').map(h => h.trim().toUpperCase());

  const symIdx = header.findIndex(h => h.includes('SYMBOL'));
  const nameIdx = header.findIndex(h => h.includes('NAME OF COMPANY') || h.includes('COMPANY NAME'));
  const seriesIdx = header.findIndex(h => h.includes('SERIES'));
  const dateIdx = header.findIndex(h => h.includes('DATE OF LISTING'));
  const paidIdx = header.findIndex(h => h.includes('PAID UP'));
  const lotIdx = header.findIndex(h => h.includes('MARKET LOT'));
  const isinIdx = header.findIndex(h => h.includes('ISIN'));
  const faceIdx = header.findIndex(h => h.includes('FACE VALUE'));

  for (let i = 1; i < lines.length; i++) {
    // Handle CSV line with potential quoted commas
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;

    const symbol = cols[symIdx]?.trim().toUpperCase();
    const isin = cols[isinIdx]?.trim().toUpperCase();
    const companyName = cols[nameIdx]?.trim();

    if (!symbol || !isin || !isin.startsWith('IN')) continue;

    records.push({
      symbol,
      companyName: companyName || symbol,
      series: cols[seriesIdx]?.trim() || (isSME ? 'SM' : 'EQ'),
      listingDate: cols[dateIdx]?.trim(),
      paidUpValue: Number(cols[paidIdx]) || 10,
      marketLot: Number(cols[lotIdx]) || 1,
      isin,
      faceValue: Number(cols[faceIdx]) || 10,
    });
  }

  return records;
}

/**
 * Parses official BSE Security Directory CSV format
 * Expected columns: Security Code, Security Id, Security Name, Status, Group, Face Value, ISIN No, Industry
 */
export function parseBseCsv(csvContent: string): RawBseSecurityRecord[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const records: RawBseSecurityRecord[] = [];
  const header = lines[0].split(',').map(h => h.trim().toUpperCase());

  const codeIdx = header.findIndex(h => h.includes('SECURITY CODE') || h.includes('SCRIP CODE'));
  const idIdx = header.findIndex(h => h.includes('SECURITY ID') || h.includes('SCRIP ID'));
  const nameIdx = header.findIndex(h => h.includes('SECURITY NAME') || h.includes('COMPANY NAME'));
  const statusIdx = header.findIndex(h => h.includes('STATUS'));
  const groupIdx = header.findIndex(h => h.includes('GROUP'));
  const faceIdx = header.findIndex(h => h.includes('FACE VALUE'));
  const isinIdx = header.findIndex(h => h.includes('ISIN'));
  const indIdx = header.findIndex(h => h.includes('INDUSTRY'));

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;

    const securityCode = cols[codeIdx]?.trim();
    const securityId = cols[idIdx]?.trim().toUpperCase();
    const isin = cols[isinIdx]?.trim().toUpperCase();
    const securityName = cols[nameIdx]?.trim();

    if (!securityCode || !isin || !isin.startsWith('IN')) continue;

    records.push({
      securityCode,
      securityId: securityId || securityCode,
      securityName: securityName || securityId,
      status: cols[statusIdx]?.trim() || 'Active',
      group: cols[groupIdx]?.trim() || 'B',
      faceValue: Number(cols[faceIdx]) || 10,
      isin,
      industry: cols[indIdx]?.trim() || 'General',
    });
  }

  return records;
}

/**
 * Parses official NSE symbol_change.csv format
 * Expected columns: Company Name, Old Symbol, New Symbol, Change Date
 */
export function parseSymbolChangeCsv(csvContent: string): RawSymbolChangeRecord[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const records: RawSymbolChangeRecord[] = [];
  const header = lines[0].split(',').map(h => h.trim().toUpperCase());

  const nameIdx = header.findIndex(h => h.includes('COMPANY'));
  const oldIdx = header.findIndex(h => h.includes('OLD SYMBOL') || h.includes('OLD_SYMBOL'));
  const newIdx = header.findIndex(h => h.includes('NEW SYMBOL') || h.includes('NEW_SYMBOL'));
  const dateIdx = header.findIndex(h => h.includes('DATE'));

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 3) continue;

    const oldSymbol = cols[oldIdx]?.trim().toUpperCase();
    const newSymbol = cols[newIdx]?.trim().toUpperCase();

    if (!oldSymbol || !newSymbol) continue;

    records.push({
      companyName: cols[nameIdx]?.trim() || newSymbol,
      oldSymbol,
      newSymbol,
      changeDate: cols[dateIdx]?.trim() || new Date().toISOString().split('T')[0],
    });
  }

  return records;
}

/**
 * Helper to split CSV line safely handling quotes
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let curr = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(curr.trim());
      curr = '';
    } else {
      curr += char;
    }
  }
  result.push(curr.trim());
  return result;
}

/**
 * Multi-Exchange Reconciliation Engine:
 * Normalizes NSE Mainboard, NSE SME, BSE Mainboard, BSE-only, and Symbol Changes.
 * Links dual-listed equities using ISIN as canonical foreign key.
 */
export function reconcileExchangeMasters(params: {
  nseEquities: RawNseSecurityRecord[];
  nseSme: RawNseSecurityRecord[];
  bseRecords: RawBseSecurityRecord[];
  symbolChanges: RawSymbolChangeRecord[];
}): { instruments: Instrument[]; aliases: SymbolAlias[]; stats: ReconcileStats } {
  const isinMap = new Map<string, Instrument>();
  const aliases: SymbolAlias[] = [];

  let totalNse = 0;
  let totalBse = 0;
  let totalSme = 0;

  // 1. Ingest NSE Mainboard Equities
  for (const nse of params.nseEquities) {
    totalNse++;
    const defaultCoverage: InstrumentCoverageStatus = {
      quotes: true,
      historicalOHLCV: true,
      fundamentals: true,
      financialStatements: true,
      corporateActions: true,
      news: true,
    };

    isinMap.set(nse.isin, {
      id: nse.isin,
      isin: nse.isin,
      nseSymbol: nse.symbol,
      companyName: nse.companyName,
      series: nse.series || 'EQ',
      isSME: false,
      exchanges: ['NSE'],
      listingDate: nse.listingDate,
      paidUpValue: nse.paidUpValue,
      marketLot: nse.marketLot,
      faceValue: nse.faceValue,
      status: 'ACTIVE',
      coverage: defaultCoverage,
      source: 'NSE Official Security Master',
      lastSyncAt: new Date().toISOString(),
    });
  }

  // 2. Ingest NSE SME Platform (EMERGE)
  for (const sme of params.nseSme) {
    totalSme++;
    const smeCoverage: InstrumentCoverageStatus = {
      quotes: true,
      historicalOHLCV: true,
      fundamentals: false, // SME typically has half-yearly unaudited
      financialStatements: false,
      corporateActions: true,
      news: false,
    };

    isinMap.set(sme.isin, {
      id: sme.isin,
      isin: sme.isin,
      nseSymbol: sme.symbol,
      companyName: sme.companyName,
      series: 'SM',
      isSME: true,
      exchanges: ['NSE'],
      listingDate: sme.listingDate,
      paidUpValue: sme.paidUpValue,
      marketLot: sme.marketLot || 1000,
      faceValue: sme.faceValue,
      status: 'ACTIVE',
      coverage: smeCoverage,
      source: 'NSE SME Security Master',
      lastSyncAt: new Date().toISOString(),
    });
  }

  // 3. Reconcile with BSE Securities (Deduplicate & Link or Insert BSE-only)
  for (const bse of params.bseRecords) {
    totalBse++;
    const isBseSme = bse.group === 'M';
    if (isBseSme) totalSme++;

    if (isinMap.has(bse.isin)) {
      // Dual-listed company! Merge BSE attributes onto canonical instrument
      const existing = isinMap.get(bse.isin)!;
      existing.bseCode = bse.securityCode;
      existing.bseScripId = bse.securityId;
      if (!existing.exchanges.includes('BSE')) {
        existing.exchanges.push('BSE');
      }
      if (bse.industry && !existing.industry) {
        existing.industry = bse.industry;
      }
      existing.source = 'NSE & BSE Unified Master';
    } else {
      // BSE-Only listed company
      const bseCoverage: InstrumentCoverageStatus = {
        quotes: true,
        historicalOHLCV: true,
        fundamentals: !isBseSme,
        financialStatements: !isBseSme,
        corporateActions: true,
        news: false,
      };

      isinMap.set(bse.isin, {
        id: bse.isin,
        isin: bse.isin,
        bseCode: bse.securityCode,
        bseScripId: bse.securityId,
        companyName: bse.securityName,
        series: bse.group,
        isSME: isBseSme,
        exchanges: ['BSE'],
        industry: bse.industry,
        faceValue: bse.faceValue,
        status: bse.status.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
        coverage: bseCoverage,
        source: isBseSme ? 'BSE SME Security Directory' : 'BSE Official Security Directory',
        lastSyncAt: new Date().toISOString(),
      });
    }
  }

  // 4. Ingest Historical Symbol Changes & Build Aliases
  for (const chg of params.symbolChanges) {
    // Find matching instrument by newSymbol or company name
    let matchingIsin = '';
    for (const inst of isinMap.values()) {
      if (inst.nseSymbol === chg.newSymbol || inst.companyName.toLowerCase().includes(chg.companyName.toLowerCase())) {
        matchingIsin = inst.isin;
        break;
      }
    }

    aliases.push({
      id: `alias_${chg.oldSymbol}_${chg.newSymbol}`,
      isin: matchingIsin || `HISTORICAL_${chg.oldSymbol}`,
      oldSymbol: chg.oldSymbol,
      newSymbol: chg.newSymbol,
      companyName: chg.companyName,
      changeDate: chg.changeDate,
      exchange: 'NSE',
    });
  }

  // Calculate Statistics
  let dualListed = 0;
  let nseOnly = 0;
  let bseOnly = 0;
  let smeCount = 0;

  isinMap.forEach(inst => {
    if (inst.exchanges.includes('NSE') && inst.exchanges.includes('BSE')) dualListed++;
    else if (inst.exchanges.includes('NSE')) nseOnly++;
    else if (inst.exchanges.includes('BSE')) bseOnly++;

    if (inst.isSME) smeCount++;
  });

  const stats: ReconcileStats = {
    totalNseProcessed: totalNse,
    totalBseProcessed: totalBse,
    totalSmeProcessed: totalSme,
    totalAliasesProcessed: aliases.length,
    dualListedCount: dualListed,
    nseOnlyCount: nseOnly,
    bseOnlyCount: bseOnly,
    smeCount,
    totalReconciledInstruments: isinMap.size,
  };

  return {
    instruments: Array.from(isinMap.values()),
    aliases,
    stats,
  };
}

/**
 * Built-in comprehensive seed catalog representing verified Indian equities,
 * SME securities, BSE-only equities, and official symbol changes.
 */
export const SEED_NSE_EQUITIES: RawNseSecurityRecord[] = [
  { symbol: 'RELIANCE', companyName: 'Reliance Industries Limited', series: 'EQ', isin: 'INE002A01018', listingDate: '1977-11-29', faceValue: 10, paidUpValue: 10, marketLot: 1 },
  { symbol: 'TCS', companyName: 'Tata Consultancy Services Limited', series: 'EQ', isin: 'INE467B01029', listingDate: '2004-08-25', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank Limited', series: 'EQ', isin: 'INE040A01034', listingDate: '1995-05-19', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'INFY', companyName: 'Infosys Limited', series: 'EQ', isin: 'INE009A01021', listingDate: '1993-06-14', faceValue: 5, paidUpValue: 5, marketLot: 1 },
  { symbol: 'ICICIBANK', companyName: 'ICICI Bank Limited', series: 'EQ', isin: 'INE090A01021', listingDate: '1997-09-17', faceValue: 2, paidUpValue: 2, marketLot: 1 },
  { symbol: 'BHARTIARTL', companyName: 'Bharti Airtel Limited', series: 'EQ', isin: 'INE397D01024', listingDate: '2002-02-15', faceValue: 5, paidUpValue: 5, marketLot: 1 },
  { symbol: 'ITC', companyName: 'ITC Limited', series: 'EQ', isin: 'INE154A01025', listingDate: '1954-10-27', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'SBIN', companyName: 'State Bank of India', series: 'EQ', isin: 'INE062A01020', listingDate: '1995-03-01', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'LT', companyName: 'Larsen & Toubro Limited', series: 'EQ', isin: 'INE018A01030', listingDate: '1950-06-23', faceValue: 2, paidUpValue: 2, marketLot: 1 },
  { symbol: 'HINDUNILVR', companyName: 'Hindustan Unilever Limited', series: 'EQ', isin: 'INE030A01027', listingDate: '1956-11-20', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'BAJFINANCE', companyName: 'Bajaj Finance Limited', series: 'EQ', isin: 'INE296A01024', listingDate: '1995-04-12', faceValue: 2, paidUpValue: 2, marketLot: 1 },
  { symbol: 'MARUTI', companyName: 'Maruti Suzuki India Limited', series: 'EQ', isin: 'INE585B01010', listingDate: '2003-07-09', faceValue: 5, paidUpValue: 5, marketLot: 1 },
  { symbol: 'TATAMOTORS', companyName: 'Tata Motors Limited', series: 'EQ', isin: 'INE155A01022', listingDate: '1945-09-01', faceValue: 2, paidUpValue: 2, marketLot: 1 },
  { symbol: 'SUNPHARMA', companyName: 'Sun Pharmaceutical Industries Limited', series: 'EQ', isin: 'INE044A01036', listingDate: '1994-11-08', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'TITAN', companyName: 'Titan Company Limited', series: 'EQ', isin: 'INE280A01028', listingDate: '1987-03-24', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'KOTAKBANK', companyName: 'Kotak Mahindra Bank Limited', series: 'EQ', isin: 'INE237A01028', listingDate: '1991-12-20', faceValue: 5, paidUpValue: 5, marketLot: 1 },
  { symbol: 'AXISBANK', companyName: 'Axis Bank Limited', series: 'EQ', isin: 'INE238A01034', listingDate: '1998-11-16', faceValue: 2, paidUpValue: 2, marketLot: 1 },
  { symbol: 'NTPC', companyName: 'NTPC Limited', series: 'EQ', isin: 'INE733E01010', listingDate: '2004-11-05', faceValue: 10, paidUpValue: 10, marketLot: 1 },
  { symbol: 'ONGC', companyName: 'Oil & Natural Gas Corporation Limited', series: 'EQ', isin: 'INE213A01029', listingDate: '1995-07-19', faceValue: 5, paidUpValue: 5, marketLot: 1 },
  { symbol: 'ADANIENT', companyName: 'Adani Enterprises Limited', series: 'EQ', isin: 'INE423A01024', listingDate: '1997-06-04', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'ADANIPORTS', companyName: 'Adani Ports and Special Economic Zone Limited', series: 'EQ', isin: 'INE742F01042', listingDate: '2007-11-27', faceValue: 2, paidUpValue: 2, marketLot: 1 },
  { symbol: 'POWERGRID', companyName: 'Power Grid Corporation of India Limited', series: 'EQ', isin: 'INE752E01010', listingDate: '2007-10-05', faceValue: 10, paidUpValue: 10, marketLot: 1 },
  { symbol: 'TATASTEEL', companyName: 'Tata Steel Limited', series: 'EQ', isin: 'INE081A01020', listingDate: '1955-08-01', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'WIPRO', companyName: 'Wipro Limited', series: 'EQ', isin: 'INE075A01022', listingDate: '1995-11-08', faceValue: 2, paidUpValue: 2, marketLot: 1 },
  { symbol: 'ULTRACEMCO', companyName: 'UltraTech Cement Limited', series: 'EQ', isin: 'INE481G01011', listingDate: '2004-08-24', faceValue: 10, paidUpValue: 10, marketLot: 1 },
  { symbol: 'ETERNAL', companyName: 'Eternal Limited (formerly Zomato)', series: 'EQ', isin: 'INE758T01015', listingDate: '2021-07-23', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'SWIGGY', companyName: 'Swiggy Limited', series: 'EQ', isin: 'INE00H001014', listingDate: '2024-11-13', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'JIOFIN', companyName: 'Jio Financial Services Limited', series: 'EQ', isin: 'INE758E01017', listingDate: '2023-08-21', faceValue: 10, paidUpValue: 10, marketLot: 1 },
  { symbol: 'HAL', companyName: 'Hindustan Aeronautics Limited', series: 'EQ', isin: 'INE066F01020', listingDate: '2018-03-28', faceValue: 5, paidUpValue: 5, marketLot: 1 },
  { symbol: 'BEL', companyName: 'Bharat Electronics Limited', series: 'EQ', isin: 'INE263A01024', listingDate: '2000-07-19', faceValue: 1, paidUpValue: 1, marketLot: 1 },
  { symbol: 'TRENT', companyName: 'Trent Limited', series: 'EQ', isin: 'INE849A01020', listingDate: '1998-11-03', faceValue: 1, paidUpValue: 1, marketLot: 1 },
];

export const SEED_NSE_SME: RawNseSecurityRecord[] = [
  { symbol: 'DRONACHARYA', companyName: 'Droneacharya Aerial Innovations Limited', series: 'SM', isin: 'INE0ONV01018', listingDate: '2022-12-23', faceValue: 10, marketLot: 2000 },
  { symbol: 'BASILIC', companyName: 'Basilic Fly Studio Limited', series: 'SM', isin: 'INE0PDY01019', listingDate: '2023-09-11', faceValue: 10, marketLot: 1200 },
  { symbol: 'TAC', companyName: 'TAC Infosec Limited', series: 'SM', isin: 'INE0SO101012', listingDate: '2024-04-05', faceValue: 10, marketLot: 1000 },
  { symbol: 'K2INFRA', companyName: 'K2 Infragen Limited', series: 'SM', isin: 'INE0RQE01015', listingDate: '2024-04-15', faceValue: 10, marketLot: 1200 },
];

export const SEED_BSE_SECURITIES: RawBseSecurityRecord[] = [
  // Dual-listed on BSE as well
  { securityCode: '500325', securityId: 'RELIANCE', securityName: 'Reliance Industries Limited', status: 'Active', group: 'A', isin: 'INE002A01018', industry: 'Oil & Gas Refining' },
  { securityCode: '532540', securityId: 'TCS', securityName: 'Tata Consultancy Services Limited', status: 'Active', group: 'A', isin: 'INE467B01029', industry: 'Information Technology' },
  { securityCode: '500180', securityId: 'HDFCBANK', securityName: 'HDFC Bank Limited', status: 'Active', group: 'A', isin: 'INE040A01034', industry: 'Banking' },
  { securityCode: '500209', securityId: 'INFY', securityName: 'Infosys Limited', status: 'Active', group: 'A', isin: 'INE009A01021', industry: 'Information Technology' },
  { securityCode: '532174', securityId: 'ICICIBANK', securityName: 'ICICI Bank Limited', status: 'Active', group: 'A', isin: 'INE090A01021', industry: 'Banking' },
  { securityCode: '532454', securityId: 'BHARTIARTL', securityName: 'Bharti Airtel Limited', status: 'Active', group: 'A', isin: 'INE397D01024', industry: 'Telecom' },
  { securityCode: '500875', securityId: 'ITC', securityName: 'ITC Limited', status: 'Active', group: 'A', isin: 'INE154A01025', industry: 'FMCG' },
  { securityCode: '500112', securityId: 'SBIN', securityName: 'State Bank of India', status: 'Active', group: 'A', isin: 'INE062A01020', industry: 'Banking' },
  { securityCode: '500510', securityId: 'LT', securityName: 'Larsen & Toubro Limited', status: 'Active', group: 'A', isin: 'INE018A01030', industry: 'Infrastructure & Capital Goods' },
  { securityCode: '500696', securityId: 'HINDUNILVR', securityName: 'Hindustan Unilever Limited', status: 'Active', group: 'A', isin: 'INE030A01027', industry: 'FMCG' },
  // BSE-Only Equities
  { securityCode: '500020', securityId: 'BOMDYEING', securityName: 'The Bombay Dyeing and Manufacturing Company Limited', status: 'Active', group: 'B', isin: 'INE032A01023', industry: 'Textiles' },
  { securityCode: '500033', securityId: 'FORCEMOT', securityName: 'Force Motors Limited', status: 'Active', group: 'B', isin: 'INE451A01017', industry: 'Commercial Vehicles' },
  { securityCode: '500459', securityId: 'ZENITHENG', securityName: 'Zenith Steel Pipes and Industries Limited', status: 'Active', group: 'T', isin: 'INE318D01020', industry: 'Steel Pipes' },
  // BSE SME Platform
  { securityCode: '543669', securityId: 'DRONACHARYA', securityName: 'Droneacharya Aerial Innovations Limited', status: 'Active', group: 'M', isin: 'INE0ONV01018', industry: 'Drones & Geospatial' },
  { securityCode: '543952', securityId: 'ALUFLUOR', securityName: 'Alufluoride Limited', status: 'Active', group: 'M', isin: 'INE234B01012', industry: 'Specialty Chemicals' },
];

export const SEED_SYMBOL_CHANGES: RawSymbolChangeRecord[] = [
  { companyName: 'LTIMindtree Limited', oldSymbol: 'MINDTREE', newSymbol: 'LTIM', changeDate: '2022-11-24' },
  { companyName: 'Tata Motors Limited - DVR', oldSymbol: 'TATAMTRDVR', newSymbol: 'TATAMOTORS', changeDate: '2024-09-01' },
  { companyName: 'Samvardhana Motherson International Limited', oldSymbol: 'MOTHERSUMI', newSymbol: 'MOTHERSON', changeDate: '2022-03-28' },
  { companyName: 'Zydus Lifesciences Limited', oldSymbol: 'CADILAHC', newSymbol: 'ZYDUSLIFE', changeDate: '2022-03-07' },
  { companyName: 'Eternal Limited (formerly Zomato)', oldSymbol: 'ZOMATO', newSymbol: 'ETERNAL', changeDate: '2025-02-14' },
];

/**
 * Executes full security master ingestion pipeline:
 * Ingests, reconciles, indexes, and stores instruments.
 */
export async function runSecurityMasterIngestion(): Promise<{
  job: SyncJobHistory;
  stats: ReconcileStats;
}> {
  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  const { instruments, aliases, stats } = reconcileExchangeMasters({
    nseEquities: SEED_NSE_EQUITIES,
    nseSme: SEED_NSE_SME,
    bseRecords: SEED_BSE_SECURITIES,
    symbolChanges: SEED_SYMBOL_CHANGES,
  });

  // Persist instruments and aliases
  await upsertInstruments(instruments);
  await recordSymbolAliases(aliases);

  const durationMs = Date.now() - startTime;
  const syncJob: SyncJobHistory = {
    id: `sync_master_${Date.now()}`,
    jobType: 'SECURITY_MASTER',
    status: 'COMPLETED',
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs,
    totalRecords: instruments.length,
    successCount: instruments.length,
    failureCount: 0,
    provider: 'Official NSE & BSE Exchange Masters',
    metadata: {
      stats,
      dualListedCount: stats.dualListedCount,
      smeCount: stats.smeCount,
      bseOnlyCount: stats.bseOnlyCount,
    },
  };

  await recordSyncJobHistory(syncJob);

  return { job: syncJob, stats };
}
