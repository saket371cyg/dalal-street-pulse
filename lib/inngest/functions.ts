import { inngest } from './client';
import { evaluatePriceAlerts } from '@/lib/alerts';
import { generateDailyMarketBriefing } from '@/lib/ai';
import { saveBriefing, recordSyncJobHistory, upsertCorporateActions } from '@/lib/db/store';
import { runSecurityMasterIngestion } from '@/lib/market-data/ingestion';
import { getMarketDataProvider } from '@/lib/market-data/providers';
import { ensureMongoIndexes } from '@/lib/db/models';
import { SyncJobHistory } from '@/types';

/**
 * Inngest background workflow: Synchronize NSE and BSE Security Masters
 * Runs every weekday at 06:00 AM IST (Pre-market)
 */
export const syncSecurityMasterJob = inngest.createFunction(
  {
    id: 'sync-security-master',
    name: 'Synchronize NSE and BSE Security Masters',
    triggers: [{ cron: '0 6 * * 1-5' }], // 06:00 AM IST weekdays
  },
  async ({ step }: any) => {
    // Step 1: Ensure database indexes are in place
    await step.run('ensure-database-indexes', async () => {
      return await ensureMongoIndexes();
    });

    // Step 2: Ingest, reconcile and deduplicate exchange security masters
    const ingestionResult = await step.run('ingest-exchange-masters', async () => {
      return await runSecurityMasterIngestion();
    });

    return {
      status: 'completed',
      reconciledCount: ingestionResult.stats.totalReconciledInstruments,
      dualListedCount: ingestionResult.stats.dualListedCount,
      smeCount: ingestionResult.stats.smeCount,
      durationMs: ingestionResult.job.durationMs,
    };
  }
);

/**
 * Inngest background workflow: Synchronize Market Quotes Snapshot
 * Runs every 15 minutes between 09:00 and 15:45 IST on weekdays
 */
export const syncMarketQuotesJob = inngest.createFunction(
  {
    id: 'sync-market-quotes',
    name: 'Synchronize Intraday Market Quotes',
    triggers: [{ cron: '*/15 9-15 * * 1-5' }], // Every 15 min during market hours
  },
  async ({ step }: any) => {
    const quoteSyncResult = await step.run('refresh-quotes-snapshot', async () => {
      const startTime = Date.now();
      const provider = getMarketDataProvider();
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

      return {
        indicesCount: indices.length,
        provider: provider.name,
      };
    });

    return quoteSyncResult;
  }
);

/**
 * Inngest background workflow: Synchronize Official Corporate Actions
 * Runs every weekday at 06:30 PM IST (Post-market)
 */
export const syncCorporateActionsJob = inngest.createFunction(
  {
    id: 'sync-corporate-actions',
    name: 'Synchronize Official Corporate Actions & Announcements',
    triggers: [{ cron: '30 18 * * 1-5' }], // 06:30 PM IST weekdays
  },
  async ({ step }: any) => {
    const actionsResult = await step.run('fetch-and-store-corporate-actions', async () => {
      const startTime = Date.now();
      const provider = getMarketDataProvider();
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

      return {
        actionsStored: actions.length,
        provider: provider.name,
      };
    });

    return actionsResult;
  }
);

/**
 * Inngest background workflow: Check Indian stock price alerts periodically
 */
export const checkPriceAlertsJob = inngest.createFunction(
  {
    id: 'check-indian-price-alerts',
    name: 'Evaluate Indian Stock Price Alerts',
    triggers: [{ cron: '*/5 9-16 * * 1-5' }], // Every 5 minutes between 9 AM and 4 PM on weekdays
  },
  async ({ step }: any) => {
    const result = await step.run('evaluate-active-alerts', async () => {
      return await evaluatePriceAlerts();
    });

    return {
      status: 'completed',
      checked: result.checkedCount,
      triggered: result.triggeredCount,
    };
  }
);

/**
 * Inngest background workflow: Generate and distribute daily market briefing
 */
export const generateDailyBriefingJob = inngest.createFunction(
  {
    id: 'generate-daily-briefing',
    name: 'Generate Indian Market Daily Briefing',
    triggers: [{ cron: '30 16 * * 1-5' }], // 04:30 PM IST on weekdays (post market close)
  },
  async ({ step }: any) => {
    const briefing = await step.run('generate-briefing', async () => {
      const generated = await generateDailyMarketBriefing();
      await saveBriefing(generated);
      return generated;
    });

    return {
      status: 'completed',
      date: briefing.date,
      title: briefing.title,
    };
  }
);

export const inngestFunctions = [
  syncSecurityMasterJob,
  syncMarketQuotesJob,
  syncCorporateActionsJob,
  checkPriceAlertsJob,
  generateDailyBriefingJob,
];
