import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateWatchlist, deleteWatchlist, addStockToWatchlist, removeStockFromWatchlist } from '@/lib/db/store';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const { name, symbols } = await req.json();

    const updated = await updateWatchlist(user.id, id, { name, symbols });
    if (!updated) {
      return NextResponse.json({ error: 'Watchlist not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, watchlist: updated });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const ok = await deleteWatchlist(user.id, id);
    return NextResponse.json({ success: ok });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const { action, symbol } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    let result;
    if (action === 'remove') {
      result = await removeStockFromWatchlist(user.id, id, symbol);
    } else {
      result = await addStockToWatchlist(user.id, id, symbol);
    }

    if (!result) {
      return NextResponse.json({ error: 'Watchlist not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, watchlist: result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
