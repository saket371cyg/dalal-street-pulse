import { NextResponse } from 'next/server';
import {
  getStockQuote,
  getStockFundamentals,
  getInstrumentCoverage,
} from '@/lib/market-data';
import { analyzeIndianStock } from '@/lib/ai';
import { getInstrumentBySymbol, resolveSymbolAlias } from '@/lib/db/store';
import { InstrumentCoverageStatus } from '@/types';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const cleanSym = symbol.toUpperCase().trim();

    const { searchParams } = new URL(req.url);
    const reqExchange = (searchParams.get('exchange')?.toUpperCase() as 'NSE' | 'BSE') || undefined;

    // Check if alias redirect exists
    const alias = await resolveSymbolAlias(cleanSym);
    const targetSymbol = alias ? alias.newSymbol : cleanSym;

    const [quote, fundamentals, instrument, coverage, aiAnalysis] = await Promise.all([
      getStockQuote(targetSymbol, reqExchange),
      getStockFundamentals(targetSymbol),
      getInstrumentBySymbol(targetSymbol),
      getInstrumentCoverage(targetSymbol),
      analyzeIndianStock(targetSymbol),
    ]);

    if (!quote && !instrument) {
      return NextResponse.json(
        { error: `Indian stock symbol '${cleanSym}' not found on NSE or BSE.` },
        { status: 404 }
      );
    }

    const effectiveQuote = quote || {
      symbol: targetSymbol,
      exchange: instrument?.exchanges[0] || 'NSE',
      companyName: instrument?.companyName || targetSymbol,
      currentPrice: 0,
      change: 0,
      percentChange: 0,
      open: 0,
      high: 0,
      low: 0,
      previousClose: 0,
      volume: 0,
      week52High: 0,
      week52Low: 0,
      marketCapCrores: 0,
      lastUpdated: instrument?.lastSyncAt || new Date().toISOString(),
      freshness: 'unavailable' as const,
    };

    const effectiveCoverage: InstrumentCoverageStatus = {
      quotes: effectiveQuote.currentPrice > 0 || Boolean(coverage?.quotes),
      historicalOHLCV: effectiveQuote.currentPrice > 0 || Boolean(coverage?.historicalOHLCV),
      fundamentals: !!fundamentals,
      financialStatements: coverage?.financialStatements ?? false,
      corporateActions: coverage?.corporateActions ?? false,
      news: coverage?.news ?? false,
    };

    return NextResponse.json({
      quote: effectiveQuote,
      instrument,
      coverage: effectiveCoverage,
      fundamentals,
      aiAnalysis,
      aliasRedirect: alias
        ? {
            searchedSymbol: cleanSym,
            currentSymbol: alias.newSymbol,
            effectiveDate: alias.changeDate,
          }
        : null,
      sourceAttribution: instrument?.source || 'NSE & BSE Unified Master',
      lastRefreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
