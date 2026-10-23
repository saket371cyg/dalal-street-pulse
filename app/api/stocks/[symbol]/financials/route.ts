import { NextResponse } from 'next/server';
import { getFinancialStatementsForStock, getStockFundamentals } from '@/lib/market-data';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const cleanSym = symbol.toUpperCase().trim();

    const [statements, fundamentals] = await Promise.all([
      getFinancialStatementsForStock(cleanSym),
      getStockFundamentals(cleanSym),
    ]);

    const hasData = statements.length > 0 || (fundamentals && fundamentals.quarterlyResults.length > 0);

    return NextResponse.json(
      {
        symbol: cleanSym,
        available: hasData,
        source: 'EODHD & Exchange Quarterly Filings',
        statements,
        quarterlyResults: fundamentals?.quarterlyResults || [],
        annualResults: fundamentals?.annualResults || [],
        lastFetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
