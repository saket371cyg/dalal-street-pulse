import { Db } from 'mongodb';
import { getMongoDb } from './mongodb';
import {
  Instrument,
  SymbolAlias,
  StockQuote,
  OHLCVCandle,
  CompanyFundamentals,
  FinancialStatementRecord,
  CorporateAction,
  CorporateAnnouncement,
  FinancialNewsItem,
  SyncJobHistory,
  RAGDocumentChunk,
} from '@/types';

// Collection Names
export const COLLECTIONS = {
  INSTRUMENTS: 'instruments',
  SYMBOL_ALIASES: 'symbol_aliases',
  QUOTES: 'quotes',
  HISTORICAL_OHLCV: 'historical_ohlcv',
  FUNDAMENTALS: 'fundamentals',
  FINANCIAL_STATEMENTS: 'financial_statements',
  CORPORATE_ACTIONS: 'corporate_actions',
  CORPORATE_ANNOUNCEMENTS: 'corporate_announcements',
  FINANCIAL_NEWS: 'financial_news',
  SYNC_JOB_HISTORY: 'sync_job_history',
  WATCHLISTS: 'watchlists',
  PRICE_ALERTS: 'price_alerts',
  NOTIFICATIONS: 'notifications',
  MARKET_BRIEFINGS: 'market_briefings',
  USER_SETTINGS: 'user_settings',
  RAG_CHUNKS: 'rag_chunks',
} as const;

export interface HistoricalOHLCVDocument {
  symbol: string;
  isin?: string;
  exchange: 'NSE' | 'BSE';
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
  candles: OHLCVCandle[];
  lastUpdated: string;
  source: string;
}

let indexesInitialized = false;

/**
 * Initializes and validates all production MongoDB indexes for the Indian stock universe
 */
export async function ensureMongoIndexes(customDb?: Db): Promise<{ success: boolean; message: string }> {
  if (indexesInitialized) {
    return { success: true, message: 'Indexes already initialized in runtime' };
  }

  const db = customDb || (await getMongoDb());
  if (!db) {
    return {
      success: false,
      message: 'MongoDB connection not active, indexes will initialize upon connection',
    };
  }

  try {
    // 1. Instruments indexes
    const instCol = db.collection<Instrument>(COLLECTIONS.INSTRUMENTS);
    await instCol.createIndex({ isin: 1 }, { unique: true, name: 'idx_isin_unique' });
    await instCol.createIndex({ nseSymbol: 1 }, { name: 'idx_nse_symbol' });
    await instCol.createIndex({ bseCode: 1 }, { name: 'idx_bse_code' });
    await instCol.createIndex({ bseScripId: 1 }, { name: 'idx_bse_scrip_id' });
    await instCol.createIndex({ isSME: 1 }, { name: 'idx_is_sme' });
    await instCol.createIndex({ status: 1 }, { name: 'idx_status' });
    await instCol.createIndex(
      { companyName: 'text', nseSymbol: 'text', bseScripId: 'text' },
      { name: 'idx_search_text' }
    );

    // 2. Symbol aliases indexes
    const aliasCol = db.collection<SymbolAlias>(COLLECTIONS.SYMBOL_ALIASES);
    await aliasCol.createIndex({ oldSymbol: 1, exchange: 1 }, { unique: true, name: 'idx_old_symbol_unique' });
    await aliasCol.createIndex({ newSymbol: 1 }, { name: 'idx_new_symbol' });
    await aliasCol.createIndex({ isin: 1 }, { name: 'idx_alias_isin' });

    // 3. Quotes indexes
    const quotesCol = db.collection<StockQuote>(COLLECTIONS.QUOTES);
    await quotesCol.createIndex({ symbol: 1, exchange: 1 }, { unique: true, name: 'idx_quote_symbol_exch' });
    await quotesCol.createIndex({ lastUpdated: -1 }, { name: 'idx_quote_updated' });

    // 4. Historical OHLCV indexes
    const ohlcvCol = db.collection<HistoricalOHLCVDocument>(COLLECTIONS.HISTORICAL_OHLCV);
    await ohlcvCol.createIndex({ symbol: 1, timeframe: 1 }, { unique: true, name: 'idx_ohlcv_sym_tf' });

    // 5. Fundamentals indexes
    const fundCol = db.collection<CompanyFundamentals>(COLLECTIONS.FUNDAMENTALS);
    await fundCol.createIndex({ symbol: 1 }, { unique: true, name: 'idx_fund_symbol' });
    await fundCol.createIndex({ sector: 1 }, { name: 'idx_fund_sector' });

    // 6. Financial statements indexes
    const stmtCol = db.collection<FinancialStatementRecord>(COLLECTIONS.FINANCIAL_STATEMENTS);
    await stmtCol.createIndex(
      { symbol: 1, statementType: 1, period: 1, frequency: 1 },
      { unique: true, name: 'idx_stmt_unique' }
    );
    await stmtCol.createIndex({ isin: 1 }, { name: 'idx_stmt_isin' });

    // 7. Corporate actions indexes
    const actionsCol = db.collection<CorporateAction>(COLLECTIONS.CORPORATE_ACTIONS);
    await actionsCol.createIndex({ symbol: 1, actionType: 1, exDate: 1 }, { unique: true, name: 'idx_action_unique' });
    await actionsCol.createIndex({ exDate: -1 }, { name: 'idx_action_exdate' });

    // 8. Corporate announcements indexes
    const annCol = db.collection<CorporateAnnouncement>(COLLECTIONS.CORPORATE_ANNOUNCEMENTS);
    await annCol.createIndex({ symbol: 1, broadcastDateTime: 1, title: 1 }, { unique: true, name: 'idx_ann_unique' });
    await annCol.createIndex({ broadcastDateTime: -1 }, { name: 'idx_ann_broadcast' });

    // 9. Financial news indexes
    const newsCol = db.collection<FinancialNewsItem>(COLLECTIONS.FINANCIAL_NEWS);
    await newsCol.createIndex({ id: 1 }, { unique: true, name: 'idx_news_id' });
    await newsCol.createIndex({ relatedSymbols: 1 }, { name: 'idx_news_symbols' });
    await newsCol.createIndex({ publishedAt: -1 }, { name: 'idx_news_published' });

    // 10. Sync job history indexes
    const syncCol = db.collection<SyncJobHistory>(COLLECTIONS.SYNC_JOB_HISTORY);
    await syncCol.createIndex({ jobType: 1, startedAt: -1 }, { name: 'idx_sync_job_type' });
    await syncCol.createIndex({ status: 1 }, { name: 'idx_sync_status' });

    // 11. RAG knowledge chunks indexes (for vector & hybrid retrieval)
    const ragCol = db.collection<RAGDocumentChunk>(COLLECTIONS.RAG_CHUNKS);
    await ragCol.createIndex({ id: 1 }, { unique: true, name: 'idx_rag_id' });
    await ragCol.createIndex({ symbol: 1 }, { name: 'idx_rag_symbol' });
    await ragCol.createIndex({ category: 1 }, { name: 'idx_rag_category' });
    await ragCol.createIndex({ publishedAt: -1 }, { name: 'idx_rag_published' });
    await ragCol.createIndex(
      { title: 'text', content: 'text' },
      { name: 'idx_rag_text_search' }
    );

    indexesInitialized = true;
    return { success: true, message: 'All 11 MongoDB collections and indexes initialized successfully' };
  } catch (err) {
    console.warn('[MongoDB] Index creation encountered warning:', (err as Error).message);
    return { success: false, message: (err as Error).message };
  }
}
