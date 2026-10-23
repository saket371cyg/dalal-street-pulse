import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getNotificationsByUserId, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/db/store';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const notifications = await getNotificationsByUserId(user.id);
  const unreadCount = notifications.filter(n => !n.read).length;

  return NextResponse.json({ notifications, unreadCount });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { notifId, markAll } = await req.json();

    if (markAll) {
      await markAllNotificationsAsRead(user.id);
      return NextResponse.json({ success: true });
    }

    if (notifId) {
      const ok = await markNotificationAsRead(user.id, notifId);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
