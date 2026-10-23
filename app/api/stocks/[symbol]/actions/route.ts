import { NextResponse } from 'next/server';
import { getCorporateActionsForStock } from '@/lib/market-data';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const cleanSym = symbol.toUpperCase().trim();

    const actions = await getCorporateActionsForStock(cleanSym);

    return NextResponse.json(
      {
        symbol: cleanSym,
        available: actions.length > 0,
        source: 'NSE & BSE Corporate Disclosures Feed',
        count: actions.length,
        actions,
        lastFetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
