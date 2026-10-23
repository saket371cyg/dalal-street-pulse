import { NextResponse } from 'next/server';
import { getIndianFinancialNews } from '@/lib/market-data';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const cleanSym = symbol.toUpperCase().trim();

    const news = await getIndianFinancialNews(cleanSym);

    return NextResponse.json(
      {
        symbol: cleanSym,
        available: news.length > 0,
        source: 'Indian Financial Media & Exchange Press Releases',
        count: news.length,
        news,
        lastFetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=180, stale-while-revalidate=360',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
