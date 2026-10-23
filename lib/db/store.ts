import { getMongoDb } from './mongodb';
import {
  Watchlist,
  PriceAlert,
  InAppNotification,
  UserProfile,
  DailyMarketBriefing,
  Instrument,
  SymbolAlias,
  CorporateAction,
  FinancialStatementRecord,
  SyncJobHistory,
  StockQuote,
  Exchange,
  OHLCVCandle,
  RAGDocumentChunk,
} from '@/types';
import { COLLECTIONS, HistoricalOHLCVDocument } from './models';

// Fallback in-memory stores for resilient local development & offline mode
const memoryStore = {
  users: new Map<string, any>(),
  watchlists: new Map<string, Watchlist[]>(), // userId -> Watchlist[]
  alerts: new Map<string, PriceAlert[]>(), // userId -> PriceAlert[]
  notifications: new Map<string, InAppNotification[]>(), // userId -> Notification[]
  settings: new Map<string, UserProfile>(),
  briefings: new Map<string, DailyMarketBriefing>(),
  instruments: new Map<string, Instrument>(), // isin -> Instrument
  symbolAliases: new Map<string, SymbolAlias>(), // oldSymbol -> SymbolAlias
  corporateActions: new Map<string, CorporateAction>(),
  financialStatements: new Map<string, FinancialStatementRecord>(),
  quotes: new Map<string, StockQuote>(),
  historicalOHLCV: new Map<string, HistoricalOHLCVDocument>(),
  syncHistory: [] as SyncJobHistory[],
  ragChunks: new Map<string, RAGDocumentChunk>(),
};

