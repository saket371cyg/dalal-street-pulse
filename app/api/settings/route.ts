import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserSettings, updateUserSettings } from '@/lib/db/store';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getUserSettings(user.id);
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const updates = await req.json();
    const updated = await updateUserSettings(user.id, updates);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
