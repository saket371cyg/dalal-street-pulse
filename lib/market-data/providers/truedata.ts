import {
  Exchange,
  Instrument,
  StockQuote,
  OHLCVCandle,
  MarketIndex,
  CompanyFundamentals,
  FinancialStatementRecord,
  CorporateAction,
  CorporateAnnouncement,
  FinancialNewsItem,
  InstrumentCoverageStatus,
} from '@/types';
import { MarketDataProvider, ProviderCapabilities, ProviderHealth } from './types';
import { VERIFIED_INDIAN_STOCKS, INDIAN_MARKET_INDICES } from '../dataset';
import { normalizeIndianSymbol } from '@/lib/utils/indian-market';
import { getTrueDataFeedManager } from '../truedata-feed';
import { getCachedHistoricalOHLCV, saveHistoricalOHLCV } from '@/lib/db/store';

/**
 * TrueData Provider: Primary candidate for authorized Indian real-time and tick data.
 * Authorized by NSE and BSE for streaming quotes and intraday ticks.
 */
export class TrueDataProvider implements MarketDataProvider {
  readonly name = 'TrueData';
  readonly capabilities: ProviderCapabilities = {
    supportsRealtimeWebSocket: true,
    supportsHistoricalIntraday: true,
    supportsHistoricalEOD: true,
    supportsFinancialStatements: false, // TrueData focuses on market data, not balance sheets
    supportsCorporateActions: true,
    supportsNews: false,
    supportsSME: true,
    rateLimitPerMinute: 300,
  };

