import { EventEmitter } from 'events';
import { StockQuote, Exchange, DataFreshness } from '@/types';
import { normalizeIndianSymbol, getMarketSessionStatus } from '@/lib/utils/indian-market';
import { VERIFIED_INDIAN_STOCKS } from './dataset';
import { upsertQuote } from '@/lib/db/store';

export interface TrueDataFeedConfig {
  username?: string;
  password?: string;
  wsUrl?: string;
  heartbeatIntervalMs?: number;
  maxReconnectAttempts?: number;
  reconnectBaseDelayMs?: number;
}

export type FeedConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'AUTHENTICATING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'EVALUATION_STANDBY';

/**
 * TrueData WebSocket Real-Time Market Data Feed Manager
 *
 * Implements authorized TrueData WebSocket protocol:
 * - Handshake and authentication
 * - Symbol subscriptions for Real-Time (Tick) & Touchline (L1/L2) data
 * - Exponential backoff reconnection with jitter
 * - Heartbeat ping/pong controls
 * - Message normalization and timestamp validation
 * - Freshness tracking (live / delayed / eod / stale)
 * - Seamless fallback to evaluation standby mode when credentials are not configured
 */
export class TrueDataFeedManager extends EventEmitter {
  private static instance: TrueDataFeedManager;

  private config: TrueDataFeedConfig;
  private ws: any = null;
  private state: FeedConnectionState = 'DISCONNECTED';
  private subscribedSymbols = new Set<string>();
  private quoteCache = new Map<string, StockQuote>();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private simulationTimer: NodeJS.Timeout | null = null;
  private lastMessageTimestamp: Date | null = null;
  private connectionError: string | null = null;

  private constructor(config?: TrueDataFeedConfig) {
    super();
    this.config = {
      username: process.env.TRUE_DATA_USERNAME,
      password: process.env.TRUE_DATA_PASSWORD,
      wsUrl: process.env.TRUE_DATA_WS_URL || 'wss://realtime.truedata.in',
      heartbeatIntervalMs: 20000,
      maxReconnectAttempts: 10,
      reconnectBaseDelayMs: 1000,
      ...config,
    };

    // Pre-populate cache with verified benchmark stocks
    for (const [sym, item] of Object.entries(VERIFIED_INDIAN_STOCKS)) {
      this.quoteCache.set(sym, {
        ...item.quote,
        freshness: this.hasValidCredentials() ? 'live' : 'delayed',
      });
    }

    // Auto-initialize connection
    this.initialize();
  }

  public static getInstance(config?: TrueDataFeedConfig): TrueDataFeedManager {
    if (!TrueDataFeedManager.instance) {
      TrueDataFeedManager.instance = new TrueDataFeedManager(config);
    }
    return TrueDataFeedManager.instance;
  }

  public hasValidCredentials(): boolean {
    return Boolean(this.config.username && this.config.password && this.config.username.trim().length > 0);
  }

  public getState(): FeedConnectionState {
    return this.state;
  }

  public getConnectionStatus() {
    return {
      state: this.state,
      hasCredentials: this.hasValidCredentials(),
      wsUrl: this.config.wsUrl,
      subscribedCount: this.subscribedSymbols.size,
      cachedQuotesCount: this.quoteCache.size,
      lastMessageAt: this.lastMessageTimestamp?.toISOString() || null,
      reconnectAttempts: this.reconnectAttempts,
      error: this.connectionError,
    };
  }

