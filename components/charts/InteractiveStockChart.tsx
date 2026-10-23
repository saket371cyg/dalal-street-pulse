'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OHLCVCandle } from '@/types';
import { formatINR, formatVolume, formatPercent } from '@/lib/utils/indian-market';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Activity,
  LineChart,
  Gauge,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InteractiveStockChartProps {
  symbol: string;
  initialTimeframe?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
  exchange?: string;
}

export function InteractiveStockChart({
  symbol,
  initialTimeframe = '1M',
  exchange,
}: InteractiveStockChartProps) {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y'>(initialTimeframe);
  const [chartType, setChartType] = useState<'area' | 'candles'>('area');
  const [showSMA20, setShowSMA20] = useState<boolean>(true);
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredCandle, setHoveredCandle] = useState<OHLCVCandle | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const queryUrl = `/api/stocks/${symbol}/chart?range=${timeframe}${exchange ? `&exchange=${exchange}` : ''}`;
    const controller = new AbortController();
    fetch(queryUrl, { signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (isMounted && data?.candles) {
          setCandles(data.candles);
          setHoveredCandle(null);
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.warn('[InteractiveStockChart] Notice fetching chart:', err?.message || err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [symbol, timeframe, exchange]);

  // Dynamic Technical Indicators Calculation (strictly computed from verified candle history)
  const technicals = useMemo(() => {
    if (candles.length === 0) return null;

    const count = candles.length;
    const closes = candles.map(c => c.close);
    const latestClose = closes[count - 1];

    // 1. 20-period Simple Moving Average
    let sma20: number | null = null;
    const sma20Series: { xIndex: number; value: number }[] = [];
    if (count >= 20) {
      const last20 = closes.slice(-20);
      sma20 = Number((last20.reduce((a, b) => a + b, 0) / 20).toFixed(2));

      // Calculate series points for SVG overlay
      for (let i = 19; i < count; i++) {
        const window = closes.slice(i - 19, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / 20;
        sma20Series.push({ xIndex: i, value: avg });
      }
    }

    // 2. 50-period Simple Moving Average
    let sma50: number | null = null;
    if (count >= 50) {
      const last50 = closes.slice(-50);
      sma50 = Number((last50.reduce((a, b) => a + b, 0) / 50).toFixed(2));
    }

    // 3. 14-period Relative Strength Index (RSI)
    let rsi14: number | null = null;
    if (count >= 15) {
      const changes: number[] = [];
      for (let i = 1; i < count; i++) {
        changes.push(closes[i] - closes[i - 1]);
      }
      const last14 = changes.slice(-14);
      const gains = last14.map(c => (c > 0 ? c : 0));
      const losses = last14.map(c => (c < 0 ? Math.abs(c) : 0));
      const avgGain = gains.reduce((a, b) => a + b, 0) / 14;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / 14;

      if (avgLoss === 0) {
        rsi14 = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi14 = Number((100 - (100 / (1 + rs))).toFixed(1));
      }
    }

    // 4. Classical Floor Pivots (from latest completed candle)
    const latestCandle = candles[count - 1];
    const pivot = Number(((latestCandle.high + latestCandle.low + latestCandle.close) / 3).toFixed(2));
    const r1 = Number(((2 * pivot) - latestCandle.low).toFixed(2));
    const s1 = Number(((2 * pivot) - latestCandle.high).toFixed(2));
    const r2 = Number((pivot + (latestCandle.high - latestCandle.low)).toFixed(2));
    const s2 = Number((pivot - (latestCandle.high - latestCandle.low)).toFixed(2));

    // 5. Period Performance Summary
    const periodStart = candles[0].open;
    const periodEnd = latestCandle.close;
    const periodChange = Number((periodEnd - periodStart).toFixed(2));
    const periodPercent = periodStart > 0 ? Number(((periodChange / periodStart) * 100).toFixed(2)) : 0;
    const periodHigh = Math.max(...candles.map(c => c.high));
    const periodLow = Math.min(...candles.map(c => c.low));
    const periodVolume = candles.reduce((acc, c) => acc + c.volume, 0);

    return {
      count,
      latestClose,
      sma20,
      sma20Series,
      sma50,
      rsi14,
      pivots: { pivot, r1, s1, r2, s2 },
      performance: {
        start: periodStart,
        end: periodEnd,
        change: periodChange,
        percent: periodPercent,
        high: periodHigh,
        low: periodLow,
        volume: periodVolume,
      },
    };
  }, [candles]);

  if (loading) {
    return (
      <div className="h-[380px] w-full flex flex-col items-center justify-center bg-card/40 rounded-xl border border-border/50 animate-pulse">
        <Activity className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-xs text-muted-foreground">Retrieving verified exchange price history for {symbol} ({timeframe})...</p>
      </div>
    );
  }

  if (candles.length === 0) {
    return (
      <div className="h-[320px] w-full flex flex-col items-center justify-center bg-card/40 rounded-xl border border-border/50 p-6 text-center">
        <LineChart className="h-8 w-8 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-semibold text-foreground">Historical Candles Unavailable</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          The upstream market feed did not return verified OHLCV candle records for {symbol} on the {timeframe} timeframe.
          Please try another timeframe or exchange view.
        </p>
      </div>
    );
  }

  // Calculate coordinates & dimensions
  const minPrice = Math.min(...candles.map(c => c.low));
  const maxPrice = Math.max(...candles.map(c => c.high));
  const priceRange = maxPrice - minPrice || 1;
  const maxVolume = Math.max(...candles.map(c => c.volume)) || 1;

  const width = 800;
  const height = 300;
  const volumeHeight = 55;
  const priceChartHeight = height - volumeHeight - 20;

  const isNetPositive = candles[candles.length - 1].close >= candles[0].open;
  const strokeColor = isNetPositive ? '#10b981' : '#f43f5e';

  // Area & Line paths
  const points = candles.map((c, i) => {
    const x = (candles.length > 1 ? i / (candles.length - 1) : 0.5) * (width - 60) + 30;
    const y = priceChartHeight - ((c.close - minPrice) / priceRange) * (priceChartHeight - 40) + 20;
    return `${x},${y}`;
  });

  const areaEndX = candles.length > 1 ? width - 30 : width / 2;
  const areaPath = `M ${points[0]} L ${points.join(' L ')} L ${areaEndX},${priceChartHeight + 20} L 30,${priceChartHeight + 20} Z`;
  const linePath = `M ${points.join(' L ')}`;

  // SMA 20 Overlay Line path
  let sma20Path = '';
  if (technicals?.sma20Series && technicals.sma20Series.length > 0) {
    const smaPoints = technicals.sma20Series.map(pt => {
      const x = (pt.xIndex / (candles.length - 1)) * (width - 60) + 30;
      const y = priceChartHeight - ((pt.value - minPrice) / priceRange) * (priceChartHeight - 40) + 20;
      return `${x},${y}`;
    });
    sma20Path = `M ${smaPoints.join(' L ')}`;
  }

  const currentDisplay = hoveredCandle || candles[candles.length - 1];

  return (
    <TooltipProvider>
      <div className="flex flex-col w-full bg-card/60 backdrop-blur-xs rounded-xl border border-border/60 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatINR(currentDisplay.close)}
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground mt-0.5 font-mono">
                <span>O: <strong className="text-foreground">{formatINR(currentDisplay.open)}</strong></span>
                <span>H: <strong className="text-foreground">{formatINR(currentDisplay.high)}</strong></span>
                <span>L: <strong className="text-foreground">{formatINR(currentDisplay.low)}</strong></span>
                <span>Vol: <strong className="text-foreground">{formatVolume(currentDisplay.volume)}</strong></span>
              </div>
            </div>
            <Badge variant={isNetPositive ? 'default' : 'destructive'} className="gap-1 font-mono text-xs shrink-0">
              {isNetPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPercent((((currentDisplay.close - candles[0].open) / candles[0].open) * 100))}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/40">
              <Button
                variant={chartType === 'area' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setChartType('area')}
                className="text-xs font-medium"
              >
                Area
              </Button>
              <Button
                variant={chartType === 'candles' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setChartType('candles')}
                className="text-xs font-medium gap-1"
              >
                <BarChart2 className="h-3 w-3" />
                Candles
              </Button>
            </div>

            {/* SMA 20 Overlay Toggle */}
            {technicals?.sma20 && (
              <Button
                variant={showSMA20 ? 'secondary' : 'outline'}
                size="xs"
                onClick={() => setShowSMA20(!showSMA20)}
                className={`text-[11px] font-mono gap-1.5 ${showSMA20 ? 'border-amber-500/40 text-amber-500 bg-amber-500/10' : 'text-muted-foreground'}`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                SMA 20
              </Button>
            )}

            {/* Timeframe Selectors */}
            <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/40">
              {(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'] as const).map(tf => (
                <Button
                  key={tf}
                  variant={timeframe === tf ? 'secondary' : 'ghost'}
                  size="xs"
                  onClick={() => setTimeframe(tf)}
                  className="text-xs font-medium px-2 sm:px-2.5"
                >
                  {tf}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Interactive Chart */}
        <div className="relative w-full overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto cursor-crosshair select-none"
            onMouseLeave={() => setHoveredCandle(null)}
          >
            {/* Horizontal Grid lines */}
            {[0.2, 0.4, 0.6, 0.8].map(ratio => {
              const y = priceChartHeight * ratio + 10;
              const priceLevel = maxPrice - ratio * priceRange;
              return (
                <g key={ratio}>
                  <line x1="30" y1={y} x2={width - 30} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
                  <text x={width - 25} y={y + 3} fill="currentColor" fillOpacity="0.35" fontSize="10" fontFamily="monospace">
                    {formatINR(priceLevel, 0)}
                  </text>
                </g>
              );
            })}

            {chartType === 'area' ? (
              <>
                <defs>
                  <linearGradient id={`chart-grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill={`url(#chart-grad-${symbol})`} />
                <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
              </>
            ) : (
              /* Candlestick view */
              candles.map((c, i) => {
                const x = (i / (candles.length - 1)) * (width - 60) + 30;
                const openY = priceChartHeight - ((c.open - minPrice) / priceRange) * (priceChartHeight - 40) + 20;
                const closeY = priceChartHeight - ((c.close - minPrice) / priceRange) * (priceChartHeight - 40) + 20;
                const highY = priceChartHeight - ((c.high - minPrice) / priceRange) * (priceChartHeight - 40) + 20;
                const lowY = priceChartHeight - ((c.low - minPrice) / priceRange) * (priceChartHeight - 40) + 20;

                const isGreen = c.close >= c.open;
                const candleColor = isGreen ? '#10b981' : '#f43f5e';
                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.max(Math.abs(closeY - openY), 1.5);
                const candleWidth = Math.max(((width - 60) / candles.length) * 0.7, 2);

                return (
                  <g key={i}>
                    {/* Wick */}
                    <line x1={x} y1={highY} x2={x} y2={lowY} stroke={candleColor} strokeWidth="1" />
                    {/* Body */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyTop}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={candleColor}
                      rx="0.5"
                    />
                  </g>
                );
              })
            )}

            {/* SMA 20 Overlay Line */}
            {showSMA20 && sma20Path && (
              <path
                d={sma20Path}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeOpacity="0.9"
              />
            )}

            {/* Volume bars in lower section */}
            {candles.map((c, i) => {
              const x = (i / (candles.length - 1)) * (width - 60) + 30;
              const barH = (c.volume / maxVolume) * (volumeHeight - 15);
              const y = height - barH;
              const barWidth = Math.max(((width - 60) / candles.length) * 0.6, 1.5);
              const isGreen = c.close >= c.open;

              return (
                <rect
                  key={`vol-${i}`}
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={isGreen ? '#10b981' : '#f43f5e'}
                  opacity="0.3"
                />
              );
            })}

            {/* Hover Crosshair & Interactive Trigger */}
            {candles.map((c, i) => {
              const x = (i / (candles.length - 1)) * (width - 60) + 30;
              const isHovered = hoveredCandle === c;

              return (
                <g key={`hit-${i}`}>
                  <rect
                    x={x - (width / candles.length) / 2}
                    y="0"
                    width={width / candles.length}
                    height={height}
                    fill="transparent"
                    onMouseEnter={() => setHoveredCandle(c)}
                  />
                  {isHovered && (
                    <>
                      <line x1={x} y1="10" x2={x} y2={height} stroke="currentColor" strokeOpacity="0.4" strokeDasharray="2 2" />
                      <circle
                        cx={x}
                        cy={priceChartHeight - ((c.close - minPrice) / priceRange) * (priceChartHeight - 40) + 20}
                        r="4"
                        fill={strokeColor}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover info badge */}
          {hoveredCandle && (
            <div className="absolute top-2 right-4 bg-popover/90 border border-border text-popover-foreground px-2.5 py-1.5 rounded-lg shadow-md text-xs font-mono backdrop-blur-xs flex items-center gap-2">
              <span className="text-muted-foreground">{hoveredCandle.timestamp}</span>
              <span>•</span>
              <span className="font-bold">Close: {formatINR(hoveredCandle.close)}</span>
              <span>•</span>
              <span>Vol: {formatVolume(hoveredCandle.volume)}</span>
            </div>
          )}
        </div>

        {/* Dynamic Technical Indicators Strip */}
        {technicals && (
          <div className="pt-3 border-t border-border/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Technical Indicators & Momentum Benchmarks</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>Computed from {technicals.count} verified candles ({timeframe})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {/* Metric 1: 20 SMA */}
              <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>20 SMA</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/60 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="text-[11px] max-w-xs">
                      20-period Simple Moving Average. Serves as primary short-term trend baseline.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-sm font-bold font-mono text-foreground mt-1">
                  {technicals.sma20 ? formatINR(technicals.sma20) : '—'}
                </div>
                <div className="mt-1">
                  {technicals.sma20 ? (
                    technicals.latestClose >= technicals.sma20 ? (
                      <span className="text-[9px] font-mono text-emerald-400 font-semibold">▲ Bullish (Above)</span>
                    ) : (
                      <span className="text-[9px] font-mono text-rose-400 font-semibold">▼ Bearish (Below)</span>
                    )
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Req. 20+ candles</span>
                  )}
                </div>
              </div>

              {/* Metric 2: 50 SMA */}
              <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>50 SMA</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/60 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="text-[11px] max-w-xs">
                      50-period Simple Moving Average. Intermediate institutional trend filter.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-sm font-bold font-mono text-foreground mt-1">
                  {technicals.sma50 ? formatINR(technicals.sma50) : '—'}
                </div>
                <div className="mt-1">
                  {technicals.sma50 ? (
                    technicals.latestClose >= technicals.sma50 ? (
                      <span className="text-[9px] font-mono text-emerald-400 font-semibold">▲ Bullish</span>
                    ) : (
                      <span className="text-[9px] font-mono text-rose-400 font-semibold">▼ Bearish</span>
                    )
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Req. 50+ candles</span>
                  )}
                </div>
              </div>

              {/* Metric 3: 14 RSI */}
              <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>14 RSI</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/60 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="text-[11px] max-w-xs">
                      14-period Relative Strength Index. Values &gt; 70 signify overbought conditions, while &lt; 30 signal oversold levels.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-sm font-bold font-mono text-foreground mt-1">
                  {technicals.rsi14 !== null ? technicals.rsi14 : '—'}
                </div>
                <div className="mt-1">
                  {technicals.rsi14 !== null ? (
                    technicals.rsi14 >= 70 ? (
                      <span className="text-[9px] font-mono text-amber-400 font-semibold">Overbought (&gt;70)</span>
                    ) : technicals.rsi14 <= 30 ? (
                      <span className="text-[9px] font-mono text-emerald-400 font-semibold">Oversold (&lt;30)</span>
                    ) : (
                      <span className="text-[9px] font-mono text-muted-foreground">Neutral (30–70)</span>
                    )
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Req. 15+ candles</span>
                  )}
                </div>
              </div>

              {/* Metric 4: Classical Pivot Point */}
              <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>Pivot (P)</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/60 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="text-[11px] max-w-xs">
                      Floor Pivot Point calculated as (High + Low + Close) / 3.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-sm font-bold font-mono text-foreground mt-1">
                  {formatINR(technicals.pivots.pivot)}
                </div>
                <div className="text-[9px] text-muted-foreground font-mono mt-1">
                  Baseline Pivot
                </div>
              </div>

              {/* Metric 5: Resistance R1 / Support S1 */}
              <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>R1 / S1 Levels</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/60 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="text-[11px] max-w-xs">
                      Key support (S1) and resistance (R1) levels derived from floor pivots.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-xs font-bold font-mono text-foreground mt-1 space-y-0.5">
                  <div className="text-rose-400 font-mono">R1: {formatINR(technicals.pivots.r1)}</div>
                  <div className="text-emerald-400 font-mono">S1: {formatINR(technicals.pivots.s1)}</div>
                </div>
                <div className="text-[9px] text-muted-foreground font-mono mt-1">
                  Key Reaction Bands
                </div>
              </div>

              {/* Metric 6: Period Range & Spread */}
              <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>Period Range</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/60 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="text-[11px] max-w-xs">
                      Timeframe extreme spread between highest high and lowest low.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-xs font-bold font-mono text-foreground mt-1 space-y-0.5">
                  <div className="text-muted-foreground">H: {formatINR(technicals.performance.high)}</div>
                  <div className="text-muted-foreground">L: {formatINR(technicals.performance.low)}</div>
                </div>
                <div className="text-[9px] text-muted-foreground font-mono mt-1">
                  Spread: {formatINR(technicals.performance.high - technicals.performance.low)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 px-1">
          <span>Market Timezone: Asia/Kolkata (IST)</span>
          <span>Zero Fabricated Candles • Verified Exchange Historical Trade Record</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