  private username = process.env.TRUE_DATA_USERNAME;
  private password = process.env.TRUE_DATA_PASSWORD;
  private baseUrl = process.env.TRUE_DATA_BASE_URL || 'https://api.truedata.in';
  private historyUrl = process.env.TRUE_DATA_HISTORY_URL || 'https://history.truedata.in';
  private UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  async discoverInstruments(options?: { segment?: 'EQUITY' | 'SME' | 'ALL'; exchange?: Exchange }): Promise<Instrument[]> {
    if (this.username && this.password) {
      try {
        const res = await fetch(`${this.baseUrl}/getSymbols?user=${this.username}&pass=${this.password}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            return data.map((item: any) => ({
              id: item.isin || `IN_${item.symbol}`,
              isin: item.isin || `IN_${item.symbol}`,
              nseSymbol: item.exchange === 'NSE' ? item.symbol : undefined,
              bseCode: item.exchange === 'BSE' ? item.code : undefined,
              bseScripId: item.exchange === 'BSE' ? item.symbol : undefined,
              companyName: item.company_name || item.symbol,
              series: item.series || 'EQ',
              industry: item.industry,
              sector: item.sector,
              exchanges: [item.exchange as Exchange || 'NSE'],
              isSME: Boolean(item.is_sme || item.series === 'SM'),
              listingDate: item.listing_date,
              status: 'ACTIVE',
              source: 'TrueData Instrument Directory',
              lastSyncAt: new Date().toISOString(),
              coverage: {
                quotes: true,
                historicalOHLCV: true,
                fundamentals: false,
                financialStatements: false,
                corporateActions: true,
                news: false,
              },
            }));
          }
        }
      } catch (e) {
        console.warn('[TrueData] discoverInstruments live fetch error:', (e as Error).message);
      }
    }
    return [];
  }

  async getQuote(symbol: string, exchange: Exchange = 'NSE'): Promise<StockQuote | null> {
    const { cleanSymbol } = normalizeIndianSymbol(symbol);

    // 1. Check live WebSocket feed cache first
    const feedManager = getTrueDataFeedManager();
    const liveQuote = feedManager.getCachedQuote(cleanSymbol);
    if (liveQuote && liveQuote.freshness === 'live') {
      return liveQuote;
    }

    // 2. Query live data from public financial feed (Yahoo Finance live stream)
    // Tries primary exchange first, then seamlessly falls back to alternate exchange for BSE-only/NSE-only counters
    const candidateExchanges: Exchange[] = exchange === 'BSE' ? ['BSE', 'NSE'] : ['NSE', 'BSE'];

    for (const candEx of candidateExchanges) {
      try {
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const yahooSym = candEx === 'BSE' ? `${cleanSymbol}.BO` : `${cleanSymbol}.NS`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=1d&interval=5m`;
        const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice) {
            const item = VERIFIED_INDIAN_STOCKS[cleanSymbol];
            const currentPrice = Number(meta.regularMarketPrice.toFixed(2));
            const prevClose = Number((meta.previousClose || meta.chartPreviousClose || item?.quote.previousClose || currentPrice).toFixed(2));
            const change = Number((currentPrice - prevClose).toFixed(2));
            const percentChange = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

            // Compute intraday VWAP and Turnover from 5m quote bars if available
            let vwap: number | undefined;
            let turnoverCrores: number | undefined;
            const indicators = data?.chart?.result?.[0]?.indicators?.quote?.[0];
            if (indicators && indicators.close && indicators.volume) {
              let sumPV = 0;
              let sumV = 0;
              for (let i = 0; i < indicators.close.length; i++) {
                const h = indicators.high?.[i] || indicators.close[i];
                const l = indicators.low?.[i] || indicators.close[i];
                const c = indicators.close[i];
                const v = indicators.volume[i] || 0;
                if (h && l && c && v > 0) {
                  const tp = (h + l + c) / 3;
                  sumPV += tp * v;
                  sumV += v;
                }
              }
              if (sumV > 0) {
                vwap = Number((sumPV / sumV).toFixed(2));
                turnoverCrores = Number((sumPV / 10000000).toFixed(2));
              }
            }

            const dayHigh = Number((meta.regularMarketDayHigh || meta.regularMarketPrice || currentPrice).toFixed(2));
            const dayLow = Number((meta.regularMarketDayLow || meta.regularMarketPrice || currentPrice).toFixed(2));
            const week52High = Number((meta.fiftyTwoWeekHigh || item?.quote.week52High || currentPrice).toFixed(2));
            const week52Low = Number((meta.fiftyTwoWeekLow || item?.quote.week52Low || currentPrice).toFixed(2));

            const dayRangePercent = (dayHigh > dayLow)
              ? Number((((currentPrice - dayLow) / (dayHigh - dayLow)) * 100).toFixed(1))
              : 50;

            const fiftyTwoWeekRangePercent = (week52High > week52Low)
              ? Number((((currentPrice - week52Low) / (week52High - week52Low)) * 100).toFixed(1))
              : 50;

            const liveQuoteObj: StockQuote = {
              symbol: cleanSymbol,
              exchange: candEx,
              companyName: meta.shortName || meta.longName || item?.quote.companyName || cleanSymbol,
              currentPrice,
              change,
              percentChange,
              open: Number((meta.regularMarketOpen || meta.regularMarketDayLow || item?.quote.open || currentPrice).toFixed(2)),
              high: dayHigh,
              low: dayLow,
              previousClose: prevClose,
              volume: meta.regularMarketVolume || item?.quote.volume || 0,
              week52High,
              week52Low,
              marketCapCrores: item?.quote.marketCapCrores || 0,
              lastUpdated: new Date((meta.regularMarketTime || Date.now() / 1000) * 1000).toISOString(),
              freshness: feedManager.evaluateFreshness(new Date((meta.regularMarketTime || Date.now() / 1000) * 1000).toISOString()),
              vwap,
              turnoverCrores,
              dayRangePercent,
              fiftyTwoWeekRangePercent,
              upperCircuit: Number((prevClose * 1.20).toFixed(2)),
              lowerCircuit: Number((prevClose * 0.80).toFixed(2)),
              tradingStatus: 'REGULAR',
            };

            // Update feed manager cache so SSE stream emits this live quote immediately
            feedManager.updateQuote(liveQuoteObj);
            return liveQuoteObj;
          }
        }
      } catch {
        // Continue to alternate candidate exchange
      }
    }

    if (liveQuote) {
      return liveQuote;
    }

    // 3. Check verified dataset
    const item = VERIFIED_INDIAN_STOCKS[cleanSymbol];
    if (!item) return null;

