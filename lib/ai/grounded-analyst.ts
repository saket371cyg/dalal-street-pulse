import { GoogleGenAI } from '@google/genai';
import {
  getStockQuote,
  getStockFundamentals,
  getHistoricalOHLCV,
  getCorporateActionsForStock,
  fetchLiveIndianFinancialNews,
} from '@/lib/market-data';
import {
  calculatePercentageChange,
  calculatePeriodReturn,
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculatePivotPoints,
  calculateVWAP,
  calculate52WeekMetrics,
} from '@/lib/utils/financial-math';
import { evaluateDataQuality, DataQualityReport } from './confidence-gate';
import { retrieveRelevantChunks } from './rag';
import { formatINR, formatCrores, formatPercent, getMarketSessionStatus } from '@/lib/utils/indian-market';
import { StockQuote, CompanyFundamentals, OHLCVCandle, CorporateAction, FinancialNewsItem, RAGAskResponse } from '@/types';

const apiKey = process.env.AI_API_KEY || '';
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface StockQuantitativeBundle {
  symbol: string;
  quote: StockQuote | null;
  fundamentals: CompanyFundamentals | null;
  candles: OHLCVCandle[];
  technicals: {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    rsi14: { rsi: number; condition: string } | null;
    macd: { macdLine: number; signalLine: number; histogram: number; trend: string } | null;
    pivots: { pivot: number; r1: number; r2: number; s1: number; s2: number } | null;
    vwap: number | null;
    range52Week: { percentFromHigh: number; percentFromLow: number; rangePositionPercent: number } | null;
  };
  actions: CorporateAction[];
  news: FinancialNewsItem[];
  quality: DataQualityReport;
}

/**
 * Deterministically aggregates quotes, fundamentals, OHLCV candles, technical indicators,
 * corporate actions, and news for a security.
 */
export async function getStockQuantitativeBundle(symbol: string): Promise<StockQuantitativeBundle> {
  const [quote, fundamentals, candles, actions, news] = await Promise.all([
    getStockQuote(symbol),
    getStockFundamentals(symbol),
    getHistoricalOHLCV(symbol, '1Y'),
    getCorporateActionsForStock(symbol),
    fetchLiveIndianFinancialNews({ symbol, limit: 5 }),
  ]);

  const closePrices = (candles || []).map(c => c.close).filter(p => p > 0);
  const highPrices = (candles || []).map(c => c.high);
  const lowPrices = (candles || []).map(c => c.low);

  const lastClose = quote?.currentPrice || (closePrices.length > 0 ? closePrices[closePrices.length - 1] : 0);
  const lastHigh = quote?.high || (highPrices.length > 0 ? highPrices[highPrices.length - 1] : lastClose);
  const lastLow = quote?.low || (lowPrices.length > 0 ? lowPrices[lowPrices.length - 1] : lastClose);

  // 1. Technical calculations
  const sma20Res = calculateSMA(closePrices, 20);
  const sma50Res = calculateSMA(closePrices, 50);
  const sma200Res = calculateSMA(closePrices, 200);
  const rsiRes = calculateRSI(closePrices, 14);
  const macdRes = calculateMACD(closePrices, 12, 26, 9);
  const pivotsRes = calculatePivotPoints(lastHigh, lastLow, lastClose);
  const vwapRes = calculateVWAP(candles || []);
  const range52Res = quote ? calculate52WeekMetrics(quote.currentPrice, quote.week52High, quote.week52Low) : { valid: false, value: null };

  const technicals = {
    sma20: sma20Res.valid ? sma20Res.value : null,
    sma50: sma50Res.valid ? sma50Res.value : null,
    sma200: sma200Res.valid ? sma200Res.value : null,
    rsi14: rsiRes.valid ? rsiRes.value : null,
    macd: macdRes.valid ? macdRes.value : null,
    pivots: pivotsRes.valid ? pivotsRes.value : null,
    vwap: vwapRes.valid ? vwapRes.value : null,
    range52Week: range52Res.valid ? range52Res.value : null,
  };

  const quality = evaluateDataQuality(quote, fundamentals, candles || []);

  return {
    symbol: symbol.toUpperCase(),
    quote,
    fundamentals,
    candles: candles || [],
    technicals,
    actions: actions || [],
    news: news || [],
    quality,
  };
}

