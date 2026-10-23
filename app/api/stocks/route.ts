import { NextResponse } from 'next/server';
import {
  searchUniverseStockCatalog,
  getMarketIndices,
  getMarketMovers,
} from '@/lib/market-data';
import { getMarketSessionStatus } from '@/lib/utils/indian-market';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const exchange = (searchParams.get('exchange') as any) || 'ALL';
    const segment = (searchParams.get('segment') as any) || 'ALL';
    const sector = searchParams.get('sector') || 'ALL';
    const marketCap = (searchParams.get('cap') as any) || 'ALL';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const mode = searchParams.get('mode');

    if (mode === 'movers') {
      const movers = await getMarketMovers();
      return NextResponse.json(movers);
    }

    if (mode === 'indices') {
      const indices = await getMarketIndices();
      const session = getMarketSessionStatus();
      return NextResponse.json({ indices, session });
    }

    const searchResult = await searchUniverseStockCatalog({
      query,
      exchange,
      segment,
      sector,
      marketCapCategory: marketCap,
      page,
      limit,
    });

    return NextResponse.json({
      ...searchResult,
      session: getMarketSessionStatus(),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