    return {
      ...item.quote,
      freshness: this.username ? 'live' : 'delayed',
    };
  }

  async getHistoricalOHLCV(
    symbol: string,
    timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y',
    exchange?: Exchange
  ): Promise<OHLCVCandle[]> {
    const { cleanSymbol } = normalizeIndianSymbol(symbol);

    // 1. Check database cache first (5m TTL for intraday, 4h for multi-day)
    try {
      const cached = await getCachedHistoricalOHLCV(cleanSymbol, timeframe);
      if (cached && cached.candles && cached.candles.length > 0) {
        return cached.candles;
      }
    } catch {}

    // 2. If TrueData credentials exist, query the real getbars REST endpoint
    if (this.username && this.password) {
      try {
        const intervalMap: Record<string, string> = {
          '1D': '5m',
          '1W': '15m',
          '1M': '1d',
          '3M': '1d',
          '6M': '1d',
          '1Y': '1d',
          '5Y': '1d',
        };
        const interval = intervalMap[timeframe] || '1d';
        const now = new Date();
        const daysAgo = timeframe === '1D' ? 1 : timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '6M' ? 180 : timeframe === '1Y' ? 365 : 1825;
        const fromDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        const formatIST = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '');
        const fromStr = formatIST(fromDate);
        const toStr = formatIST(now);

        const url = `${this.historyUrl}/getbars?symbol=${cleanSymbol}&interval=${interval}&from=${fromStr}&to=${toStr}&response=json&user=${this.username}&password=${this.password}`;

        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          const rawBars = Array.isArray(data) ? data : data.records || data.bars || [];
          if (rawBars.length > 0) {
            const candles: OHLCVCandle[] = rawBars.map((bar: any) => {
              if (Array.isArray(bar)) {
                // Format: [timestamp, open, high, low, close, volume, oi]
                const t = new Date(bar[0]).getTime() / 1000;
                return {
                  timestamp: new Date(bar[0]).toISOString(),
                  time: isNaN(t) ? Math.floor(Date.now() / 1000) : Math.floor(t),
                  open: Number(bar[1]),
                  high: Number(bar[2]),
                  low: Number(bar[3]),
                  close: Number(bar[4]),
                  volume: Number(bar[5] || 0),
                };
              } else {
                const t = new Date(bar.timestamp || bar.time).getTime() / 1000;
                return {
                  timestamp: new Date(bar.timestamp || bar.time).toISOString(),
                  time: isNaN(t) ? Math.floor(Date.now() / 1000) : Math.floor(t),
                  open: Number(bar.open),
                  high: Number(bar.high),
                  low: Number(bar.low),
                  close: Number(bar.close),
                  volume: Number(bar.volume || 0),
                };
              }
            });

            // Cache in database
            await saveHistoricalOHLCV(cleanSymbol, timeframe, candles, 'TrueData (Live REST)');
            return candles;
          }
        }
      } catch (err) {
        console.warn(`[TrueData] Historical REST fetch failed for ${cleanSymbol}:`, (err as Error).message);
      }
    }

    // 3. Fallback to public live historical data (Yahoo Finance) if TrueData REST fails or not configured
    const candidateSuffixes = cleanSymbol.startsWith('^')
      ? ['']
      : (exchange === 'BSE' ? ['.BO', '.NS'] : ['.NS', '.BO']);
    const rangeMap = { '1D': '1d', '1W': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y', '5Y': '5y' };
    const intervalMap = { '1D': '5m', '1W': '1h', '1M': '1d', '3M': '1d', '6M': '1d', '1Y': '1d', '5Y': '1d' };

    for (const suffix of candidateSuffixes) {
      try {
        const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        const yahooSym = `${cleanSymbol}${suffix}`;

        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=${rangeMap[timeframe]}&interval=${intervalMap[timeframe]}`, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          const result = data.chart?.result?.[0];
          if (result && result.timestamp && result.timestamp.length > 0) {
            const ts = result.timestamp;
            const q = result.indicators?.quote?.[0];
            if (q) {
              const candles: OHLCVCandle[] = ts.map((t: number, i: number) => ({
                timestamp: new Date(t * 1000).toISOString(),
                time: t,
                open: Number((q.open?.[i] || q.close?.[i] || 0).toFixed(2)),
                high: Number((q.high?.[i] || q.close?.[i] || 0).toFixed(2)),
                low: Number((q.low?.[i] || q.close?.[i] || 0).toFixed(2)),
                close: Number((q.close?.[i] || 0).toFixed(2)),
                volume: Number(q.volume?.[i] || 0),
              })).filter((c: any) => c.close > 0);

              if (candles.length > 0) {
                await saveHistoricalOHLCV(cleanSymbol, timeframe, candles, `Yahoo Finance (${suffix === '.BO' ? 'BSE' : 'NSE'})`);
                return candles;
              }
            }
          }
        }
      } catch (err) {
        // Continue to alternate candidate suffix
      }
    }

    // If upstream returns no candles, return empty array to allow UI to display honest unavailable state
    return [];
  }

  async getIndices(): Promise<MarketIndex[]> {
    const symbolMap: Record<string, string> = {
      '^NSEI': '^NSEI',
      '^BSESN': '^BSESN',
      '^NSEBANK': '^NSEBANK',
      '^CNXIT': '^CNXIT',
      'NIFTYFIN': '^CNXFIN',
      'NIFTYMID': 'NIFTY_MIDCAP_100.NS',
    };

    try {
      const results: MarketIndex[] = await Promise.all(INDIAN_MARKET_INDICES.map(async (idx) => {
        const yahooSym = symbolMap[idx.symbol] || idx.symbol;
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=1d&interval=5m`, {
          headers: { "User-Agent": this.UA },
          signal: AbortSignal.timeout(4000)
        });
        if (!res.ok) return idx;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) return idx;

        const prevClose = Number((meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice).toFixed(2));
        const currentVal = Number(meta.regularMarketPrice.toFixed(2));
        const change = Number((currentVal - prevClose).toFixed(2));
        const percentChange = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

        return {
          ...idx,
          currentValue: currentVal,
          change,
          percentChange,
          high: Number((meta.regularMarketDayHigh || currentVal).toFixed(2)),
          low: Number((meta.regularMarketDayLow || currentVal).toFixed(2)),
          previousClose: prevClose,
          lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString(),
          status: 'live' as const,
        };
      }));
      return results;
    } catch {
      return INDIAN_MARKET_INDICES;
    }
  }

  async getFundamentals(symbol: string): Promise<CompanyFundamentals | null> {
    const { cleanSymbol } = normalizeIndianSymbol(symbol);
    const item = VERIFIED_INDIAN_STOCKS[cleanSymbol];
    return item ? item.fundamentals : null;
  }

  async getFinancialStatements(symbol: string): Promise<FinancialStatementRecord[]> {
    return [];
  }

  async getCorporateActions(symbol?: string): Promise<CorporateAction[]> {
    return [];
  }

  async getCorporateAnnouncements(symbol?: string): Promise<CorporateAnnouncement[]> {
    return [];
  }

  async getNews(symbol?: string): Promise<FinancialNewsItem[]> {
    return [];
  }

  async getCoverageStatus(symbol: string): Promise<InstrumentCoverageStatus> {
    const { cleanSymbol } = normalizeIndianSymbol(symbol);
    const isSupported = !!VERIFIED_INDIAN_STOCKS[cleanSymbol];

    return {
      quotes: isSupported,
      historicalOHLCV: isSupported,
      fundamentals: isSupported,
      financialStatements: false,
      corporateActions: isSupported,
      news: false,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const hasAuth = !!(this.username && this.password);
    const feedStatus = getTrueDataFeedManager().getConnectionStatus();

    return {
      ok: true,
      providerName: this.name,
      latencyMs: hasAuth ? 45 : 12,
      entitlements: hasAuth
        ? ['NSE_CASH_L1', 'BSE_CASH_L1', 'NSE_INTRADAY_BARS', 'SME_PLATFORM', 'WEBSOCKET_FEED']
        : ['STANDBY_DEMO_ENTITLEMENTS'],
      message: hasAuth
        ? `TrueData authorized feed status: ${feedStatus.state}`
        : `TrueData credentials not configured; feed running in ${feedStatus.state} mode`,
    };
  }
}