/**
 * Deterministically constructs a structured 12-section research report
 * for an Indian equity in offline or fallback mode
 */
export function buildDeterministicStockReport(
  bundle: StockQuantitativeBundle,
  question: string
): string {
  const { symbol, quote, fundamentals, technicals, quality, actions, news } = bundle;
  const session = getMarketSessionStatus();

  if (!quote) {
    return `### Stock Analysis: ${symbol}\n\n**Data Quality:** ${quality.scoreExplanation}\n\nUnable to retrieve valid quote or trade data for **${symbol}** from active NSE/BSE feeds. Please verify the exchange symbol or check market connectivity.`;
  }

  const changeText = `${formatINR(quote.change)} (${formatPercent(quote.percentChange)})`;
  const peVsIndustry = fundamentals
    ? `${fundamentals.peRatio.toFixed(1)}x (Sector Median: ${fundamentals.industryPE.toFixed(1)}x)`
    : 'N/A';

  let trendAssessment = 'Sideways / Consolidation';
  if (technicals.sma50 && quote.currentPrice > technicals.sma50 && (technicals.rsi14?.rsi || 50) > 55) {
    trendAssessment = 'Bullish Momentum (Trading above 50-day moving average)';
  } else if (technicals.sma50 && quote.currentPrice < technicals.sma50 && (technicals.rsi14?.rsi || 50) < 45) {
    trendAssessment = 'Bearish Bias (Trading below 50-day moving average)';
  }

  const sections: string[] = [
    `## Comprehensive Stock Analysis: ${quote.companyName} (${quote.exchange}: ${quote.symbol})`,
    `> **Data Quality & Confidence Gate:** \`${quality.score} CONFIDENCE\` • ${quality.scoreExplanation}`,
    `> **Market Session:** ${session.statusLabel} • **Freshness:** ${quote.freshness.toUpperCase()} • **Timestamp:** ${quote.lastUpdated}`,
    '',
    `### 1. Market Snapshot`,
    `- **Current Market Price (CMP):** ${formatINR(quote.currentPrice)} [${changeText}]`,
    `- **Session Intraday Range:** Low ${formatINR(quote.low)} — High ${formatINR(quote.high)} (Open: ${formatINR(quote.open)}, Prev Close: ${formatINR(quote.previousClose)})`,
    `- **Trading Volume:** ${quote.volume.toLocaleString('en-IN')} shares`,
    `- **52-Week Range:** Low ${formatINR(quote.week52Low)} — High ${formatINR(quote.week52High)} (${technicals.range52Week ? `${technicals.range52Week.rangePositionPercent.toFixed(1)}% of annual corridor` : 'N/A'})`,
    fundamentals ? `- **Market Capitalization:** ${formatCrores(fundamentals.marketCapCrores)}` : '',
    '',
    `### 2. Technical Structure & Observed Indicators (Timeframe: Daily)`,
    `- **Trend Classification:** **${trendAssessment}**`,
    `- **Moving Averages:**`,
    `  - 20-Day SMA: ${technicals.sma20 ? formatINR(technicals.sma20) : 'Insufficient history'}`,
    `  - 50-Day SMA: ${technicals.sma50 ? formatINR(technicals.sma50) : 'Insufficient history'}`,
    `  - 200-Day SMA: ${technicals.sma200 ? formatINR(technicals.sma200) : 'Insufficient history (< 200 candles)'}`,
    `- **Momentum Oscillators:**`,
    `  - RSI (14): ${technicals.rsi14 ? `${technicals.rsi14.rsi} (${technicals.rsi14.condition})` : 'Insufficient candles'}`,
    `  - MACD (12, 26, 9): ${technicals.macd ? `Line: ${technicals.macd.macdLine}, Signal: ${technicals.macd.signalLine}, Histogram: ${technicals.macd.histogram} (${technicals.macd.trend})` : 'Insufficient history'}`,
    `- **Classic Floor Pivot Levels:**`,
    technicals.pivots
      ? `  - Pivot Point (P): ${formatINR(technicals.pivots.pivot)} | Support S1: ${formatINR(technicals.pivots.s1)}, S2: ${formatINR(technicals.pivots.s2)} | Resistance R1: ${formatINR(technicals.pivots.r1)}, R2: ${formatINR(technicals.pivots.r2)}`
      : '  - Pivot calculation requires complete high, low, close readings.',
    technicals.vwap ? `- **Historical VWAP:** ${formatINR(technicals.vwap)}` : '',
    '',
    `### 3. Fundamental Health & Valuation Assessment`,
    fundamentals
      ? [
          `- **Valuation Multiple:** Trailing P/E is **${peVsIndustry}**. Price-to-Book (P/B): ${fundamentals.pbRatio ? `${fundamentals.pbRatio.toFixed(1)}x` : 'N/A'}.`,
          `- **Return on Capital:** ROCE is **${fundamentals.roce.toFixed(1)}%** and ROE is **${fundamentals.roe.toFixed(1)}%**.`,
          `- **Balance Sheet Leverage:** Debt-to-Equity stands at **${fundamentals.debtToEquity.toFixed(2)}** (${fundamentals.debtToEquity < 0.5 ? 'Conservative / Low Leverage' : fundamentals.debtToEquity > 1.0 ? 'Elevated Debt' : 'Moderate Leverage'}).`,
          `- **Institutional Conviction:** Promoters hold ${fundamentals.promoterHoldingPercent.toFixed(1)}% (Public: ${fundamentals.publicHoldingPercent.toFixed(1)}%), FIIs own ${fundamentals.fiiHoldingPercent.toFixed(1)}%, and DIIs own ${fundamentals.diiHoldingPercent.toFixed(1)}%.`,
          fundamentals.quarterlyResults && fundamentals.quarterlyResults.length > 0
            ? `- **Latest Reported Quarter (${fundamentals.quarterlyResults[0].period}):** Revenue of ₹${fundamentals.quarterlyResults[0].revenueCrores.toLocaleString('en-IN')} Cr, Operating Profit Margin of ${fundamentals.quarterlyResults[0].operatingMarginPercent.toFixed(1)}%, and Net PAT of ₹${fundamentals.quarterlyResults[0].profitCrores.toLocaleString('en-IN')} Cr.`
            : '',
        ].filter(Boolean).join('\n')
      : '- Audited company fundamental metrics are currently unavailable from active feed.',
    '',
    `### 4. Verified Catalysts & Material Events`,
    actions.length > 0
      ? `- **Corporate Actions:** ${actions.slice(0, 2).map(a => `${a.actionType} (${a.details}) on Ex-Date ${a.exDate}`).join(' • ')}`
      : '- No pending dividend, split, or bonus corporate actions recorded.',
    news.length > 0
      ? news.slice(0, 3).map(n => `- **${n.publishedAt.split('T')[0]}:** ${n.title} (${n.source})`).join('\n')
      : '- No recent regulatory announcements logged in the past session.',
    '',
    `### 5. Scenario Analysis & Forward Invalidation`,
    `- **Bull Case Scenario:** Sustained daily closes above resistance ${technicals.pivots ? formatINR(technicals.pivots.r1) : 'R1'} supported by expanding delivery volumes and quarterly PAT compounding.`,
    `- **Bear Case Scenario:** Breakdown below major support ${technicals.pivots ? formatINR(technicals.pivots.s1) : 'S1'} accompanied by contraction in operating margins or institutional selling.`,
    `- **Key Risks:** Sensitivity to RBI monetary stance, sector input raw material cost inflation, and distance from 52-week peak.`,
    `- **Invalidation Trigger:** A daily close violating key moving average supports alters the intermediate directional bias.`,
    '',
    `### 6. Sources, Freshness & Disclaimers`,
    `- **Exchange Disclosures:** National Stock Exchange of India (NSE) / BSE Ltd Official Trade Records`,
    `- **Audited Statements:** Reported Financial Statements & SEBI Disclosures`,
    `> **Regulatory Disclaimer:** This quantitative research summary is strictly informational and educational. It does not constitute investment advice or a solicitation to buy/sell equities. Capital markets involve substantial risk.`,
  ];

  return sections.filter(s => s !== '').join('\n');
}

