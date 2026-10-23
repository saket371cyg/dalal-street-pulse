import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getWatchlistsByUserId, createWatchlist } from '@/lib/db/store';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const watchlists = await getWatchlistsByUserId(user.id);
  return NextResponse.json({ watchlists });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, symbols } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Watchlist name is required.' }, { status: 400 });
    }

    const created = await createWatchlist(user.id, name, symbols || []);
    return NextResponse.json({ success: true, watchlist: created });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
