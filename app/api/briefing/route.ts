import { NextResponse } from 'next/server';
import { getLatestBriefing, saveBriefing } from '@/lib/db/store';
import { generateDailyMarketBriefing } from '@/lib/ai';

export async function GET() {
  try {
    let briefing = await getLatestBriefing();
    if (!briefing) {
      briefing = await generateDailyMarketBriefing();
      await saveBriefing(briefing);
    }
    return NextResponse.json({ briefing });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const briefing = await generateDailyMarketBriefing();
    await saveBriefing(briefing);
    return NextResponse.json({ success: true, briefing });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
