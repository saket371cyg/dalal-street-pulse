import { NextResponse } from 'next/server';
import { fetchLiveIndianFinancialNews } from '@/lib/market-data/news';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'ALL';
    const symbol = searchParams.get('symbol') || undefined;
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const news = await fetchLiveIndianFinancialNews({
      category: category !== 'ALL' ? category : undefined,
      symbol,
      limit,
    });

    return NextResponse.json(
      {
        count: news.length,
        category,
        symbol: symbol || null,
        news,
        fetchedAt: new Date().toISOString(),
        source: 'Live Indian Financial Media (Economic Times, Livemint, Moneycontrol, Business Standard)',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=360',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
