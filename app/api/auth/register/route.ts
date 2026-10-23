import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const res = await registerUser(email, password, name);

    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Registration failed.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: res.user });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
