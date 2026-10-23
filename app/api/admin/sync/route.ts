import { NextResponse } from 'next/server';
import { runSecurityMasterIngestion } from '@/lib/market-data/ingestion';
import {
  getUniverseStatistics,
  getRecentSyncJobs,
  recordSyncJobHistory,
  upsertCorporateActions,
} from '@/lib/db/store';
import { getMarketDataProvider } from '@/lib/market-data/providers';
import { getTrueDataFeedManager } from '@/lib/market-data/truedata-feed';
import { SyncJobHistory, SyncJobType } from '@/types';
import { ensureMongoIndexes } from '@/lib/db/models';

export async function GET() {
  try {
    const provider = getMarketDataProvider();
    const feedManager = getTrueDataFeedManager();
    const feedStatus = feedManager.getConnectionStatus();

    const allCached = feedManager.getAllCachedQuotes();
    const quoteFreshness = {
      total: allCached.length,
      live: allCached.filter(q => q.freshness === 'live').length,
      delayed: allCached.filter(q => q.freshness === 'delayed').length,
      eod: allCached.filter(q => q.freshness === 'eod').length,
      stale: allCached.filter(q => q.freshness === 'unavailable' || q.freshness === 'cached').length,
    };

    const credentialsCheck = {
      TRUE_DATA_USERNAME: Boolean(process.env.TRUE_DATA_USERNAME?.trim()),
      TRUE_DATA_PASSWORD: Boolean(process.env.TRUE_DATA_PASSWORD?.trim()),
      TRUE_DATA_WS_URL: Boolean(process.env.TRUE_DATA_WS_URL?.trim()),
      TRUE_DATA_HISTORY_URL: Boolean(process.env.TRUE_DATA_HISTORY_URL?.trim()),
      EODHD_API_TOKEN: Boolean(process.env.EODHD_API_TOKEN?.trim()),
    };

    const [stats, recentJobs, health] = await Promise.all([
      getUniverseStatistics(),
      getRecentSyncJobs(10),
      provider.healthCheck(),
    ]);

    return NextResponse.json({
      stats,
      provider: {
        name: provider.name,
        health,
        capabilities: provider.capabilities,
      },
      feed: feedStatus,
      quoteFreshness,
      credentialsCheck,
      recentJobs,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const jobType: SyncJobType = body.jobType || 'SECURITY_MASTER';
    const provider = getMarketDataProvider();

    // Ensure database indexes first
    await ensureMongoIndexes();

    if (jobType === 'SECURITY_MASTER') {
      const { job, stats } = await runSecurityMasterIngestion();
      return NextResponse.json({
        success: true,
        message: 'Security master synchronized across NSE & BSE',
        job,
        stats,
      });
    }

    if (jobType === 'CORPORATE_ACTIONS') {
      const startTime = Date.now();
      const actions = await provider.getCorporateActions();
      await upsertCorporateActions(actions);

      const job: SyncJobHistory = {
        id: `sync_actions_${Date.now()}`,
        jobType: 'CORPORATE_ACTIONS',
        status: 'COMPLETED',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        totalRecords: actions.length,
        successCount: actions.length,
        failureCount: 0,
        provider: provider.name,
      };

      await recordSyncJobHistory(job);

      return NextResponse.json({
        success: true,
        message: 'Corporate actions synchronized',
        job,
        actionsCount: actions.length,
      });
    }

    if (jobType === 'QUOTES_SNAPSHOT') {
      const startTime = Date.now();
      const indices = await provider.getIndices();

      const job: SyncJobHistory = {
        id: `sync_quotes_${Date.now()}`,
        jobType: 'QUOTES_SNAPSHOT',
        status: 'COMPLETED',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        totalRecords: indices.length,
        successCount: indices.length,
        failureCount: 0,
        provider: provider.name,
      };

      await recordSyncJobHistory(job);

      return NextResponse.json({
        success: true,
        message: 'Market quotes snapshot synchronized',
        job,
      });
    }

    return NextResponse.json({ error: `Unsupported sync job type: ${jobType}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