/**
 * Deterministically constructs a comparative analysis between two Indian equities
 */
export function buildDeterministicComparisonReport(
  bundleA: StockQuantitativeBundle,
  bundleB: StockQuantitativeBundle,
  question: string
): string {
  const qA = bundleA.quote;
  const qB = bundleB.quote;
  const fA = bundleA.fundamentals;
  const fB = bundleB.fundamentals;

  if (!qA || !qB) {
    return `### Stock Comparison: ${bundleA.symbol} vs ${bundleB.symbol}\n\nUnable to retrieve valid quote observations for both securities simultaneously.`;
  }

  const sections: string[] = [
    `## Comparative Equity Analysis: ${bundleA.symbol} vs ${bundleB.symbol}`,
    `> **Comparison Scope:** ${qA.companyName} (${qA.exchange}: ${qA.symbol}) versus ${qB.companyName} (${qB.exchange}: ${qB.symbol})`,
    '',
    `### 1. Side-by-Side Financial & Valuation Metrics`,
    `| Metric | ${bundleA.symbol} | ${bundleB.symbol} | Observation |`,
    `| :--- | :--- | :--- | :--- |`,
    `| **Current Market Price (CMP)** | ${formatINR(qA.currentPrice)} | ${formatINR(qB.currentPrice)} | ${qA.percentChange >= 0 ? `+${qA.percentChange}%` : `${qA.percentChange}%`} vs ${qB.percentChange >= 0 ? `+${qB.percentChange}%` : `${qB.percentChange}%`} on day |`,
    `| **Market Capitalization** | ${fA ? formatCrores(fA.marketCapCrores) : 'N/A'} | ${fB ? formatCrores(fB.marketCapCrores) : 'N/A'} | ${fA && fB ? (fA.marketCapCrores > fB.marketCapCrores ? `${bundleA.symbol} has larger scale` : `${bundleB.symbol} has larger scale`) : 'N/A'} |`,
    `| **P/E Ratio (Trailing)** | ${fA ? `${fA.peRatio.toFixed(1)}x` : 'N/A'} | ${fB ? `${fB.peRatio.toFixed(1)}x` : 'N/A'} | Sector Medians: ${fA ? `${fA.industryPE.toFixed(1)}x` : '-'} / ${fB ? `${fB.industryPE.toFixed(1)}x` : '-'} |`,
    `| **Return on Capital (ROCE)** | ${fA ? `${fA.roce.toFixed(1)}%` : 'N/A'} | ${fB ? `${fB.roce.toFixed(1)}%` : 'N/A'} | Capital allocation efficiency test |`,
    `| **Return on Equity (ROE)** | ${fA ? `${fA.roe.toFixed(1)}%` : 'N/A'} | ${fB ? `${fB.roe.toFixed(1)}%` : 'N/A'} | Net profitability on net worth |`,
    `| **Debt-to-Equity Ratio** | ${fA ? fA.debtToEquity.toFixed(2) : 'N/A'} | ${fB ? fB.debtToEquity.toFixed(2) : 'N/A'} | Financial leverage comparison |`,
    `| **RSI (14 Daily)** | ${bundleA.technicals.rsi14 ? `${bundleA.technicals.rsi14.rsi} (${bundleA.technicals.rsi14.condition})` : 'N/A'} | ${bundleB.technicals.rsi14 ? `${bundleB.technicals.rsi14.rsi} (${bundleB.technicals.rsi14.condition})` : 'N/A'} | Short-term momentum oscillator |`,
    `| **Distance from 52W High** | ${bundleA.technicals.range52Week ? `${bundleA.technicals.range52Week.percentFromHigh.toFixed(1)}%` : 'N/A'} | ${bundleB.technicals.range52Week ? `${bundleB.technicals.range52Week.percentFromHigh.toFixed(1)}%` : 'N/A'} | Proximity to annual highs |`,
    '',
    `### 2. Qualitative Trade-offs & Capital Allocation`,
    fA && fB
      ? `- **Valuation Multiple vs Quality:** ${fA.peRatio < fB.peRatio ? `${bundleA.symbol} trades at a lower P/E multiple (${fA.peRatio.toFixed(1)}x vs ${fB.peRatio.toFixed(1)}x)` : `${bundleB.symbol} trades at a discount multiple (${fB.peRatio.toFixed(1)}x vs ${fA.peRatio.toFixed(1)}x)`}. Examine whether the multiple gap is justified by superior ROCE (${fA.roce.toFixed(1)}% vs ${fB.roce.toFixed(1)}%).\n` +
        `- **Balance Sheet Risk Profile:** ${fA.debtToEquity <= fB.debtToEquity ? `${bundleA.symbol} maintains lower financial leverage (D/E ${fA.debtToEquity.toFixed(2)})` : `${bundleB.symbol} carries a cleaner leverage profile (D/E ${fB.debtToEquity.toFixed(2)})`}.\n` +
        `- **Accounting Period Synchronicity:** Note that metrics compare the latest reported audited periods on file (${fA.quarterlyResults[0]?.period || 'Q2'} vs ${fB.quarterlyResults[0]?.period || 'Q2'}).`
      : '- Full audited statements could not be cross-tabulated.',
    '',
    `### 3. Conclusion & Invalidation Conditions`,
    `- Neither company is unilaterally "superior" solely due to a single multiple. An investor prioritizing capital compounding with high cash conversion may weigh ROCE higher, whereas a value-oriented investor may look for P/E discount relative to sector medians.`,
    `- **What to Monitor:** Upcoming quarterly earnings announcements, volume breakouts above daily 50-day moving averages, and sector institutional order flow.`,
    '',
    `> **Data Freshness:** ${qA.symbol} (${qA.freshness.toUpperCase()} • ${qA.lastUpdated}) | ${qB.symbol} (${qB.freshness.toUpperCase()} • ${qB.lastUpdated})`,
    `> **Regulatory Disclaimer:** This comparison is deterministic, informational, and educational. It is not investment advice.`,
  ];

  return sections.join('\n');
}

