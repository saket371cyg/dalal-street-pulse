import { NextResponse } from 'next/server';
import { getHistoricalOHLCV } from '@/lib/market-data';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get('range') || '1M') as any;
    const exchange = (searchParams.get('exchange')?.toUpperCase() as 'NSE' | 'BSE') || undefined;

    const candles = await getHistoricalOHLCV(symbol, timeframe, exchange);

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      timeframe,
      count: candles.length,
      candles,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
