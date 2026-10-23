import { OHLCVCandle } from '@/types';

/**
 * Dalal Street Pulse — Deterministic Quantitative Financial Calculations Engine
 * Centralizes all mathematical formulas, technical indicators, and valuation metrics.
 */

export interface CalculationResult<T> {
  value: T;
  valid: boolean;
  reason?: string;
}

/**
 * 1. Percentage price change
 * Formula: ((Current Price - Previous Close) / Previous Close) * 100
 */
export function calculatePercentageChange(
  currentPrice: number,
  previousClose: number
): CalculationResult<number> {
  if (previousClose === 0 || isNaN(previousClose) || isNaN(currentPrice) || previousClose == null) {
    return {
      value: 0,
      valid: false,
      reason: 'Invalid or zero previous close price denominator',
    };
  }

  const change = currentPrice - previousClose;
  const pct = (change / previousClose) * 100;

  return {
    value: Math.round(pct * 100) / 100,
    valid: true,
  };
}

/**
 * 2. Return over a selected historical period
 * Formula: ((Ending Price / Starting Price) - 1) * 100
 */
export function calculatePeriodReturn(
  startingPrice: number,
  endingPrice: number
): CalculationResult<number> {
  if (startingPrice <= 0 || isNaN(startingPrice) || isNaN(endingPrice)) {
    return {
      value: 0,
      valid: false,
      reason: 'Starting price must be strictly greater than zero',
    };
  }

  const ret = ((endingPrice / startingPrice) - 1) * 100;
  return {
    value: Math.round(ret * 100) / 100,
    valid: true,
  };
}

/**
 * 3. Simple Moving Average (SMA)
 * Strict validation: Requires at least `period` data points. Never fabricates values from insufficient history.
 */
export function calculateSMA(
  prices: number[],
  period: number
): CalculationResult<number | null> {
  if (!prices || prices.length < period || period <= 0) {
    return {
      value: null,
      valid: false,
      reason: `Insufficient historical observations: required ${period}, but only received ${prices?.length || 0}`,
    };
  }

  const slice = prices.slice(prices.length - period);
  const sum = slice.reduce((acc, p) => acc + p, 0);
  const avg = sum / period;

  return {
    value: Math.round(avg * 100) / 100,
    valid: true,
  };
}

/**
 * 4. Exponential Moving Average (EMA)
 * Multiplier = 2 / (period + 1)
 */
export function calculateEMA(
  prices: number[],
  period: number
): CalculationResult<number | null> {
  if (!prices || prices.length < period || period <= 0) {
    return {
      value: null,
      valid: false,
      reason: `Insufficient historical observations for EMA: required at least ${period}, got ${prices?.length || 0}`,
    };
  }

  const k = 2 / (period + 1);
  // Start with SMA for first window
  const initialSMA = prices.slice(0, period).reduce((acc, p) => acc + p, 0) / period;
  let ema = initialSMA;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return {
    value: Math.round(ema * 100) / 100,
    valid: true,
  };
}

/**
 * 5. Relative Strength Index (RSI - 14 Period standard Wilder / SMA smoothing)
 * Guard: Requires at least period + 1 prices.
 */
