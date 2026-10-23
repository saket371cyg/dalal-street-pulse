'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MarketIndex, StockQuote, DailyMarketBriefing } from '@/types';
import { formatINR, formatPercent, formatVolume } from '@/lib/utils/indian-market';
import { useLiveQuotes } from '@/hooks/useLiveQuotes';

export default function OverviewDashboardPage() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{ statusLabel: string; istTime: string; isHoliday: boolean } | null>(null);
  const [liveTime, setLiveTime] = useState<string>('');
  const [movers, setMovers] = useState<{ gainers: StockQuote[]; losers: StockQuote[]; mostActive: StockQuote[] }>({
    gainers: [],
    losers: [],
    mostActive: [],
  });
  const [briefing, setBriefing] = useState<DailyMarketBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Live Quote Streaming for Mover Stocks
  const moverSymbols = useMemo(() => {
    const list = new Set<string>();
    movers.gainers.forEach(s => list.add(s.symbol));
    movers.losers.forEach(s => list.add(s.symbol));
    movers.mostActive.forEach(s => list.add(s.symbol));
    return Array.from(list);
  }, [movers]);

  const initialMoverQuotes = useMemo(() => {
    return [...movers.gainers, ...movers.losers, ...movers.mostActive];
  }, [movers]);

  const { quotes: liveQuotes, getFlashClass } = useLiveQuotes({
    symbols: moverSymbols,
    initialQuotes: initialMoverQuotes,
    enabled: moverSymbols.length > 0,
  });

  // 1-second live ticking clock in Asia/Kolkata (IST)
  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const formatted = `${timeStr} IST`;
      setLiveTime(prev => (prev !== formatted ? formatted : prev));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [indicesRes, moversRes, briefingRes] = await Promise.all([
        fetch('/api/stocks?mode=indices').then(r => r.json()),
        fetch('/api/stocks?mode=movers').then(r => r.json()),
        fetch('/api/briefing').then(r => r.json()),
      ]);

      if (indicesRes.indices) setIndices(indicesRes.indices);
      if (indicesRes.session) setSessionInfo(indicesRes.session);
      if (moversRes.gainers) setMovers(moversRes);
      if (briefingRes.briefing) setBriefing(briefingRes.briefing);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full transition-all">
      {/* Top Welcome & Session Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight text-foreground font-serif">
              Dalal Street Intelligence
            </h1>
            <Badge variant="outline" className="border-primary/40 text-primary text-xs">
              NSE & BSE
            </Badge>
          </div>
          <p className="text-xs 2xl:text-sm text-muted-foreground mt-0.5">
            Real-time Indian equity analytics, AI fundamentals & grounded market insights.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-xs bg-card border border-border/60 px-3 py-1.5 rounded-lg" suppressHydrationWarning>
            <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="font-mono text-muted-foreground" suppressHydrationWarning>
              {mounted ? liveTime : (sessionInfo?.istTime || 'Asia/Kolkata (IST)')}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-400" suppressHydrationWarning>
              {sessionInfo?.statusLabel || 'Regular Session'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Benchmark Indices Grid - 6 columns on full screen, responsive down to 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 2xl:gap-4">
        {loading && indices.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/60 bg-card/60 p-4 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
              <div className="h-7 w-28 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted/70 rounded" />
              <div className="h-1.5 w-full bg-muted/40 rounded mt-2" />
            </Card>
          ))
        ) : (
          indices.map(idx => {
            const isPos = idx.change >= 0;
            const rangePct = Math.min(100, Math.max(0, ((idx.currentValue - idx.low) / (idx.high - idx.low || 1)) * 100));
            return (
              <Card key={idx.symbol} className="border-border/60 bg-card/70 backdrop-blur-xs relative overflow-hidden hover:border-primary/40 hover:shadow-xs transition-all">
                <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {idx.name}
                  </CardTitle>
                  <Badge variant={isPos ? 'default' : 'destructive'} className="text-[10px] font-mono tabular-nums px-1.5 py-0 h-5">
                    {formatPercent(idx.percentChange)}
                  </Badge>
                </CardHeader>
                <CardContent className="p-3.5 pt-1">
                  <div className="text-xl 2xl:text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {idx.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-mono tabular-nums">
                    <span className={`font-semibold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPos ? '+' : ''}{idx.change.toFixed(2)} pts
                    </span>
                    <span className="text-muted-foreground/60 text-[10px]">•</span>
                    <span className="text-muted-foreground text-[10px]">Prev: {idx.previousClose.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Day Range Mini Bar */}
                  <div className="mt-3 pt-2 border-t border-border/40 flex flex-col gap-1 text-[10px] text-muted-foreground font-mono tabular-nums">
                    <div className="flex justify-between text-[9px] text-muted-foreground/80">
                      <span>L: {idx.low.toLocaleString('en-IN')}</span>
                      <span>H: {idx.high.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="relative h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isPos ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.max(5, rangePct)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Main Grid: AI Daily Briefing + Market Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Market Briefing */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-sm">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">
                    AI Market Briefing (Grounded in NSE/BSE Data)
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">Automated Daily Intelligence • Asia/Kolkata</p>
                </div>
              </div>
              <Link href="/briefing">
                <Button variant="ghost" size="xs" className="gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10">
                  Full Report <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {briefing ? (
                <>
                  <div className="text-xs leading-relaxed text-foreground/90 font-normal bg-muted/20 p-4 rounded-xl border border-border/40">
                    {briefing.executiveSummary}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-border/40 bg-card/50 space-y-1">
                      <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        <span>NIFTY 50 Catalysts</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {briefing.niftyMoveReason}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/40 bg-card/50 space-y-1">
                      <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                        <span>SENSEX Catalysts</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {briefing.sensexMoveReason}
                      </p>
                    </div>
                  </div>

                  {/* Grounded Stories */}
                  <div className="space-y-2 pt-1">
                    <div className="text-xs font-semibold text-foreground">Key Financial Developments:</div>
                    <div className="space-y-2">
                      {briefing.keyStories.slice(0, 2).map((s, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-muted/30 border border-border/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-foreground">{s.headline}</span>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 space-y-3 animate-pulse">
                  <div className="h-14 bg-muted/30 rounded-xl" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="h-16 bg-muted/20 rounded-xl" />
                    <div className="h-16 bg-muted/20 rounded-xl" />
                  </div>
                  <div className="h-10 bg-muted/20 rounded-lg" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sector Performance Snapshot */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sectoral Indices Movement
              </CardTitle>
              <Link href="/markets" className="text-[11px] text-primary hover:underline font-medium">
                View All Sectors
              </Link>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { sector: 'NIFTY Bank', change: 0.63 },
                  { sector: 'NIFTY Auto', change: 0.85 },
                  { sector: 'NIFTY IT', change: -0.27 },
                  { sector: 'NIFTY Pharma', change: 1.49 },
                  { sector: 'NIFTY FMCG', change: 0.64 },
                  { sector: 'NIFTY Metal', change: -0.15 },
                  { sector: 'NIFTY Energy', change: 1.11 },
                  { sector: 'NIFTY Realty', change: 0.92 },
                ].map(s => {
                  const isPos = s.change >= 0;
                  return (
                    <div
                      key={s.sector}
                      className={`p-2.5 rounded-lg border transition-all ${
                        isPos
                          ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
                          : 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40'
                      } flex flex-col justify-between`}
                    >
                      <span className="text-[11px] font-medium text-foreground truncate">{s.sector}</span>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-xs font-mono font-bold tabular-nums ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatPercent(s.change)}
                        </span>
                        <span className={`text-[10px] ${isPos ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                          {isPos ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Market Movers Tabs (Gainers, Losers, Most Active) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                Market Activity (NSE / BSE)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <Tabs defaultValue="gainers" className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-3">
                  <TabsTrigger value="gainers" className="text-xs">Top Gainers</TabsTrigger>
                  <TabsTrigger value="losers" className="text-xs">Top Losers</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs">Most Active</TabsTrigger>
                </TabsList>

                {loading && movers.gainers.length === 0 ? (
                  <div className="space-y-2 py-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 rounded-lg border border-border/40 bg-muted/20 animate-pulse">
                        <div className="space-y-1">
                          <div className="h-3 w-16 bg-muted rounded" />
                          <div className="h-2.5 w-28 bg-muted/60 rounded" />
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="h-3 w-14 bg-muted rounded ml-auto" />
                          <div className="h-2.5 w-10 bg-muted/60 rounded ml-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Gainers */}
                    <TabsContent value="gainers" className="space-y-2 mt-0">
                      {movers.gainers.map(stock => {
                        const current = liveQuotes[stock.symbol.toUpperCase()] || stock;
                        return (
                          <Link
                            key={stock.symbol}
                            href={`/stocks/${stock.symbol}`}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-muted/30 transition-all"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-foreground font-mono tabular-nums">{stock.symbol}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{stock.exchange}</Badge>
                                {current.freshness === 'live' && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Streaming" />
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[150px] sm:max-w-[200px] 2xl:max-w-[280px]">{stock.companyName}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-mono tabular-nums text-xs font-bold text-foreground inline-block ${getFlashClass(stock.symbol)}`}>
                                {formatINR(current.currentPrice)}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-emerald-500 font-semibold">{formatPercent(current.percentChange)}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </TabsContent>

                    {/* Losers */}
                    <TabsContent value="losers" className="space-y-2 mt-0">
                      {movers.losers.map(stock => {
                        const current = liveQuotes[stock.symbol.toUpperCase()] || stock;
                        return (
                          <Link
                            key={stock.symbol}
                            href={`/stocks/${stock.symbol}`}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-muted/30 transition-all"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-foreground font-mono tabular-nums">{stock.symbol}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{stock.exchange}</Badge>
                                {current.freshness === 'live' && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Streaming" />
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[150px] sm:max-w-[200px] 2xl:max-w-[280px]">{stock.companyName}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-mono tabular-nums text-xs font-bold text-foreground inline-block ${getFlashClass(stock.symbol)}`}>
                                {formatINR(current.currentPrice)}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-rose-500 font-semibold">{formatPercent(current.percentChange)}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </TabsContent>

                    {/* Most Active */}
                    <TabsContent value="active" className="space-y-2 mt-0">
                      {movers.mostActive.map(stock => {
                        const current = liveQuotes[stock.symbol.toUpperCase()] || stock;
                        return (
                          <Link
                            key={stock.symbol}
                            href={`/stocks/${stock.symbol}`}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-muted/30 transition-all"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-foreground font-mono tabular-nums">{stock.symbol}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{stock.exchange}</Badge>
                                {current.freshness === 'live' && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Streaming" />
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[150px] sm:max-w-[200px] 2xl:max-w-[280px]">{stock.companyName}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-mono tabular-nums text-xs font-bold text-foreground inline-block ${getFlashClass(stock.symbol)}`}>
                                {formatINR(current.currentPrice)}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-muted-foreground">Vol: {formatVolume(current.volume)}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </CardContent>
          </Card>

          {/* Quick Search & Explore CTA */}
          <Card className="border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground">Explore 50+ Top Indian Stocks</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Filter by exchange, SME platform & market cap</p>
            </div>
            <Link href="/stocks">
              <Button size="sm" className="gap-1 text-xs">
                Browse <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
