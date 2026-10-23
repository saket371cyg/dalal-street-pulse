import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const res = await loginUser(email, password);

    if (!res.success || !res.token) {
      return NextResponse.json({ error: res.error || 'Login failed.' }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set('dsp_session_token', res.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true, user: res.user });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