export function calculateRSI(
  prices: number[],
  period: number = 14
): CalculationResult<{
  rsi: number;
  condition: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
} | null> {
  if (!prices || prices.length <= period) {
    return {
      value: null,
      valid: false,
      reason: `Insufficient price history for RSI ${period}: requires at least ${period + 1} observations, got ${prices?.length || 0}`,
    };
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  if (avgLoss === 0) {
    return {
      value: { rsi: 100, condition: 'OVERBOUGHT' },
      valid: true,
    };
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  const roundedRsi = Math.round(rsi * 100) / 100;

  let condition: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' = 'NEUTRAL';
  if (roundedRsi >= 70) condition = 'OVERBOUGHT';
  else if (roundedRsi <= 30) condition = 'OVERSOLD';

  return {
    value: { rsi: roundedRsi, condition },
    valid: true,
  };
}

/**
 * 6. Moving Average Convergence Divergence (MACD)
 * Standard: Fast=12, Slow=26, Signal=9
 */
export function calculateMACD(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): CalculationResult<{
  macdLine: number;
  signalLine: number;
  histogram: number;
  trend: 'BULLISH_CROSSOVER' | 'BEARISH_CROSSOVER' | 'BULLISH' | 'BEARISH';
} | null> {
  const minRequired = slowPeriod + signalPeriod;
  if (!prices || prices.length < minRequired) {
    return {
      value: null,
      valid: false,
      reason: `Insufficient data points for MACD (${fastPeriod}, ${slowPeriod}, ${signalPeriod}): requires at least ${minRequired}, got ${prices?.length || 0}`,
    };
  }

  const kFast = 2 / (fastPeriod + 1);
  const kSlow = 2 / (slowPeriod + 1);

  // Compute EMAs
  let emaFast = prices.slice(0, fastPeriod).reduce((acc, p) => acc + p, 0) / fastPeriod;
  for (let i = fastPeriod; i < prices.length; i++) {
    emaFast = prices[i] * kFast + emaFast * (1 - kFast);
  }

  let emaSlow = prices.slice(0, slowPeriod).reduce((acc, p) => acc + p, 0) / slowPeriod;
  const macdSeries: number[] = [];

  for (let i = slowPeriod; i < prices.length; i++) {
    const curFast = prices[i] * kFast + emaFast * (1 - kFast);
    emaSlow = prices[i] * kSlow + emaSlow * (1 - kSlow);
    macdSeries.push(curFast - emaSlow);
  }

  const macdLine = macdSeries[macdSeries.length - 1];
  const signalRes = calculateEMA(macdSeries, signalPeriod);

  if (!signalRes.valid || signalRes.value == null) {
    return {
      value: null,
      valid: false,
      reason: signalRes.reason,
    };
  }

  const signalLine = signalRes.value;
  const histogram = Math.round((macdLine - signalLine) * 100) / 100;

  let trend: 'BULLISH_CROSSOVER' | 'BEARISH_CROSSOVER' | 'BULLISH' | 'BEARISH' =
    macdLine >= signalLine ? 'BULLISH' : 'BEARISH';

  if (macdSeries.length >= 2) {
    const prevMacd = macdSeries[macdSeries.length - 2];
    const prevSignal = signalLine - (histogram * 0.1); // approx previous signal
    if (prevMacd < prevSignal && macdLine >= signalLine) trend = 'BULLISH_CROSSOVER';
    else if (prevMacd > prevSignal && macdLine <= signalLine) trend = 'BEARISH_CROSSOVER';
  }

  return {
    value: {
      macdLine: Math.round(macdLine * 100) / 100,
      signalLine,
      histogram,
      trend,
    },
    valid: true,
  };
}

/**
 * 7. Classic Floor Pivot Points (Support & Resistance)
 * P = (High + Low + Close) / 3
 * R1 = (2 * P) - Low, S1 = (2 * P) - High
 * R2 = P + (High - Low), S2 = P - (High - Low)
 */
export function calculatePivotPoints(
  high: number,
  low: number,
  close: number
): CalculationResult<{
  pivot: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
} | null> {
  if (high < low || high <= 0 || low <= 0 || close <= 0 || isNaN(high) || isNaN(low) || isNaN(close)) {
    return {
      value: null,
      valid: false,
      reason: 'Invalid high, low, or close prices for pivot calculation',
    };
  }

  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);

  return {
    value: {
      pivot: Math.round(pivot * 100) / 100,
      r1: Math.round(r1 * 100) / 100,
      r2: Math.round(r2 * 100) / 100,
      s1: Math.round(s1 * 100) / 100,
      s2: Math.round(s2 * 100) / 100,
    },
    valid: true,
  };
}

/**
 * 8. Volume-Weighted Average Price (VWAP)
 * VWAP = Sum(Typical Price * Volume) / Sum(Volume)
 */
export function calculateVWAP(
  candles: OHLCVCandle[]
): CalculationResult<number | null> {
  if (!candles || candles.length === 0) {
    return {
      value: null,
      valid: false,
      reason: 'No candle data available for VWAP calculation',
    };
  }

  let totalPV = 0;
  let totalVolume = 0;

  for (const c of candles) {
    if (c.volume > 0) {
      const typicalPrice = (c.high + c.low + c.close) / 3;
      totalPV += typicalPrice * c.volume;
      totalVolume += c.volume;
    }
  }

  if (totalVolume === 0) {
    return {
      value: null,
      valid: false,
      reason: 'Total volume is zero across historical observations',
    };
  }

  const vwap = totalPV / totalVolume;
  return {
    value: Math.round(vwap * 100) / 100,
    valid: true,
  };
}

/**
 * 9. 52-Week Range & Distance Assessment
 */
export function calculate52WeekMetrics(
  currentPrice: number,
  week52High: number,
  week52Low: number
): CalculationResult<{
  percentFromHigh: number;
  percentFromLow: number;
  rangePositionPercent: number;
} | null> {
  if (week52High <= 0 || week52Low <= 0 || week52High <= week52Low || currentPrice <= 0) {
    return {
      value: null,
      valid: false,
      reason: 'Invalid 52-week high or low range values',
    };
  }

  const pctFromHigh = ((currentPrice - week52High) / week52High) * 100;
  const pctFromLow = ((currentPrice - week52Low) / week52Low) * 100;
  const rangePosition = ((currentPrice - week52Low) / (week52High - week52Low)) * 100;

  return {
    value: {
      percentFromHigh: Math.round(pctFromHigh * 100) / 100,
      percentFromLow: Math.round(pctFromLow * 100) / 100,
      rangePositionPercent: Math.round(rangePosition * 100) / 100,
    },
    valid: true,
  };
}
