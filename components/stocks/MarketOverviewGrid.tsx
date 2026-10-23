'use client';

import React from 'react';
import { StockQuote, Instrument } from '@/types';
import { formatINR, formatVolume, formatCrores } from '@/lib/utils/indian-market';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Layers,
  BarChart3,
  Shield,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
  ArrowUpDown,
  Compass,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarketOverviewGridProps {
  quote: StockQuote;
  instrument?: Instrument | null;
}

export function MarketOverviewGrid({ quote, instrument }: MarketOverviewGridProps) {
  const currentPrice = quote.currentPrice;
  const hasPrice = currentPrice > 0;
  const isPos = quote.change >= 0;

  // Day Range calculation
  const dayHigh = quote.high > 0 ? quote.high : currentPrice;
  const dayLow = quote.low > 0 ? quote.low : currentPrice;
  const dayRangeSpread = dayHigh - dayLow;
  const dayPositionPercent = dayRangeSpread > 0
    ? Math.min(100, Math.max(0, ((currentPrice - dayLow) / dayRangeSpread) * 100))
    : 50;

  // 52-Week Range calculation
  const week52High = quote.week52High > 0 ? quote.week52High : (dayHigh || currentPrice);
  const week52Low = quote.week52Low > 0 ? quote.week52Low : (dayLow || currentPrice);
  const week52Spread = week52High - week52Low;
  const week52PositionPercent = week52Spread > 0
    ? Math.min(100, Math.max(0, ((currentPrice - week52Low) / week52Spread) * 100))
    : 50;

  const distanceTo52WHigh = week52High > 0 && currentPrice > 0
    ? (((week52High - currentPrice) / week52High) * 100).toFixed(1)
    : null;

  const distanceTo52WLow = week52Low > 0 && currentPrice > 0
    ? (((currentPrice - week52Low) / week52Low) * 100).toFixed(1)
    : null;

  // Circuit limits (standard 20% bands if not overridden)
  const prevClose = quote.previousClose > 0 ? quote.previousClose : currentPrice;
  const upperCircuit = quote.upperCircuit || (prevClose > 0 ? Number((prevClose * 1.20).toFixed(2)) : 0);
  const lowerCircuit = quote.lowerCircuit || (prevClose > 0 ? Number((prevClose * 0.80).toFixed(2)) : 0);

  // VWAP & Turnover
  const vwap = quote.vwap;
  const turnoverCrores = quote.turnoverCrores || (quote.volume > 0 && currentPrice > 0 ? Number(((quote.volume * currentPrice) / 10000000).toFixed(2)) : 0);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* 4-Card Responsive Market Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Day Trading Range */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                Today&apos;s Trading Range
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="text-[11px] max-w-xs">
                  Intraday price boundaries from market open to current session.
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="flex justify-between items-baseline text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Low</span>
                  <span className="font-bold text-foreground">{hasPrice && dayLow > 0 ? formatINR(dayLow) : '—'}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground block">Current</span>
                  <span className={`font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {hasPrice ? formatINR(currentPrice) : '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">High</span>
                  <span className="font-bold text-foreground">{hasPrice && dayHigh > 0 ? formatINR(dayHigh) : '—'}</span>
                </div>
              </div>

              {/* Day Visual Range Slider */}
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${isPos ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${dayPositionPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                  <span>Open: {quote.open > 0 ? formatINR(quote.open) : '—'}</span>
                  <span>Prev Close: {quote.previousClose > 0 ? formatINR(quote.previousClose) : '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: 52-Week Boundary & Momentum */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-primary" />
                52-Week Cycle
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="text-[11px] max-w-xs">
                  Trailing 1-year historical price cycle showing cyclical extremes and distance from peak.
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="flex justify-between items-baseline text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground block">52W Low</span>
                  <span className="font-bold text-foreground">{week52Low > 0 ? formatINR(week52Low) : '—'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">52W High</span>
                  <span className="font-bold text-foreground">{week52High > 0 ? formatINR(week52High) : '—'}</span>
                </div>
              </div>

              {/* 52W Visual Range Slider */}
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${week52PositionPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                  <span>{distanceTo52WLow ? `+${distanceTo52WLow}% from Low` : '—'}</span>
                  <span>{distanceTo52WHigh ? `-${distanceTo52WHigh}% from Peak` : '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Volume & VWAP Liquidity */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Volume & Liquidity
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="text-[11px] max-w-xs">
                  Volume Weighted Average Price (VWAP) serves as benchmark for institutional order quality.
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Traded Volume:</span>
                <span className="font-bold text-foreground">{quote.volume > 0 ? formatVolume(quote.volume) : '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">VWAP (Weighted Avg):</span>
                <span className="font-bold text-foreground">
                  {vwap ? formatINR(vwap) : (hasPrice ? formatINR(currentPrice) : '—')}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Est. Turnover:</span>
                <span className="font-bold text-foreground">
                  {turnoverCrores > 0 ? `₹${turnoverCrores.toLocaleString('en-IN')} Cr` : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Circuit Bands & Trading Status */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Price Bands & Status
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="text-[11px] max-w-xs">
                  Regulatory daily circuit limits set by exchange (+20% / -20% standard band).
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Upper Circuit (+20%):</span>
                <span className="font-bold text-emerald-500">{upperCircuit > 0 ? formatINR(upperCircuit) : '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Lower Circuit (-20%):</span>
                <span className="font-bold text-rose-500">{lowerCircuit > 0 ? formatINR(lowerCircuit) : '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Exchange Listing:</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                  {quote.exchange} {instrument?.isSME ? '(SME EMERGE)' : '(Mainboard)'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level-2 Order Book / Market Depth Disclosure Box */}
        <div className="p-3 rounded-lg border border-border/40 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              <strong>Market Depth Note:</strong> Level-2 order book depth (5 best bids / 5 best asks) requires licensed broker terminal connectivity. Snapshot feed provides last executed trade price (LTP) and aggregate session volume.
            </span>
          </div>
          <Badge variant="outline" className="text-[9px] uppercase font-mono shrink-0">
            Certified LTP Feed
          </Badge>
        </div>
      </div>
    </TooltipProvider>
  );
}
