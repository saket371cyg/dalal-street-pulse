'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MarketIndex } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Compass, ArrowUpRight, BarChart2 } from 'lucide-react';
import { formatPercent, formatINR } from '@/lib/utils/indian-market';

export default function IndianMarketsPage() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/stocks?mode=indices', { signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.indices) setIndices(data.indices);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.warn('[Markets] Indices fetch notice:', err?.message || err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full transition-all">
      <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Indian Equity Markets
          </h1>
          <Badge variant="outline" className="text-xs">NSE & BSE</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Comprehensive benchmark indices, sectoral rotations, and institutional participation tracking.
        </p>
      </div>

      {/* Main Indices Detailed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && indices.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/60 bg-card/60 p-4 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-5 w-14 bg-muted rounded" />
              </div>
              <div className="h-8 w-36 bg-muted rounded" />
              <div className="h-2 w-full bg-muted/50 rounded mt-3" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="h-6 bg-muted/40 rounded" />
                <div className="h-6 bg-muted/40 rounded" />
                <div className="h-6 bg-muted/40 rounded" />
              </div>
            </Card>
          ))
        ) : (
          indices.map(idx => {
            const isPos = idx.change >= 0;
            const rangePct = Math.min(100, Math.max(0, ((idx.currentValue - idx.low) / (idx.high - idx.low || 1)) * 100));
            return (
              <Card key={idx.symbol} className="border-border/60 bg-card/70 backdrop-blur-xs hover:border-primary/50 hover:shadow-xs transition-all">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">{idx.name}</CardTitle>
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{idx.symbol}</span>
                  </div>
                  <Badge variant={isPos ? 'default' : 'destructive'} className="font-mono tabular-nums text-xs">
                    {formatPercent(idx.percentChange)}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
                      {idx.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xs font-mono tabular-nums font-semibold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPos ? '+' : ''}{idx.change.toFixed(2)} pts
                    </div>
                  </div>

                  {/* Day Range Visual Bar */}
                  <div className="space-y-1">
                    <div className="relative h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isPos ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.max(5, rangePct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Day Low</span>
                      <span className="font-medium text-foreground">{idx.low.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Day High</span>
                      <span className="font-medium text-foreground">{idx.high.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Prev Close</span>
                      <span className="font-medium text-foreground">{idx.previousClose.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Institutional Activity: FII & DII Flows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Institutional Activity (FII & DII Daily Flows)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/40 bg-muted/20">
                <div>
                  <span className="font-bold text-foreground">DII (Domestic Institutional Investors)</span>
                  <p className="text-[11px] text-muted-foreground">Supported by record monthly Mutual Fund SIP inflows</p>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="text-sm font-bold text-emerald-500">+₹4,850.20 Cr</span>
                  <span className="text-[10px] text-muted-foreground block font-sans">Net Buyers</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/40 bg-muted/20">
                <div>
                  <span className="font-bold text-foreground">FII (Foreign Institutional Investors)</span>
                  <p className="text-[11px] text-muted-foreground">Cash market gross sales moderated</p>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="text-sm font-bold text-rose-500">-₹1,240.50 Cr</span>
                  <span className="text-[10px] text-muted-foreground block font-sans">Net Sellers</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Major Sector Rotations */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Sectoral Performance & Weightage in NIFTY 50
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-2.5 text-xs">
              {[
                { name: 'Financial Services & Banking', weight: '34.2%', weightNum: 34.2, move: 0.63 },
                { name: 'Information Technology (IT)', weight: '13.8%', weightNum: 13.8, move: -0.27 },
                { name: 'Oil, Gas & Consumable Fuels', weight: '11.5%', weightNum: 11.5, move: 1.11 },
                { name: 'Fast Moving Consumer Goods (FMCG)', weight: '8.7%', weightNum: 8.7, move: 0.64 },
                { name: 'Automobile & Auto Components', weight: '7.2%', weightNum: 7.2, move: 0.85 },
                { name: 'Healthcare & Pharma', weight: '4.8%', weightNum: 4.8, move: 1.49 },
              ].map(sec => {
                const isPos = sec.move >= 0;
                return (
                  <div key={sec.name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground truncate">{sec.name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">Weight: {sec.weight}</span>
                      </div>
                      <div className="h-1 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full"
                          style={{ width: `${Math.min(100, sec.weightNum * 2.5)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`font-mono tabular-nums font-bold shrink-0 ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatPercent(sec.move)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
