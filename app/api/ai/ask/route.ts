import { NextResponse } from 'next/server';
import { askAIAnalyst } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { question, symbol } = await req.json();

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    const response = await askAIAnalyst(question, symbol);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
