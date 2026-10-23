'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Building2,
  Globe,
  ShieldCheck,
  AlertTriangle,
  FileText,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  ArrowRight,
  Info,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  StockQuote,
  CompanyFundamentals,
  FinancialNewsItem,
  AIAnalysisResult,
  Instrument,
  InstrumentCoverageStatus,
  CorporateAction,
} from '@/types';
import { formatINR, formatPercent } from '@/lib/utils/indian-market';
import { InteractiveStockChart } from '@/components/charts/InteractiveStockChart';
import { FundamentalsGrid, ShareholdingChart } from '@/components/stocks/FundamentalsGrid';
import { MarketOverviewGrid } from '@/components/stocks/MarketOverviewGrid';
import { AddToWatchlistModal } from '@/components/watchlists/AddToWatchlistModal';
import { CreateAlertDialog } from '@/components/alerts/CreateAlertDialog';
import { useLiveQuotes } from '@/hooks/useLiveQuotes';
import { Suspense } from 'react';

function StockDetailContent() {
  const params = useParams();
  const rawSymbol = (params?.symbol as string) || 'RELIANCE';

  const [selectedExchange, setSelectedExchange] = useState<'NSE' | 'BSE' | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [coverage, setCoverage] = useState<InstrumentCoverageStatus | null>(null);
  const [fundamentals, setFundamentals] = useState<CompanyFundamentals | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [aliasRedirect, setAliasRedirect] = useState<{ searchedSymbol: string; currentSymbol: string; effectiveDate: string } | null>(null);
  const [sourceAttribution, setSourceAttribution] = useState<string>('NSE & BSE Unified Master');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Real-time live quotes hook via Server-Sent Events
  const symbolToStream = aliasRedirect?.currentSymbol || quote?.symbol || rawSymbol;
  const streamSymbols = useMemo(() => (symbolToStream ? [symbolToStream] : []), [symbolToStream]);
  const initialQuotesList = useMemo(
    () => (quote ? [quote] : undefined),
    [quote?.symbol, quote?.currentPrice, quote?.lastUpdated]
  );

  const { quotes: liveQuotes, getFlashClass } = useLiveQuotes({
    symbols: streamSymbols,
    initialQuotes: initialQuotesList,
    enabled: !!quote,
  });

  const displayQuote = (quote && liveQuotes[quote.symbol.toUpperCase()]) || quote;

  // Lazy loaded tabs states
  const [activeTab, setActiveTab] = useState('fundamentals');
  const [financialsLoaded, setFinancialsLoaded] = useState(false);
  const [financialsData, setFinancialsData] = useState<any>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  const [newsLoaded, setNewsLoaded] = useState(false);
  const [newsData, setNewsData] = useState<FinancialNewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);

  const [actionsLoaded, setActionsLoaded] = useState(false);
  const [actionsData, setActionsData] = useState<CorporateAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  // AI Assistant Question State
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    answer: string;
    groundedSources?: string[];
    chunksUsed?: any[];
    modelUsed?: string;
  } | null>(null);
  const [askingAi, setAskingAi] = useState(false);

  const handleExchangeChange = (newEx: 'NSE' | 'BSE') => {
    if (newEx === (displayQuote || quote)?.exchange) return;
    setSelectedExchange(newEx);
  };

  // Initial fetch: Header, quote, instrument metadata, and coverage
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = selectedExchange ? `?exchange=${selectedExchange}` : '';
    fetch(`/api/stocks/${rawSymbol}${query}`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.quote) setQuote(data.quote);
        if (data.instrument) setInstrument(data.instrument);
        if (data.coverage) setCoverage(data.coverage);
        if (data.fundamentals) setFundamentals(data.fundamentals);
        if (data.aiAnalysis) setAiAnalysis(data.aiAnalysis);
        if (data.aliasRedirect) setAliasRedirect(data.aliasRedirect);
        if (data.sourceAttribution) setSourceAttribution(data.sourceAttribution);
        if (data.lastRefreshedAt) setLastRefreshedAt(data.lastRefreshedAt);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.warn('[StockDetail] Quote fetch notice:', err?.message || err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [rawSymbol, selectedExchange]);

  // Lazy load tab data on demand
  useEffect(() => {
    const controller = new AbortController();
    const symbolToQuery = aliasRedirect?.currentSymbol || quote?.symbol || rawSymbol;

    if (activeTab === 'financials' && !financialsLoaded && !loadingFinancials) {
      setLoadingFinancials(true);
      fetch(`/api/stocks/${symbolToQuery}/financials`, { signal: controller.signal })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data) {
            setFinancialsData(data);
            setFinancialsLoaded(true);
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          console.warn('[Financials] fetch notice:', err?.message || err);
        })
        .finally(() => setLoadingFinancials(false));
    }

    if (activeTab === 'news' && !newsLoaded && !loadingNews) {
      setLoadingNews(true);
      fetch(`/api/stocks/${symbolToQuery}/news`, { signal: controller.signal })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.news) {
            setNewsData(data.news);
            setNewsLoaded(true);
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          console.warn('[News] fetch notice:', err?.message || err);
        })
        .finally(() => setLoadingNews(false));
    }

    if (activeTab === 'actions' && !actionsLoaded && !loadingActions) {
      setLoadingActions(true);
      fetch(`/api/stocks/${symbolToQuery}/actions`, { signal: controller.signal })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.actions) {
            setActionsData(data.actions);
            setActionsLoaded(true);
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          console.warn('[CorporateActions] fetch notice:', err?.message || err);
        })
        .finally(() => setLoadingActions(false));
    }

    return () => controller.abort();
  }, [activeTab, financialsLoaded, newsLoaded, actionsLoaded, quote?.symbol, rawSymbol, aliasRedirect]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setAskingAi(true);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, symbol: quote?.symbol || rawSymbol }),
      });
      const data = await res.json();
      if (data.answer) {
        setAiAnswer(data.answer);
        setAiResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAskingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-32 bg-muted rounded" />
              <div className="h-5 w-12 bg-muted/60 rounded" />
              <div className="h-5 w-16 bg-muted/50 rounded" />
            </div>
            <div className="h-4 w-56 bg-muted/60 rounded" />
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-1 text-right">
              <div className="h-8 w-32 bg-muted rounded ml-auto" />
              <div className="h-4 w-20 bg-muted/60 rounded ml-auto" />
            </div>
            <div className="h-9 w-24 bg-muted/40 rounded" />
          </div>
        </div>

        {/* Timestamp Strip Skeleton */}
        <div className="h-10 bg-muted/20 border border-border/40 rounded-lg" />

        {/* Chart Container Skeleton */}
        <div className="h-96 bg-muted/20 border border-border/40 rounded-xl" />

        {/* Market Overview Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-muted/20 border border-border/40 rounded-xl" />
          <div className="h-32 bg-muted/20 border border-border/40 rounded-xl" />
          <div className="h-32 bg-muted/20 border border-border/40 rounded-xl" />
          <div className="h-32 bg-muted/20 border border-border/40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-foreground">Stock Symbol Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1">We could not locate verified records for '{rawSymbol}' on NSE or BSE.</p>
        <Link href="/stocks" className="mt-4 inline-block">
          <Button size="sm">Back to Explore Stocks</Button>
        </Link>
      </div>
    );
  }

  const isPos = (displayQuote || quote).change >= 0;

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full transition-all">
      {/* Historical Symbol Change Notice */}
      {aliasRedirect && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-between text-xs text-foreground">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>Historical Symbol Notice:</strong> You searched for <code>{aliasRedirect.searchedSymbol}</code>, which changed/merged to <code>{aliasRedirect.currentSymbol}</code> on {aliasRedirect.effectiveDate}.
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-mono">
            Symbol Updated
          </Badge>
        </div>
      )}

      {/* Stock Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
              {(displayQuote || quote).symbol}
            </h1>
            {/* Exchange Switcher or Single Exchange Badge */}
            {instrument && (instrument.exchanges.length > 1 || (instrument.bseCode && instrument.exchanges.includes('NSE'))) ? (
              <div className="flex items-center rounded-md border border-border/60 p-0.5 bg-muted/40 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleExchangeChange('NSE')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    (displayQuote || quote).exchange === 'NSE'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  NSE
                </button>
                <button
                  type="button"
                  onClick={() => handleExchangeChange('BSE')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    (displayQuote || quote).exchange === 'BSE'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  BSE
                </button>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs font-mono">
                {(displayQuote || quote).exchange}
              </Badge>
            )}
            {instrument?.isSME && (
              <Badge variant="default" className="text-xs bg-amber-600/80 hover:bg-amber-600 text-white">
                SME PLATFORM
              </Badge>
            )}
            {instrument?.bseCode && (
              <Badge variant="outline" className="text-xs font-mono tabular-nums text-muted-foreground">
                BSE: {instrument.bseCode}
              </Badge>
            )}
            {instrument?.isin && (
              <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                ISIN: {instrument.isin}
              </Badge>
            )}
            {fundamentals?.sector && (
              <Badge variant="secondary" className="text-xs">{fundamentals.sector}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{(displayQuote || quote).companyName}</p>
        </div>

        {/* Price & Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-left md:text-right">
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-foreground inline-block ${getFlashClass((displayQuote || quote).symbol)}`}>
              {(displayQuote || quote).currentPrice > 0 ? (
                formatINR((displayQuote || quote).currentPrice)
              ) : (
                <span className="text-muted-foreground text-lg font-sans font-normal">Price Unavailable</span>
              )}
            </div>
            {(displayQuote || quote).currentPrice > 0 ? (
              <div className={`flex items-center gap-1 font-mono tabular-nums text-xs font-semibold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPos ? <TrendingUp className="h-3.5 w-3.5 inline" /> : <TrendingDown className="h-3.5 w-3.5 inline" />}
                <span>{isPos ? '+' : ''}{(displayQuote || quote).change.toFixed(2)} ({formatPercent((displayQuote || quote).percentChange)})</span>
              </div>
            ) : (
              <div className="text-muted-foreground text-[11px]">
                Market quote not supplied by current configured source.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AddToWatchlistModal symbol={(displayQuote || quote).symbol} />
            <CreateAlertDialog symbol={(displayQuote || quote).symbol} currentPrice={(displayQuote || quote).currentPrice} />
          </div>
        </div>
      </div>

      {/* Accurate Timestamp, Source Attribution & Coverage Strip */}
      <div className="p-3 rounded-lg border border-border/60 bg-card/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1 font-mono tabular-nums text-[11px]">
            <Clock className="h-3.5 w-3.5 text-primary" />
            Last Updated: {new Date((displayQuote || quote).lastUpdated).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })} IST
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-[11px]">
            <Database className="h-3.5 w-3.5 text-primary" />
            Source: {sourceAttribution}
          </span>
          <span>•</span>
          <Badge
            variant="outline"
            className={`text-[10px] font-mono uppercase ${
              (displayQuote || quote).freshness === 'live'
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : (displayQuote || quote).freshness === 'eod'
                ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
            }`}
          >
            {(displayQuote || quote).freshness === 'live' ? '● Real-Time Feed' : (displayQuote || quote).freshness === 'eod' ? 'End of Day (Closed)' : 'Delayed / Standby'}
          </Badge>
        </div>

        {/* Dataset Coverage Badges */}
        {coverage && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="text-muted-foreground font-semibold mr-1">Dataset Coverage:</span>
            <span className={`px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${coverage.quotes ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground'}`}>
              {coverage.quotes ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />} Quotes
            </span>
            <span className={`px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${coverage.historicalOHLCV ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground'}`}>
              {coverage.historicalOHLCV ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />} OHLCV
            </span>
            <span className={`px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${coverage.fundamentals ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground'}`}>
              {coverage.fundamentals ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />} Fundamentals
            </span>
            <span className={`px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${coverage.financialStatements ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground'}`}>
              {coverage.financialStatements ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />} Statements
            </span>
            <span className={`px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${coverage.corporateActions ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground'}`}>
              {coverage.corporateActions ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />} Actions
            </span>
            <span className={`px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${coverage.news ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground'}`}>
              {coverage.news ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />} News
            </span>
          </div>
        )}
      </div>

      {/* Interactive Stock Chart with Technical Indicators */}
      <InteractiveStockChart
        symbol={quote.symbol}
        exchange={(displayQuote || quote).exchange}
      />

      {/* Comprehensive Live Market Overview Grid */}
      <MarketOverviewGrid quote={displayQuote || quote} instrument={instrument} />

      {/* Main Tabs: Fundamentals, AI Intelligence, Financials, Corporate Actions, News */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-xl mb-4">
          <TabsTrigger value="fundamentals" className="text-xs">Fundamentals</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">AI Analysis</TabsTrigger>
          <TabsTrigger value="financials" className="text-xs">Financials</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">Corporate Actions</TabsTrigger>
          <TabsTrigger value="news" className="text-xs">News & Filings</TabsTrigger>
        </TabsList>

        {/* 1. Fundamentals Tab */}
        <TabsContent value="fundamentals" className="space-y-6 mt-0">
          {fundamentals ? (
            <>
              <FundamentalsGrid fundamentals={fundamentals} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/60 bg-card/60">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Corporate Profile & Governance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3 text-xs leading-relaxed text-muted-foreground">
                    <p>{fundamentals.about}</p>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Headquarters:</span>
                        <span className="text-foreground">{fundamentals.headquarters}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Key Leadership:</span>
                        <span className="text-foreground">{fundamentals.ceo || 'Board of Directors'}</span>
                      </div>
                    </div>
                    {fundamentals.website && (
                      <div className="pt-1">
                        <a
                          href={fundamentals.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <Globe className="h-3 w-3" /> Official Website <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <ShareholdingChart fundamentals={fundamentals} />
              </div>

              {/* Exchange Instrument Master & Identification */}
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Exchange Instrument Master & Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">ISIN Identifier:</span>
                      <span className="text-foreground font-bold">{instrument?.isin || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">Market Platform:</span>
                      <span className="text-foreground">{instrument?.isSME ? 'BSE/NSE SME Platform' : 'Mainboard Standard'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">Trading Series:</span>
                      <span className="text-foreground">{instrument?.series || 'EQ (Normal Equity)'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">Face Value / Lot:</span>
                      <span className="text-foreground">₹{instrument?.faceValue || 10} / {instrument?.marketLot || 1} Share</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="space-y-4">
              <Card className="border-border/60 bg-card/60">
                <CardContent className="p-8 text-center text-xs text-muted-foreground space-y-1.5">
                  <Info className="h-6 w-6 text-muted-foreground mx-auto mb-1 text-primary" />
                  <p className="font-semibold text-foreground text-sm">Fundamental Ratios Unsupplied</p>
                  <p>
                    Detailed P/E, P/B, and dividend disclosures are not supplied by the public data feed for {quote.symbol}.
                    {instrument?.isSME && ' (SME counters report half-yearly un-audited statements only).'}
                  </p>
                </CardContent>
              </Card>

              {/* Display Instrument Master Details */}
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Exchange Instrument Master & Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">ISIN Identifier:</span>
                      <span className="text-foreground font-bold">{instrument?.isin || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">Market Platform:</span>
                      <span className="text-foreground">{instrument?.isSME ? 'BSE/NSE SME Platform' : 'Mainboard Standard'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">Trading Series:</span>
                      <span className="text-foreground">{instrument?.series || 'EQ (Normal Equity)'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">Face Value / Lot:</span>
                      <span className="text-foreground">₹{instrument?.faceValue || 10} / {instrument?.marketLot || 1} Share</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 2. AI Intelligence Tab */}
        <TabsContent value="ai" className="space-y-6 mt-0">
          {aiAnalysis ? (
            <div className="space-y-6">
              <Card className="border-border/60 bg-gradient-to-r from-card to-card/50">
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Valuation Assessment</span>
                    </div>
                    <div className="text-xl font-bold text-foreground">
                      Verdict: <span className="text-primary">{aiAnalysis.valuationVerdict}</span>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-xl">
                      {aiAnalysis.summary}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-center shrink-0">
                    <div className="text-2xl font-bold font-mono text-primary">
                      {aiAnalysis.fundamentalHealthScore}/10
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">Fundamental Health</div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/60 bg-card/60">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      Key Moats & Growth Tailwinds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {aiAnalysis.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/60">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Potential Risks & Uncertainties
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {aiAnalysis.risksAndUncertainties.map((risk, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-card/40 text-xs">
                <span className="font-semibold text-foreground">Technical Health & Trend: </span>
                <span className="text-muted-foreground">{aiAnalysis.technicalMomentum}</span>
              </div>

              <Card className="border-border/60 bg-card/60">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    Ask AI Analyst about {quote.symbol}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                  <form onSubmit={handleAskAI} className="flex gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      placeholder={`e.g. Is ${quote.symbol} fairly valued compared to peers?`}
                      className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button type="submit" size="sm" disabled={askingAi} className="text-xs">
                      {askingAi ? 'Analyzing...' : 'Ask AI'}
                    </Button>
                  </form>

                  {aiAnswer && (
                    <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground leading-relaxed whitespace-pre-line space-y-2.5">
                      <div>{aiAnswer}</div>
                      
                      {aiResult?.groundedSources && aiResult.groundedSources.length > 0 && (
                        <div className="pt-2 border-t border-primary/20 flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="text-emerald-500 font-semibold flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Grounded Sources:
                          </span>
                          {aiResult.groundedSources.map((s, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                              {s}
                            </Badge>
                          ))}
                          {aiResult.modelUsed && (
                            <Badge variant="outline" className="text-[9px] font-mono ml-auto">
                              {aiResult.modelUsed}
                            </Badge>
                          )}
                        </div>
                      )}

                      {aiResult?.chunksUsed && aiResult.chunksUsed.length > 0 && (
                        <div className="pt-1 text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground">Retrieved Filings ({aiResult.chunksUsed.length}):</span>{' '}
                          {aiResult.chunksUsed.map(c => c.title).join(' • ')}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Generating grounded AI analysis...
            </div>
          )}
        </TabsContent>

        {/* 3. Financial Statements Tab (Lazy Loaded) */}
        <TabsContent value="financials" className="space-y-6 mt-0">
          {loadingFinancials ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Lazy fetching audited balance sheets and financial statements...
            </div>
          ) : financialsData?.quarterlyResults?.length > 0 ? (
            <>
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Quarterly Reported Results (in ₹ Crores)
                  </CardTitle>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Source: {financialsData.source || 'EODHD & Exchange Filings'}
                  </span>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground font-mono">
                          <th className="py-2">Period</th>
                          <th className="py-2 text-right">Revenue (₹ Cr)</th>
                          <th className="py-2 text-right">Net Profit (₹ Cr)</th>
                          <th className="py-2 text-right">Operating Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono">
                        {financialsData.quarterlyResults.map((q: any) => (
                          <tr key={q.period} className="hover:bg-muted/20">
                            <td className="py-2.5 font-bold text-foreground">{q.period}</td>
                            <td className="py-2.5 text-right">{q.revenueCrores.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-500">{q.profitCrores.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 text-right">{q.operatingMarginPercent.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {financialsData?.annualResults?.length > 0 && (
                <Card className="border-border/60 bg-card/60">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Annual Financial Trajectory (in ₹ Crores)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground font-mono">
                            <th className="py-2">Financial Year</th>
                            <th className="py-2 text-right">Total Revenue (₹ Cr)</th>
                            <th className="py-2 text-right">Net Profit (₹ Cr)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-mono">
                          {financialsData.annualResults.map((a: any) => (
                            <tr key={a.year} className="hover:bg-muted/20">
                              <td className="py-2.5 font-bold text-foreground">{a.year}</td>
                              <td className="py-2.5 text-right">{a.revenueCrores.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 text-right font-bold text-emerald-500">{a.profitCrores.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <FileText className="h-6 w-6 text-primary mx-auto" />
                <p className="font-semibold text-foreground text-sm">Financial Statements Unsupplied</p>
                <p className="max-w-md mx-auto leading-relaxed">
                  Audited quarterly financial statements (Balance Sheet, Cash Flow, and MCA filings) are currently unsupplied by the public feed for {quote.symbol}.
                  {instrument?.isSME
                    ? ' SME EMERGE counters file half-yearly un-audited financial reports directly with the exchange.'
                    : ' Small-cap and non-indexed equities submit statutory balance sheets directly to BSE/NSE compliance portals.'}
                </p>
                <div className="pt-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    Exchange Regulatory Filing Notice
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 4. Corporate Actions Tab (Lazy Loaded) */}
        <TabsContent value="actions" className="space-y-4 mt-0">
          {loadingActions ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Fetching official exchange corporate actions disclosures...
            </div>
          ) : actionsData.length === 0 ? (
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-8 text-center text-xs text-muted-foreground">
                <Calendar className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                No active or upcoming corporate actions (Dividends, Splits, Bonus, Rights) recorded for {quote.symbol}.
              </CardContent>
            </Card>
          ) : (
            actionsData.map(act => (
              <Card key={act.id} className="border-border/60 bg-card/60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                        {act.actionType}
                      </Badge>
                      <span className="text-xs font-bold text-foreground">{act.details}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-3">
                      <span>Ex-Date: {act.exDate}</span>
                      {act.recordDate && <span>• Record Date: {act.recordDate}</span>}
                      {act.amount && <span>• Dividend: ₹{act.amount.toFixed(2)}</span>}
                      {act.ratio && <span>• Ratio: {act.ratio}</span>}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {act.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* 5. News & Filings Tab (Lazy Loaded) */}
        <TabsContent value="news" className="space-y-4 mt-0">
          {loadingNews ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Fetching verified news and regulatory announcements...
            </div>
          ) : newsData.length === 0 ? (
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-8 text-center text-xs text-muted-foreground">
                No recent corporate news or regulatory announcements recorded for this stock.
              </CardContent>
            </Card>
          ) : (
            newsData.map(item => (
              <Card key={item.id} className="border-border/60 bg-card/60 hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-semibold text-primary">{item.source}</span>
                    <span>{item.publishedAt}</span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.summary}
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Read full source <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StockDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto py-16 px-4 text-center animate-pulse">
          <p className="text-sm text-muted-foreground">Loading Indian equity filings and price data...</p>
        </div>
      }
    >
      <StockDetailContent />
    </Suspense>
  );
}
