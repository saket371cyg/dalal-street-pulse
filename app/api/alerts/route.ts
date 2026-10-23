import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getAlertsByUserId, createPriceAlert, togglePriceAlert, deletePriceAlert } from '@/lib/db/store';
import { getStockQuote } from '@/lib/market-data';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const alerts = await getAlertsByUserId(user.id);
  return NextResponse.json({ alerts });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { symbol, condition, thresholdValue, notes } = await req.json();

    if (!symbol || !condition || thresholdValue === undefined) {
      return NextResponse.json({ error: 'Symbol, condition, and thresholdValue are required.' }, { status: 400 });
    }

    const quote = await getStockQuote(symbol);
    const initialPrice = quote ? quote.currentPrice : Number(thresholdValue);
    const companyName = quote ? quote.companyName : symbol;
    const exchange = quote ? quote.exchange : 'NSE';

    const newAlert = await createPriceAlert({
      userId: user.id,
      symbol: symbol.toUpperCase().trim(),
      exchange,
      companyName,
      condition,
      thresholdValue: Number(thresholdValue),
      initialPrice,
      active: true,
      notes: notes || '',
    });

    return NextResponse.json({ success: true, alert: newAlert });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { alertId, active } = await req.json();
    const ok = await togglePriceAlert(user.id, alertId, active);
    return NextResponse.json({ success: ok });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const alertId = searchParams.get('id');
    if (!alertId) return NextResponse.json({ error: 'Alert ID is required.' }, { status: 400 });

    const ok = await deletePriceAlert(user.id, alertId);
    return NextResponse.json({ success: ok });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