/**
 * Main High-Accuracy Grounded Stock Market Analyst Pipeline
 */
export async function runGroundedAnalystPipeline(
  question: string,
  explicitSymbol?: string
): Promise<RAGAskResponse> {
  const startTime = Date.now();

  // Step 1 & 2: Resolve user intent & securities
  const { resolveSecurityContext } = await import('./security-resolver');
  const queryContext = resolveSecurityContext(question, explicitSymbol);

  // Step 3 & 4: Retrieve data & perform deterministic calculations
  if (queryContext.intent === 'COMPARISON' && queryContext.primarySymbol && queryContext.secondarySymbol) {
    const [bundleA, bundleB] = await Promise.all([
      getStockQuantitativeBundle(queryContext.primarySymbol),
      getStockQuantitativeBundle(queryContext.secondarySymbol),
    ]);

    const fallbackReport = buildDeterministicComparisonReport(bundleA, bundleB, question);

    if (genAI && apiKey) {
      const modelCandidates = [process.env.AI_MODEL || 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
      for (const modelName of modelCandidates) {
        try {
          const prompt = `You are a Senior Indian Equity Research Analyst for Dalal Street Pulse.
The user wants to compare two Indian listed companies: ${bundleA.symbol} and ${bundleB.symbol}.
Use ONLY the verified quantitative numbers and observations provided below. Do not invent any numbers, prices, or ratings.

VERIFIED COMPARISON METRICS:
${fallbackReport}

User Question: ${question}

Provide a structured, unbiased comparative equity analysis. Cite specific numbers. Explain the trade-offs clearly without declaring a simplistic winner.`;

          const res = await genAI.models.generateContent({
            model: modelName,
            contents: prompt,
          });

          if (res.text) {
            return {
              answer: res.text,
              relatedMetrics: ['Comparative P/E', 'ROCE Spread', 'Debt-to-Equity', 'RSI 14'],
              groundedSources: [
                `NSE/BSE Reported Data (${bundleA.symbol})`,
                `NSE/BSE Reported Data (${bundleB.symbol})`,
                'Audited Quarterly Disclosures',
              ],
              modelUsed: modelName,
              executionTimeMs: Date.now() - startTime,
            };
          }
        } catch {
          // try next model or fallback
        }
      }
    }

    return {
      answer: fallbackReport,
      relatedMetrics: ['Comparative P/E', 'ROCE Spread', 'Debt-to-Equity', 'RSI 14'],
      groundedSources: [
        `NSE/BSE Reported Data (${bundleA.symbol})`,
        `NSE/BSE Reported Data (${bundleB.symbol})`,
        'Audited Quarterly Disclosures',
      ],
      modelUsed: 'Quantitative Comparison Engine (Deterministic)',
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Single Stock Analysis
  if (queryContext.primarySymbol) {
    const bundle = await getStockQuantitativeBundle(queryContext.primarySymbol);
    const ragChunks = await retrieveRelevantChunks(question, { symbol: queryContext.primarySymbol, topK: 3 });
    const deterministicReport = buildDeterministicStockReport(bundle, question);

    if (genAI && apiKey) {
      const modelCandidates = [process.env.AI_MODEL || 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
      for (const modelName of modelCandidates) {
        try {
          const prompt = `You are a Senior Indian Equity Research Analyst for Dalal Street Pulse (covering NSE and BSE).
You must analyze the user's question using ONLY the verified facts and deterministically calculated metrics provided below.
Rules:
1. NEVER hallucinate stock prices, historical returns, or indicators. All indicators (SMA, RSI, MACD, Pivots, VWAP) have already been deterministically calculated in the ground truth. Use them exactly as given.
2. If an indicator is stated as 'Insufficient history', acknowledge the limitation explicitly.
3. Include Bull case, Bear case, and Invalidation conditions.
4. Clearly state the Data Quality Confidence (${bundle.quality.score}) and market session status.
5. End with the informational disclaimer.

VERIFIED GROUND TRUTH DATA:
${deterministicReport}

ADDITIONAL RETRIEVED DISCLOSURES & NEWS:
${ragChunks.map((c, i) => `[Source ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n')}

User Question: ${question}`;

          const res = await genAI.models.generateContent({
            model: modelName,
            contents: prompt,
          });

          if (res.text) {
            return {
              answer: res.text,
              relatedMetrics: ['Price & Volume', 'SMA 20/50', 'RSI 14', 'P/E vs Industry', 'ROCE'],
              groundedSources: [
                `NSE/BSE Trade Records (${bundle.symbol})`,
                ...bundle.quality.limitations,
                ...ragChunks.map(c => c.title),
              ],
              chunksUsed: ragChunks.map(c => ({
                title: c.title,
                category: c.category,
                symbol: c.symbol,
                snippet: c.content.slice(0, 160) + '...',
                sourceUrl: c.sourceUrl,
                publishedAt: c.publishedAt,
                relevanceScore: Math.round((c.score || 0) * 100) / 100,
              })),
              modelUsed: modelName,
              executionTimeMs: Date.now() - startTime,
            };
          }
        } catch {
          // try next model or fallback
        }
      }
    }

    return {
      answer: deterministicReport,
      relatedMetrics: ['Price & Volume', 'SMA 20/50', 'RSI 14', 'P/E vs Industry', 'ROCE'],
      groundedSources: [
        `NSE/BSE Trade Records (${bundle.symbol})`,
        ...bundle.quality.limitations,
        ...ragChunks.map(c => c.title),
      ],
      chunksUsed: ragChunks.map(c => ({
        title: c.title,
        category: c.category,
        symbol: c.symbol,
        snippet: c.content.slice(0, 160) + '...',
        sourceUrl: c.sourceUrl,
        publishedAt: c.publishedAt,
        relevanceScore: Math.round((c.score || 0) * 100) / 100,
      })),
      modelUsed: 'Grounded Quantitative Engine (Deterministic High-Accuracy)',
      executionTimeMs: Date.now() - startTime,
    };
  }

  // General Market / Macro Query (No specific stock identified)
  const { askRAGAnalyst } = await import('./rag');
  return await askRAGAnalyst(question);
}