  public initialize(): void {
    if (this.hasValidCredentials()) {
      this.connectWebSocket();
    } else {
      this.state = 'EVALUATION_STANDBY';
      this.connectionError = 'TrueData credentials (TRUE_DATA_USERNAME / TRUE_DATA_PASSWORD) not configured. Feed running in evaluation standby mode.';
      this.startEvaluationSimulation();
      // Proactively pre-warm cache with live quotes for key benchmark stocks
      const benchmarks = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'ITC', 'SBIN', 'LT', 'HINDUNILVR', 'TATAMOTORS'];
      this.fetchPublicQuotes(benchmarks).catch(() => {});
    }
  }

  /**
   * Connects to TrueData WebSocket endpoint using Node native WebSocket
   */
  private connectWebSocket(): void {
    if (typeof WebSocket === 'undefined') {
      console.warn('[TrueData Feed] WebSocket is not supported in this runtime');
      this.state = 'EVALUATION_STANDBY';
      return;
    }

    this.state = 'CONNECTING';
    this.connectionError = null;

    try {
      const wsUrl = this.config.wsUrl || 'wss://realtime.truedata.in';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.state = 'AUTHENTICATING';
        this.reconnectAttempts = 0;
        this.sendAuthentication();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event: any) => {
        this.lastMessageTimestamp = new Date();
        this.handleIncomingMessage(event.data);
      };

      this.ws.onerror = (err: any) => {
        const errorMsg = err?.message || 'WebSocket connection error';
        console.warn('[TrueData Feed] WebSocket error:', errorMsg);
        this.connectionError = errorMsg;
        this.emit('error', errorMsg);
      };

      this.ws.onclose = (event: any) => {
        console.warn(`[TrueData Feed] WebSocket closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
        this.stopHeartbeat();
        this.scheduleReconnect();
      };
    } catch (err) {
      this.connectionError = (err as Error).message;
      this.scheduleReconnect();
    }
  }

  /**
   * Sends TrueData login authentication frame
   */
  private sendAuthentication(): void {
    if (!this.ws || this.ws.readyState !== 1) return;

    const authPayload = {
      method: 'login',
      user: this.config.username,
      password: this.config.password,
      client: 'DalalStreetPulse_v1.0',
    };

    try {
      this.ws.send(JSON.stringify(authPayload));
    } catch (err) {
      console.error('[TrueData Feed] Failed to send login payload:', err);
    }
  }

  /**
   * Schedules reconnection using exponential backoff with jitter
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this.state = 'EVALUATION_STANDBY';
      this.connectionError = `Exceeded max reconnect attempts (${this.config.maxReconnectAttempts}). Falling back to evaluation standby mode.`;
      this.startEvaluationSimulation();
      return;
    }

    this.state = 'RECONNECTING';
    this.reconnectAttempts++;

    const baseDelay = this.config.reconnectBaseDelayMs || 1000;
    // Exponential backoff: base * 2^attempts + jitter
    const delay = Math.min(30000, baseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 500);

    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  /**
   * Maintains WebSocket connection with TrueData heartbeat ping frames
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) {
        try {
          this.ws.send(JSON.stringify({ method: 'ping', timestamp: Date.now() }));
        } catch {}
      }
    }, this.config.heartbeatIntervalMs || 20000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Processes and normalizes incoming frames from TrueData WebSocket
   */
  public handleIncomingMessage(rawMessage: string | Buffer): void {
    try {
      const text = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString('utf-8');
      const data = JSON.parse(text);

      // Handle Authentication Acknowledgement
      if (data.status === 'success' || data.message === 'login_successful' || data.logged_in) {
        this.state = 'CONNECTED';
        this.connectionError = null;
        this.emit('connected');
        // Resubscribe to all tracked symbols
        this.resubscribeAll();
        return;
      }

      // Handle Heartbeat Pong
      if (data.method === 'pong' || data.status === 'pong') {
        return;
      }

      // Handle Normalized Quote / Touchline data frame
      if (data.symbol && (data.ltp !== undefined || data.last_price !== undefined || data.price !== undefined)) {
        const quote = this.normalizeTrueDataQuote(data);
        if (quote) {
          this.updateQuote(quote);
        }
      }
    } catch {
      // In case of non-JSON binary frames or parsing error
    }
  }

  /**
   * Normalizes TrueData raw message into standard StockQuote
   */
  public normalizeTrueDataQuote(data: any): StockQuote | null {
    const rawSymbol = data.symbol || data.ticker || '';
    const { cleanSymbol } = normalizeIndianSymbol(rawSymbol);
    if (!cleanSymbol) return null;

    const existing = this.quoteCache.get(cleanSymbol) || VERIFIED_INDIAN_STOCKS[cleanSymbol]?.quote;
    const currentPrice = Number(data.ltp ?? data.last_price ?? data.price ?? existing?.currentPrice ?? 0);
    const prevClose = Number(data.prev_close ?? data.close ?? existing?.previousClose ?? currentPrice);
    const change = Number(data.change ?? (currentPrice - prevClose));
    const percentChange = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

    // Validate and format timestamp in Asia/Kolkata
    const timestamp = this.parseTrueDataTimestamp(data.timestamp || data.time || data.trade_time);
    const freshness = this.evaluateFreshness(timestamp);

    const quote: StockQuote = {
      symbol: cleanSymbol,
      exchange: (data.exchange as Exchange) || (rawSymbol.includes('_BSE') ? 'BSE' : 'NSE'),
      companyName: existing?.companyName || cleanSymbol,
      currentPrice: Number(currentPrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      percentChange,
      open: Number((data.open ?? existing?.open ?? currentPrice).toFixed(2)),
      high: Number((data.high ?? existing?.high ?? currentPrice).toFixed(2)),
      low: Number((data.low ?? existing?.low ?? currentPrice).toFixed(2)),
      previousClose: Number(prevClose.toFixed(2)),
      volume: Number(data.volume ?? data.vol ?? existing?.volume ?? 0),
      week52High: existing?.week52High || (currentPrice > 0 ? currentPrice : 0),
      week52Low: existing?.week52Low || (currentPrice > 0 ? currentPrice : 0),
      marketCapCrores: existing?.marketCapCrores || 0,
      lastUpdated: timestamp,
      freshness,
    };

    return quote;
  }

  /**
   * Evaluates quote freshness based on IST market session hours and update time
   */
  public evaluateFreshness(isoTimestamp: string): DataFreshness {
    if (!isoTimestamp) return 'unavailable';

    const session = getMarketSessionStatus();
    const isOpen = session.status === 'REGULAR' || session.status === 'PRE_OPEN';
    const updateTime = new Date(isoTimestamp).getTime();
    if (isNaN(updateTime)) return 'unavailable';

    const ageSeconds = (Date.now() - updateTime) / 1000;

    if (!isOpen) {
      return 'eod';
    }

    if (ageSeconds <= 60) {
      return 'live';
    } else if (ageSeconds <= 900) {
      return 'delayed';
    } else {
      return 'cached';
    }
  }

  /**
   * Safely parses TrueData timestamp formats (e.g., "YYYY-MM-DD HH:mm:ss" in IST, epoch ms)
   */
  private parseTrueDataTimestamp(rawTime: any): string {
    if (!rawTime) return new Date().toISOString();

    if (typeof rawTime === 'number') {
      const ms = rawTime > 10000000000 ? rawTime : rawTime * 1000;
      return new Date(ms).toISOString();
    }

    if (typeof rawTime === 'string') {
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(rawTime)) {
        return new Date(`${rawTime.replace(' ', 'T')}+05:30`).toISOString();
      }
      const parsed = Date.parse(rawTime);
      if (!isNaN(parsed)) return new Date(parsed).toISOString();
    }

    return new Date().toISOString();
  }

  /**
   * Subscribes to real-time quotes for given symbols
   */
  public subscribe(symbols: string[]): void {
    const toAdd: string[] = [];
    for (const sym of symbols) {
      const { cleanSymbol } = normalizeIndianSymbol(sym);
      if (cleanSymbol && !this.subscribedSymbols.has(cleanSymbol)) {
        this.subscribedSymbols.add(cleanSymbol);
        toAdd.push(cleanSymbol);
      }
    }

    if (toAdd.length === 0) return;

    if (this.ws && this.ws.readyState === 1) {
      try {
        const payload = {
          method: 'addsymbol',
          symbols: toAdd.length > 0 ? toAdd : symbols,
        };
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.warn('[TrueData Feed] Failed to send subscription:', err);
      }
    } else if (!this.hasValidCredentials()) {
      // In public feed mode, immediately query genuine quotes for subscribed symbols
      this.fetchPublicQuotes(symbols).catch(() => {});
    }
  }

  /**
   * Unsubscribes from given symbols
   */
  public unsubscribe(symbols: string[]): void {
    const toRemove: string[] = [];
    for (const sym of symbols) {
      const { cleanSymbol } = normalizeIndianSymbol(sym);
      if (cleanSymbol && this.subscribedSymbols.has(cleanSymbol)) {
        this.subscribedSymbols.delete(cleanSymbol);
        toRemove.push(cleanSymbol);
      }
    }

    if (toRemove.length === 0) return;

    if (this.ws && this.ws.readyState === 1) {
      try {
        const payload = {
          method: 'removesymbol',
          symbols: toRemove,
        };
        this.ws.send(JSON.stringify(payload));
      } catch {}
    }
  }

  private resubscribeAll(): void {
    if (this.subscribedSymbols.size === 0) return;
    const allSymbols = Array.from(this.subscribedSymbols);
    this.subscribe(allSymbols);
  }

  /**
   * Updates quote cache, emits event, and persists to store
   */
  public updateQuote(quote: StockQuote): void {
    if (!quote || !quote.symbol || quote.currentPrice <= 0) return;

    const existing = this.quoteCache.get(quote.symbol);
    // Only emit and update if quote genuinely changed or freshness changed
    if (
      existing &&
      existing.currentPrice === quote.currentPrice &&
      existing.lastUpdated === quote.lastUpdated &&
      existing.volume === quote.volume &&
      existing.freshness === quote.freshness
    ) {
      return;
    }

    this.quoteCache.set(quote.symbol, quote);
    this.emit('quote', quote);

    // Asynchronously upsert to database
    upsertQuote(quote).catch(() => {});
  }

  public getCachedQuote(symbol: string): StockQuote | null {
    const { cleanSymbol } = normalizeIndianSymbol(symbol);
    const quote = this.quoteCache.get(cleanSymbol);
    if (!quote) return null;
    return {
      ...quote,
      freshness: this.evaluateFreshness(quote.lastUpdated),
    };
  }

  public getAllCachedQuotes(): StockQuote[] {
    return Array.from(this.quoteCache.values());
  }

  /**
   * Fetches genuine quote from public financial endpoint without fabricating data
   */
  public async fetchPublicQuote(cleanSymbol: string): Promise<StockQuote | null> {
    try {
      const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const resolved = cleanSymbol === 'TATAMOTORS' ? 'TMCV' : cleanSymbol;
      
      let meta: any = null;
      let usedExchange: Exchange = 'NSE';

      for (const ex of ['.NS', '.BO']) {
        try {
          const yahooSym = `${resolved}${ex}`;
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=1d&interval=5m`,
            {
              headers: { "User-Agent": UA },
              signal: AbortSignal.timeout(4000),
            }
          );
          if (res.ok) {
            const data = await res.json();
            const foundMeta = data?.chart?.result?.[0]?.meta;
            if (foundMeta && foundMeta.regularMarketPrice) {
              meta = foundMeta;
              usedExchange = ex === '.BO' ? 'BSE' : 'NSE';
              break;
            }
          }
        } catch {}
      }

      if (!meta || !meta.regularMarketPrice) return null;

      const current = this.quoteCache.get(cleanSymbol) || VERIFIED_INDIAN_STOCKS[cleanSymbol]?.quote;
      const currentPrice = Number(meta.regularMarketPrice.toFixed(2));
      const prevClose = Number((meta.previousClose || meta.chartPreviousClose || current?.previousClose || currentPrice).toFixed(2));
      const change = Number((currentPrice - prevClose).toFixed(2));
      const percentChange = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
      const lastUpdated = meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString();
      const freshness = this.evaluateFreshness(lastUpdated);

      const quote: StockQuote = {
        symbol: cleanSymbol,
        exchange: usedExchange,
        companyName: meta.shortName || meta.longName || current?.companyName || cleanSymbol,
        currentPrice,
        change,
        percentChange,
        open: Number((meta.regularMarketOpen || meta.regularMarketDayLow || current?.open || currentPrice).toFixed(2)),
        high: Number((meta.regularMarketDayHigh || current?.high || currentPrice).toFixed(2)),
        low: Number((meta.regularMarketDayLow || current?.low || currentPrice).toFixed(2)),
        previousClose: prevClose,
        volume: meta.regularMarketVolume || current?.volume || 0,
        week52High: Number((meta.fiftyTwoWeekHigh || current?.week52High || currentPrice).toFixed(2)),
        week52Low: Number((meta.fiftyTwoWeekLow || current?.week52Low || currentPrice).toFixed(2)),
        marketCapCrores: current?.marketCapCrores || 0,
        lastUpdated,
        freshness,
      };

      this.updateQuote(quote);
      return quote;
    } catch {
      return null;
    }
  }

  public async fetchPublicQuotes(symbols: string[]): Promise<void> {
    for (const sym of symbols) {
      await this.fetchPublicQuote(sym);
    }
  }

  /**
   * Verified Public Feed Sync:
   * When authorized TrueData WebSocket credentials are not configured,
   * periodically checks genuine upstream public endpoints for subscribed symbols.
   * NEVER generates synthetic micro-ticks or artificial price fluctuations.
   * Only emits a new quote when an actual upstream update arrives.
   */
  private startEvaluationSimulation(): void {
    if (this.simulationTimer) return;

    this.simulationTimer = setInterval(async () => {
      // Gather active subscribed symbols, or benchmark stocks if none subscribed
      const tracked = this.subscribedSymbols.size > 0
        ? Array.from(this.subscribedSymbols)
        : ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'ITC'];

      if (tracked.length === 0) return;

      // Rotate through tracked symbols one by one per interval tick to respect upstream rate limits
      const randomSym = tracked[Math.floor(Math.random() * tracked.length)];
      await this.fetchPublicQuote(randomSym);
      // NOTE: If fetch fails or no update arrives, DO NOT invent micro-ticks. No fake trades.
    }, 6000);
  }

  public stopEvaluationSimulation(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  public destroy(): void {
    this.stopHeartbeat();
    this.stopEvaluationSimulation();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
    this.removeAllListeners();
  }
}

/**
 * Global getter for TrueData feed manager singleton
 */
export function getTrueDataFeedManager(): TrueDataFeedManager {
  return TrueDataFeedManager.getInstance();
}