// Seed default initial demo user & watchlist if memory store is empty
const DEMO_USER_ID = 'user_dalal_demo';
const DEFAULT_WATCHLIST: Watchlist = {
  id: 'wl_nifty_leaders',
  userId: DEMO_USER_ID,
  name: 'NIFTY Bluechips',
  symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'ITC'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

memoryStore.watchlists.set(DEMO_USER_ID, [DEFAULT_WATCHLIST]);

// Seed sample notifications
memoryStore.notifications.set(DEMO_USER_ID, [
  {
    id: 'notif_welcome',
    userId: DEMO_USER_ID,
    title: 'Welcome to Dalal Street Pulse',
    message: 'Your Indian stock market intelligence platform is active. Real-time NSE/BSE quotes, alerts & AI insights ready.',
    type: 'SYSTEM',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif_market_status',
    userId: DEMO_USER_ID,
    title: 'NIFTY 50 Market Briefing Ready',
    message: 'RBI policy commentary and institutional flow updates have been compiled.',
    type: 'BRIEFING',
    read: false,
    createdAt: new Date().toISOString(),
    link: '/briefing',
  }
]);

// -------------------------------------------------------------
// Watchlist Repository
// -------------------------------------------------------------
export async function getWatchlistsByUserId(userId: string): Promise<Watchlist[]> {
  const db = await getMongoDb();
  if (db) {
    try {
      const items = await db.collection<Watchlist>('watchlists').find({ userId }).toArray();
      if (items.length > 0) return items;
    } catch (e) {
      console.warn('MongoDB read error, falling back to local memory store', e);
    }
  }

  // Fallback to memory
  const userLists = memoryStore.watchlists.get(userId);
  if (!userLists || userLists.length === 0) {
    const initialList: Watchlist = {
      id: `wl_${Date.now()}`,
      userId,
      name: 'Primary Watchlist',
      symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.watchlists.set(userId, [initialList]);
    return [initialList];
  }
  return userLists;
}

export async function createWatchlist(userId: string, name: string, symbols: string[] = []): Promise<Watchlist> {
  const newWatchlist: Watchlist = {
    id: `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    name: name.trim(),
    symbols: Array.from(new Set(symbols.map(s => s.toUpperCase().trim()))),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('watchlists').insertOne(newWatchlist as any);
      return newWatchlist;
    } catch (e) {
      console.warn('MongoDB insert error, using local memory store', e);
    }
  }

  const existing = memoryStore.watchlists.get(userId) || [];
  existing.push(newWatchlist);
  memoryStore.watchlists.set(userId, existing);
  return newWatchlist;
}

export async function updateWatchlist(userId: string, watchlistId: string, updates: Partial<Pick<Watchlist, 'name' | 'symbols'>>): Promise<Watchlist | null> {
  const db = await getMongoDb();
  if (db) {
    try {
      const result = await db.collection<Watchlist>('watchlists').findOneAndUpdate(
        { id: watchlistId, userId },
        { $set: { ...updates, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      if (result) return result as unknown as Watchlist;
    } catch (e) {
      console.warn('MongoDB update error, using local store', e);
    }
  }

  const existing = memoryStore.watchlists.get(userId) || [];
  const idx = existing.findIndex(w => w.id === watchlistId);
  if (idx === -1) return null;

  existing[idx] = {
    ...existing[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  memoryStore.watchlists.set(userId, existing);
  return existing[idx];
}

export async function deleteWatchlist(userId: string, watchlistId: string): Promise<boolean> {
  const db = await getMongoDb();
  if (db) {
    try {
      const res = await db.collection('watchlists').deleteOne({ id: watchlistId, userId });
      return res.deletedCount > 0;
    } catch (e) {
      console.warn('MongoDB delete error', e);
    }
  }

  const existing = memoryStore.watchlists.get(userId) || [];
  const filtered = existing.filter(w => w.id !== watchlistId);
  memoryStore.watchlists.set(userId, filtered);
  return filtered.length < existing.length;
}

export async function addStockToWatchlist(userId: string, watchlistId: string, symbol: string): Promise<Watchlist | null> {
  const cleanSymbol = symbol.toUpperCase().trim();
  const db = await getMongoDb();
  if (db) {
    try {
      const res = await db.collection<Watchlist>('watchlists').findOneAndUpdate(
        { id: watchlistId, userId },
        { 
          $addToSet: { symbols: cleanSymbol },
          $set: { updatedAt: new Date().toISOString() }
        },
        { returnDocument: 'after' }
      );
      if (res) return res as unknown as Watchlist;
    } catch (e) {
      console.warn('MongoDB addToSet error', e);
    }
  }

  const existing = memoryStore.watchlists.get(userId) || [];
  const idx = existing.findIndex(w => w.id === watchlistId);
  if (idx === -1) return null;

  if (!existing[idx].symbols.includes(cleanSymbol)) {
    existing[idx].symbols.push(cleanSymbol);
    existing[idx].updatedAt = new Date().toISOString();
  }
  return existing[idx];
}

export async function removeStockFromWatchlist(userId: string, watchlistId: string, symbol: string): Promise<Watchlist | null> {
  const cleanSymbol = symbol.toUpperCase().trim();
  const db = await getMongoDb();
  if (db) {
    try {
      const res = await db.collection<Watchlist>('watchlists').findOneAndUpdate(
        { id: watchlistId, userId },
        { 
          $pull: { symbols: cleanSymbol as any },
          $set: { updatedAt: new Date().toISOString() }
        },
        { returnDocument: 'after' }
      );
      if (res) return res as unknown as Watchlist;
    } catch (e) {
      console.warn('MongoDB pull error', e);
    }
  }

  const existing = memoryStore.watchlists.get(userId) || [];
  const idx = existing.findIndex(w => w.id === watchlistId);
  if (idx === -1) return null;

  existing[idx].symbols = existing[idx].symbols.filter(s => s !== cleanSymbol);
  existing[idx].updatedAt = new Date().toISOString();
  return existing[idx];
}

// -------------------------------------------------------------
// Price Alerts Repository
// -------------------------------------------------------------
export async function getAlertsByUserId(userId: string): Promise<PriceAlert[]> {
  const db = await getMongoDb();
  if (db) {
    try {
      const alerts = await db.collection<PriceAlert>('price_alerts').find({ userId }).sort({ createdAt: -1 }).toArray();
      return alerts;
    } catch (e) {
      console.warn('MongoDB alerts read error', e);
    }
  }

  return memoryStore.alerts.get(userId) || [];
}

export async function getAllActiveAlerts(): Promise<PriceAlert[]> {
  const db = await getMongoDb();
  if (db) {
    try {
      return await db.collection<PriceAlert>('price_alerts').find({ active: true, triggered: false }).toArray();
    } catch (e) {
      console.warn('MongoDB active alerts error', e);
    }
  }

  const active: PriceAlert[] = [];
  memoryStore.alerts.forEach((userAlerts) => {
    userAlerts.forEach(a => {
      if (a.active && !a.triggered) active.push(a);
    });
  });
  return active;
}

export async function createPriceAlert(alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>): Promise<PriceAlert> {
  const newAlert: PriceAlert = {
    ...alertData,
    id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    triggered: false,
    createdAt: new Date().toISOString(),
  };

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('price_alerts').insertOne(newAlert as any);
      return newAlert;
    } catch (e) {
      console.warn('MongoDB insert alert error', e);
    }
  }

  const userAlerts = memoryStore.alerts.get(alertData.userId) || [];
  userAlerts.unshift(newAlert);
  memoryStore.alerts.set(alertData.userId, userAlerts);
  return newAlert;
}

export async function togglePriceAlert(userId: string, alertId: string, active: boolean): Promise<boolean> {
  const db = await getMongoDb();
  if (db) {
    try {
      const res = await db.collection('price_alerts').updateOne(
        { id: alertId, userId },
        { $set: { active } }
      );
      return res.modifiedCount > 0;
    } catch (e) {
      console.warn('MongoDB alert toggle error', e);
    }
  }

  const userAlerts = memoryStore.alerts.get(userId) || [];
  const alert = userAlerts.find(a => a.id === alertId);
  if (alert) {
    alert.active = active;
    return true;
  }
  return false;
}

export async function deletePriceAlert(userId: string, alertId: string): Promise<boolean> {
  const db = await getMongoDb();
  if (db) {
    try {
      const res = await db.collection('price_alerts').deleteOne({ id: alertId, userId });
      return res.deletedCount > 0;
    } catch (e) {
      console.warn('MongoDB alert delete error', e);
    }
  }

  const userAlerts = memoryStore.alerts.get(userId) || [];
  const filtered = userAlerts.filter(a => a.id !== alertId);
  memoryStore.alerts.set(userId, filtered);
  return filtered.length < userAlerts.length;
}

export async function triggerAlert(alertId: string, triggeredPrice: number): Promise<void> {
  const triggeredAt = new Date().toISOString();
  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('price_alerts').updateOne(
        { id: alertId },
        { $set: { triggered: true, active: false, triggeredAt, triggeredPrice } }
      );
    } catch (e) {
      console.warn('MongoDB triggerAlert error', e);
    }
  }

  memoryStore.alerts.forEach((userAlerts) => {
    const alert = userAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.triggered = true;
      alert.active = false;
      alert.triggeredAt = triggeredAt;
      alert.triggeredPrice = triggeredPrice;
    }
  });
}

// -------------------------------------------------------------
// In-App Notifications Repository
// -------------------------------------------------------------
export async function getNotificationsByUserId(userId: string): Promise<InAppNotification[]> {
  const db = await getMongoDb();
  if (db) {
    try {
      return await db.collection<InAppNotification>('notifications').find({ userId }).sort({ createdAt: -1 }).limit(50).toArray();
    } catch (e) {
      console.warn('MongoDB notifications error', e);
    }
  }

  return memoryStore.notifications.get(userId) || [];
}

export async function createNotification(notifData: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>): Promise<InAppNotification> {
  const newNotif: InAppNotification = {
    ...notifData,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('notifications').insertOne(newNotif as any);
      return newNotif;
    } catch (e) {
      console.warn('MongoDB create notification error', e);
    }
  }

  const list = memoryStore.notifications.get(notifData.userId) || [];
  list.unshift(newNotif);
  memoryStore.notifications.set(notifData.userId, list);
  return newNotif;
}

export async function markNotificationAsRead(userId: string, notifId: string): Promise<boolean> {
  const db = await getMongoDb();
  if (db) {
    try {
      const res = await db.collection('notifications').updateOne({ id: notifId, userId }, { $set: { read: true } });
      return res.modifiedCount > 0;
    } catch (e) {
      console.warn('MongoDB notification read error', e);
    }
  }

  const list = memoryStore.notifications.get(userId) || [];
  const item = list.find(n => n.id === notifId);
  if (item) {
    item.read = true;
    return true;
  }
  return false;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('notifications').updateMany({ userId }, { $set: { read: true } });
      return;
    } catch (e) {
      console.warn('MongoDB mark all read error', e);
    }
  }

  const list = memoryStore.notifications.get(userId) || [];
  list.forEach(item => { item.read = true; });
}

// -------------------------------------------------------------
// Daily Market Briefings Repository
// -------------------------------------------------------------
export async function getLatestBriefing(): Promise<DailyMarketBriefing | null> {
  const db = await getMongoDb();
  if (db) {
    try {
      const briefing = await db.collection<DailyMarketBriefing>('market_briefings').find().sort({ date: -1 }).limit(1).toArray();
      if (briefing.length > 0) return briefing[0];
    } catch (e) {
      console.warn('MongoDB briefing read error', e);
    }
  }

  const values = Array.from(memoryStore.briefings.values());
  return values.length > 0 ? values[values.length - 1] : null;
}

export async function saveBriefing(briefing: DailyMarketBriefing): Promise<void> {
  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('market_briefings').replaceOne(
        { date: briefing.date },
        briefing as any,
        { upsert: true }
      );
      return;
    } catch (e) {
      console.warn('MongoDB saveBriefing error', e);
    }
  }

  memoryStore.briefings.set(briefing.date, briefing);
}

// -------------------------------------------------------------
// User Settings Repository
// -------------------------------------------------------------
export async function getUserSettings(userId: string): Promise<UserProfile> {
  const defaultProfile: UserProfile = {
    id: userId,
    email: 'investor@dalalstreetpulse.com',
    name: 'Dalal Street Investor',
    defaultMarket: 'NSE',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    emailBriefingEnabled: true,
    briefingDeliveryTime: '16:30',
    theme: 'dark',
    createdAt: new Date().toISOString(),
  };

  const db = await getMongoDb();
  if (db) {
    try {
      const profile = await db.collection<UserProfile>('user_settings').findOne({ id: userId });
      if (profile) return profile;
    } catch (e) {
      console.warn('MongoDB user settings error', e);
    }
  }

  return memoryStore.settings.get(userId) || defaultProfile;
}

export async function updateUserSettings(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getUserSettings(userId);
  const updated: UserProfile = { ...current, ...updates };

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection('user_settings').replaceOne({ id: userId }, updated as any, { upsert: true });
      return updated;
    } catch (e) {
      console.warn('MongoDB updateUserSettings error', e);
    }
  }

  memoryStore.settings.set(userId, updated);
  return updated;
}

// -------------------------------------------------------------
// Indian Stock Universe & Instruments Repository
// -------------------------------------------------------------
export async function upsertInstruments(instruments: Instrument[]): Promise<number> {
  const db = await getMongoDb();
  if (db && instruments.length > 0) {
    try {
      const ops = instruments.map(inst => ({
        updateOne: {
          filter: { isin: inst.isin },
          update: { $set: inst },
          upsert: true,
        },
      }));
      const res = await db.collection(COLLECTIONS.INSTRUMENTS).bulkWrite(ops);
      return (res.upsertedCount || 0) + (res.modifiedCount || 0);
    } catch (e) {
      console.warn('MongoDB upsertInstruments bulk error, falling back to memory store', e);
    }
  }

  // Memory store fallback
  instruments.forEach(inst => {
    memoryStore.instruments.set(inst.isin, inst);
  });
  return instruments.length;
}

export async function getInstrumentBySymbol(rawSymbol: string): Promise<Instrument | null> {
  const clean = rawSymbol.toUpperCase().trim().replace(/\.(NS|BO|BSE|NSE)$/i, '');
  const db = await getMongoDb();
  if (db) {
    try {
      const inst = await db.collection<Instrument>(COLLECTIONS.INSTRUMENTS).findOne({
        $or: [
          { nseSymbol: clean },
          { bseCode: clean },
          { bseScripId: clean },
          { isin: clean },
        ],
      });
      if (inst) return inst;
    } catch (e) {
      console.warn('MongoDB getInstrumentBySymbol error', e);
    }
  }

  // Check memory store
  for (const inst of memoryStore.instruments.values()) {
    if (
      inst.nseSymbol === clean ||
      inst.bseCode === clean ||
      inst.bseScripId === clean ||
      inst.isin === clean
    ) {
      return inst;
    }
  }

  return null;
}

export async function getInstrumentByISIN(isin: string): Promise<Instrument | null> {
  const clean = isin.toUpperCase().trim();
  const db = await getMongoDb();
  if (db) {
    try {
      const inst = await db.collection<Instrument>(COLLECTIONS.INSTRUMENTS).findOne({ isin: clean });
      if (inst) return inst;
    } catch (e) {
      console.warn('MongoDB getInstrumentByISIN error', e);
    }
  }

  return memoryStore.instruments.get(clean) || null;
}

export async function searchUniverseInstruments(params: {
  query?: string;
  exchange?: string;
  segment?: string; // 'ALL' | 'MAIN' | 'SME'
  sector?: string;
  page?: number;
  limit?: number;
}): Promise<{
  instruments: Instrument[];
  totalCount: number;
  page: number;
  totalPages: number;
}> {
  const q = (params.query || '').trim().toUpperCase();
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const db = await getMongoDb();
  if (db) {
    try {
      const filter: any = {};
      if (q) {
        filter.$or = [
          { nseSymbol: { $regex: q, $options: 'i' } },
          { bseScripId: { $regex: q, $options: 'i' } },
          { bseCode: { $regex: q, $options: 'i' } },
          { isin: { $regex: q, $options: 'i' } },
          { companyName: { $regex: q, $options: 'i' } },
        ];
      }
      if (params.exchange && params.exchange !== 'ALL') {
        filter.exchanges = params.exchange;
      }
      if (params.segment === 'SME') {
        filter.isSME = true;
      } else if (params.segment === 'MAIN') {
        filter.isSME = false;
      }
      if (params.sector && params.sector !== 'ALL') {
        filter.industry = { $regex: params.sector, $options: 'i' };
      }

      const totalCount = await db.collection<Instrument>(COLLECTIONS.INSTRUMENTS).countDocuments(filter);
      const instruments = await db
        .collection<Instrument>(COLLECTIONS.INSTRUMENTS)
        .find(filter)
        .skip(skip)
        .limit(limit)
        .toArray();

      if (totalCount > 0 || instruments.length > 0) {
        return {
          instruments,
          totalCount,
          page,
          totalPages: Math.ceil(totalCount / limit) || 1,
        };
      }
    } catch (e) {
      console.warn('MongoDB searchUniverseInstruments error, falling back to memory store', e);
    }
  }

  // Fallback to memoryStore
  let list = Array.from(memoryStore.instruments.values());

  if (q) {
    list = list.filter(inst => {
      const symMatch = inst.nseSymbol?.includes(q) || inst.bseScripId?.includes(q) || inst.bseCode?.includes(q);
      const nameMatch = inst.companyName.toUpperCase().includes(q);
      const isinMatch = inst.isin.includes(q);
      return symMatch || nameMatch || isinMatch;
    });
  }

  if (params.exchange && params.exchange !== 'ALL') {
    list = list.filter(inst => inst.exchanges.includes(params.exchange as any));
  }

  if (params.segment === 'SME') {
    list = list.filter(inst => inst.isSME);
  } else if (params.segment === 'MAIN') {
    list = list.filter(inst => !inst.isSME);
  }

  if (params.sector && params.sector !== 'ALL') {
    list = list.filter(inst => inst.industry?.toLowerCase().includes(params.sector!.toLowerCase()));
  }

  const totalCount = list.length;
  const paginated = list.slice(skip, skip + limit);

  return {
    instruments: paginated,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

// -------------------------------------------------------------
// Symbol Aliases & Corporate Name Changes
// -------------------------------------------------------------
export async function recordSymbolAliases(aliases: SymbolAlias[]): Promise<number> {
  const db = await getMongoDb();
  if (db && aliases.length > 0) {
    try {
      const ops = aliases.map(a => ({
        updateOne: {
          filter: { oldSymbol: a.oldSymbol, exchange: a.exchange },
          update: { $set: a },
          upsert: true,
        },
      }));
      await db.collection(COLLECTIONS.SYMBOL_ALIASES).bulkWrite(ops);
    } catch (e) {
      console.warn('MongoDB recordSymbolAliases error', e);
    }
  }

  aliases.forEach(a => {
    memoryStore.symbolAliases.set(a.oldSymbol.toUpperCase(), a);
  });
  return aliases.length;
}

export async function resolveSymbolAlias(oldSymbol: string): Promise<SymbolAlias | null> {
  const clean = oldSymbol.toUpperCase().trim();
  const db = await getMongoDb();
  if (db) {
    try {
      const alias = await db.collection<SymbolAlias>(COLLECTIONS.SYMBOL_ALIASES).findOne({ oldSymbol: clean });
      if (alias) return alias;
    } catch (e) {
      console.warn('MongoDB resolveSymbolAlias error', e);
    }
  }

  return memoryStore.symbolAliases.get(clean) || null;
}

// -------------------------------------------------------------
// Corporate Actions & Announcements
// -------------------------------------------------------------
export async function upsertCorporateActions(actions: CorporateAction[]): Promise<number> {
  const db = await getMongoDb();
  if (db && actions.length > 0) {
    try {
      const ops = actions.map(act => ({
        updateOne: {
          filter: { id: act.id },
          update: { $set: act },
          upsert: true,
        },
      }));
      await db.collection(COLLECTIONS.CORPORATE_ACTIONS).bulkWrite(ops);
    } catch (e) {
      console.warn('MongoDB upsertCorporateActions error', e);
    }
  }

  actions.forEach(act => {
    memoryStore.corporateActions.set(act.id, act);
  });
  return actions.length;
}

export async function getCorporateActions(symbol?: string, isin?: string): Promise<CorporateAction[]> {
  const clean = symbol?.toUpperCase().trim();
  const db = await getMongoDb();
  if (db) {
    try {
      const filter: any = {};
      if (clean) filter.symbol = clean;
      if (isin) filter.isin = isin;
      return await db.collection<CorporateAction>(COLLECTIONS.CORPORATE_ACTIONS).find(filter).sort({ exDate: -1 }).toArray();
    } catch (e) {
      console.warn('MongoDB getCorporateActions error', e);
    }
  }

  let list = Array.from(memoryStore.corporateActions.values());
  if (clean) list = list.filter(a => a.symbol === clean);
  if (isin) list = list.filter(a => a.isin === isin);
  return list.sort((a, b) => b.exDate.localeCompare(a.exDate));
}

// -------------------------------------------------------------
// Financial Statements Repository
// -------------------------------------------------------------
export async function upsertFinancialStatements(statements: FinancialStatementRecord[]): Promise<number> {
  const db = await getMongoDb();
  if (db && statements.length > 0) {
    try {
      const ops = statements.map(s => ({
        updateOne: {
          filter: { id: s.id },
          update: { $set: s },
          upsert: true,
        },
      }));
      await db.collection(COLLECTIONS.FINANCIAL_STATEMENTS).bulkWrite(ops);
    } catch (e) {
      console.warn('MongoDB upsertFinancialStatements error', e);
    }
  }

  statements.forEach(s => {
    memoryStore.financialStatements.set(s.id, s);
  });
  return statements.length;
}

export async function getFinancialStatements(symbol: string): Promise<FinancialStatementRecord[]> {
  const clean = symbol.toUpperCase().trim();
  const db = await getMongoDb();
  if (db) {
    try {
      return await db.collection<FinancialStatementRecord>(COLLECTIONS.FINANCIAL_STATEMENTS).find({ symbol: clean }).toArray();
    } catch (e) {
      console.warn('MongoDB getFinancialStatements error', e);
    }
  }

  return Array.from(memoryStore.financialStatements.values()).filter(s => s.symbol === clean);
}

// -------------------------------------------------------------
// Sync Job History Repository
// -------------------------------------------------------------
export async function recordSyncJobHistory(job: SyncJobHistory): Promise<void> {
  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection(COLLECTIONS.SYNC_JOB_HISTORY).insertOne(job as any);
    } catch (e) {
      console.warn('MongoDB recordSyncJobHistory error', e);
    }
  }

  memoryStore.syncHistory.unshift(job);
  if (memoryStore.syncHistory.length > 50) {
    memoryStore.syncHistory.pop();
  }
}

export async function getRecentSyncJobs(limit: number = 20): Promise<SyncJobHistory[]> {
  const db = await getMongoDb();
  if (db) {
    try {
      const items = await db
        .collection<SyncJobHistory>(COLLECTIONS.SYNC_JOB_HISTORY)
        .find()
        .sort({ startedAt: -1 })
        .limit(limit)
        .toArray();
      if (items.length > 0) return items;
    } catch (e) {
      console.warn('MongoDB getRecentSyncJobs error', e);
    }
  }

  return memoryStore.syncHistory.slice(0, limit);
}

// -------------------------------------------------------------
// Real-Time Quotes & Historical OHLCV Cache Repository
// -------------------------------------------------------------
export async function upsertQuote(quote: StockQuote): Promise<void> {
  const clean = quote.symbol.toUpperCase().trim();
  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection(COLLECTIONS.QUOTES).updateOne(
        { symbol: clean, exchange: quote.exchange },
        { $set: quote },
        { upsert: true }
      );
    } catch (e) {
      console.warn('MongoDB upsertQuote error', e);
    }
  }
  memoryStore.quotes.set(`${clean}_${quote.exchange}`, quote);
  memoryStore.quotes.set(clean, quote);
}

export async function getLatestQuote(symbol: string, exchange?: Exchange): Promise<StockQuote | null> {
  const clean = symbol.toUpperCase().trim();
  const db = await getMongoDb();
  if (db) {
    try {
      const filter: any = { symbol: clean };
      if (exchange) filter.exchange = exchange;
      const quote = await db.collection<StockQuote>(COLLECTIONS.QUOTES).findOne(filter);
      if (quote) return quote;
    } catch (e) {
      console.warn('MongoDB getLatestQuote error', e);
    }
  }

  if (exchange) {
    const specific = memoryStore.quotes.get(`${clean}_${exchange}`);
    if (specific) return specific;
  }
  return memoryStore.quotes.get(clean) || null;
}

export async function saveHistoricalOHLCV(
  symbol: string,
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y',
  candles: OHLCVCandle[],
  source: string,
  exchange: Exchange = 'NSE',
  isin?: string
): Promise<void> {
  const clean = symbol.toUpperCase().trim();
  const doc: HistoricalOHLCVDocument = {
    symbol: clean,
    isin,
    exchange,
    timeframe,
    candles,
    lastUpdated: new Date().toISOString(),
    source,
  };

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection(COLLECTIONS.HISTORICAL_OHLCV).updateOne(
        { symbol: clean, timeframe },
        { $set: doc },
        { upsert: true }
      );
    } catch (e) {
      console.warn('MongoDB saveHistoricalOHLCV error', e);
    }
  }

  memoryStore.historicalOHLCV.set(`${clean}_${timeframe}`, doc);
}

export async function getCachedHistoricalOHLCV(
  symbol: string,
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y'
): Promise<HistoricalOHLCVDocument | null> {
  const clean = symbol.toUpperCase().trim();
  const cacheKey = `${clean}_${timeframe}`;

  // Time-to-live: 5 mins for intraday 1D, 4 hours for others
  const ttlMs = timeframe === '1D' ? 5 * 60 * 1000 : 4 * 60 * 60 * 1000;
  const now = Date.now();

  const memoryCached = memoryStore.historicalOHLCV.get(cacheKey);
  if (memoryCached) {
    const age = now - new Date(memoryCached.lastUpdated).getTime();
    if (age < ttlMs) {
      return memoryCached;
    }
  }

  const db = await getMongoDb();
  if (db) {
    try {
      const doc = await db.collection<HistoricalOHLCVDocument>(COLLECTIONS.HISTORICAL_OHLCV).findOne({
        symbol: clean,
        timeframe,
      });
      if (doc) {
        const age = now - new Date(doc.lastUpdated).getTime();
        if (age < ttlMs) {
          memoryStore.historicalOHLCV.set(cacheKey, doc);
          return doc;
        }
      }
    } catch (e) {
      console.warn('MongoDB getCachedHistoricalOHLCV error', e);
    }
  }

  return null;
}

// -------------------------------------------------------------
// Diagnostics & Universe Coverage Analytics
// -------------------------------------------------------------
export async function getUniverseStatistics(): Promise<{
  totalInstruments: number;
  nseCount: number;
  bseCount: number;
  dualListedCount: number;
  bseOnlyCount: number;
  nseOnlyCount: number;
  smeCount: number;
  staleCount: number;
  providerCoverage: {
    quotesPercent: number;
    ohlcvPercent: number;
    fundamentalsPercent: number;
    statementsPercent: number;
    actionsPercent: number;
    newsPercent: number;
  };
  lastSyncAt: string | null;
}> {
  const instruments = await searchUniverseInstruments({ limit: 1000 });
  const list = instruments.instruments;
  const total = list.length;

  if (total === 0) {
    return {
      totalInstruments: 0,
      nseCount: 0,
      bseCount: 0,
      dualListedCount: 0,
      bseOnlyCount: 0,
      nseOnlyCount: 0,
      smeCount: 0,
      staleCount: 0,
      providerCoverage: {
        quotesPercent: 0,
        ohlcvPercent: 0,
        fundamentalsPercent: 0,
        statementsPercent: 0,
        actionsPercent: 0,
        newsPercent: 0,
      },
      lastSyncAt: null,
    };
  }

  let nse = 0;
  let bse = 0;
  let dual = 0;
  let bseOnly = 0;
  let nseOnly = 0;
  let sme = 0;
  let quotesCount = 0;
  let ohlcvCount = 0;
  let fundCount = 0;
  let stmtCount = 0;
  let actCount = 0;
  let newsCount = 0;
  let staleCount = 0;
  let latestSync: string | null = null;

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  list.forEach(inst => {
    const hasNse = inst.exchanges.includes('NSE');
    const hasBse = inst.exchanges.includes('BSE');
    if (hasNse) nse++;
    if (hasBse) bse++;
    if (hasNse && hasBse) dual++;
    else if (hasBse && !hasNse) bseOnly++;
    else if (hasNse && !hasBse) nseOnly++;

    if (inst.isSME) sme++;

    if (inst.coverage?.quotes) quotesCount++;
    if (inst.coverage?.historicalOHLCV) ohlcvCount++;
    if (inst.coverage?.fundamentals) fundCount++;
    if (inst.coverage?.financialStatements) stmtCount++;
    if (inst.coverage?.corporateActions) actCount++;
    if (inst.coverage?.news) newsCount++;

    const syncTime = inst.lastSyncAt ? new Date(inst.lastSyncAt).getTime() : 0;
    if (syncTime < oneDayAgo) staleCount++;
    if (!latestSync || (inst.lastSyncAt && inst.lastSyncAt > latestSync)) {
      latestSync = inst.lastSyncAt;
    }
  });

  return {
    totalInstruments: total,
    nseCount: nse,
    bseCount: bse,
    dualListedCount: dual,
    bseOnlyCount: bseOnly,
    nseOnlyCount: nseOnly,
    smeCount: sme,
    staleCount,
    providerCoverage: {
      quotesPercent: Math.round((quotesCount / total) * 100),
      ohlcvPercent: Math.round((ohlcvCount / total) * 100),
      fundamentalsPercent: Math.round((fundCount / total) * 100),
      statementsPercent: Math.round((stmtCount / total) * 100),
      actionsPercent: Math.round((actCount / total) * 100),
      newsPercent: Math.round((newsCount / total) * 100),
    },
    lastSyncAt: latestSync,
  };
}

// ============================================================================
// RAG Document Chunk Store Functions
// ============================================================================

export async function saveRAGChunk(chunk: RAGDocumentChunk): Promise<void> {
  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection<RAGDocumentChunk>(COLLECTIONS.RAG_CHUNKS).updateOne(
        { id: chunk.id },
        { $set: chunk },
        { upsert: true }
      );
      return;
    } catch (e) {
      console.warn('[MongoDB] Failed to persist RAG chunk, saving to memory fallback:', (e as Error).message);
    }
  }
  memoryStore.ragChunks.set(chunk.id, chunk);
}

export async function bulkSaveRAGChunks(chunks: RAGDocumentChunk[]): Promise<number> {
  const db = await getMongoDb();
  if (db && chunks.length > 0) {
    try {
      const ops = chunks.map(chunk => ({
        updateOne: {
          filter: { id: chunk.id },
          update: { $set: chunk },
          upsert: true,
        },
      }));
      await db.collection<RAGDocumentChunk>(COLLECTIONS.RAG_CHUNKS).bulkWrite(ops);
      return chunks.length;
    } catch (e) {
      console.warn('[MongoDB] Failed bulk save RAG chunks, saving to memory fallback:', (e as Error).message);
    }
  }

  for (const chunk of chunks) {
    memoryStore.ragChunks.set(chunk.id, chunk);
  }
  return chunks.length;
}

export async function getRAGChunks(filter?: { symbol?: string; category?: string }): Promise<RAGDocumentChunk[]> {
  const db = await getMongoDb();
  if (db) {
    try {
      const query: Record<string, any> = {};
      if (filter?.symbol) query.symbol = filter.symbol.toUpperCase();
      if (filter?.category) query.category = filter.category;
      return await db.collection<RAGDocumentChunk>(COLLECTIONS.RAG_CHUNKS).find(query).toArray();
    } catch (e) {
      console.warn('[MongoDB] Query RAG chunks failed, falling back to memory store:', (e as Error).message);
    }
  }

  let list = Array.from(memoryStore.ragChunks.values());
  if (filter?.symbol) {
    const sym = filter.symbol.toUpperCase();
    list = list.filter(c => !c.symbol || c.symbol.toUpperCase() === sym);
  }
  if (filter?.category) {
    list = list.filter(c => c.category === filter.category);
  }
  return list;
}

export async function countRAGChunks(): Promise<number> {
  const db = await getMongoDb();
  if (db) {
    try {
      return await db.collection<RAGDocumentChunk>(COLLECTIONS.RAG_CHUNKS).countDocuments();
    } catch (e) {
      // fallback
    }
  }
  return memoryStore.ragChunks.size;
}

