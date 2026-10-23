import { NextResponse } from 'next/server';
import { evaluatePriceAlerts } from '@/lib/alerts';

export async function POST() {
  try {
    const result = await evaluatePriceAlerts();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
