'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  Bell,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Info,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StockQuote, InstrumentCoverageStatus } from '@/types';
import { formatINR, formatPercent, formatCrores } from '@/lib/utils/indian-market';
import { AddToWatchlistModal } from '@/components/watchlists/AddToWatchlistModal';
import { CreateAlertDialog } from '@/components/alerts/CreateAlertDialog';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useRef } from 'react';

interface EnrichedStockQuote extends StockQuote {
  isin?: string;
  bseCode?: string;
  isSME?: boolean;
  coverage?: InstrumentCoverageStatus;
}

function ExploreStocksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams?.get('q') || '';

  const [stocks, setStocks] = useState<EnrichedStockQuote[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [exchangeFilter, setExchangeFilter] = useState<'ALL' | 'NSE' | 'BSE'>('ALL');
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'MAIN' | 'SME'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [aliasRedirect, setAliasRedirect] = useState<{ searchedSymbol: string; currentSymbol: string; effectiveDate: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync if URL query param changes
  useEffect(() => {
    if (initialQ && initialQ !== searchQuery) {
      setSearchQuery(initialQ);
      setPage(1);
    }
  }, [initialQ]);

  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      setFetchError(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (exchangeFilter !== 'ALL') params.append('exchange', exchangeFilter);
      if (segmentFilter !== 'ALL') params.append('segment', segmentFilter);
      params.append('page', page.toString());
      params.append('limit', '20');

      const executeFetch = async (attempt = 1): Promise<void> => {
        try {
          const res = await fetch(`/api/stocks?${params.toString()}`, {
            signal: controller.signal,
          });

          if (!res.ok) {
            let errorMsg = `Server returned HTTP ${res.status}`;
            try {
              const errJson = await res.json();
              if (errJson.error) errorMsg = errJson.error;
            } catch {}
            throw new Error(errorMsg);
          }

          const data = await res.json();
          if (!isCancelled) {
            if (data.stocks) setStocks(data.stocks);
            if (data.totalPages !== undefined) setTotalPages(data.totalPages);
            if (data.totalCount !== undefined) setTotalCount(data.totalCount);
            setAliasRedirect(data.aliasRedirect || null);
            setFetchError(null);
          }
        } catch (err: any) {
          if (err.name === 'AbortError' || isCancelled) {
            return;
          }
          // In development mode (Turbopack), routes might compile on demand causing transient connection resets.
          // Retry automatically once after 600ms before declaring an error.
          if (attempt === 1) {
            await new Promise(r => setTimeout(r, 600));
            if (!isCancelled && !controller.signal.aborted) {
              return executeFetch(2);
            }
          }
          // Use console.warn instead of console.error to avoid triggering Turbopack's red error overlay modal
          console.warn('[ExploreStocks] Notice while fetching stocks:', err?.message || err);
          if (!isCancelled) {
            setFetchError(
              err?.message === 'Failed to fetch'
                ? 'Network connection was interrupted or server is recompiling. Please retry.'
                : err?.message || 'Failed to retrieve stock list'
            );
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      };

      await executeFetch();
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, exchangeFilter, segmentFilter, page, retryKey]);

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Explore Indian Stock Universe
            </h1>
            {totalCount > 0 && (
              <Badge variant="secondary" className="font-mono text-[11px] tabular-nums px-2 py-0.5">
                {totalCount} Counters
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete multi-exchange master search across NSE Mainboard, NSE EMERGE SME, BSE Mainboard, BSE SME, and BSE-only listed counters.
          </p>
        </div>
      </div>

      {/* Historical Symbol Redirection Notice */}
      {aliasRedirect && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-between text-xs text-foreground">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>Historical Symbol Notice:</strong> Searching for <code>{aliasRedirect.searchedSymbol}</code> redirected to current listed symbol <code>{aliasRedirect.currentSymbol}</code> (effective {aliasRedirect.effectiveDate}).
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-mono">
            Redirected
          </Badge>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card/60 border border-border/60 p-4 rounded-xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search by name, NSE symbol (RELIANCE), BSE code (500325), or ISIN (INE...)..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && stocks.length > 0) {
                router.push(`/stocks/${stocks[0].symbol}`);
              }
            }}
            className="pl-9 pr-16 h-9 text-xs"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setPage(1);
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-2 p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear search"
            >
              <XCircle className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-2 hidden h-5 select-none items-center gap-1 rounded bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              Enter ↵
            </kbd>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Exchange Filter */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/40 text-xs">
            {(['ALL', 'NSE', 'BSE'] as const).map(ex => (
              <Button
                key={ex}
                variant={exchangeFilter === ex ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => {
                  setExchangeFilter(ex);
                  setPage(1);
                }}
                className="text-xs font-medium px-2.5"
              >
                {ex}
              </Button>
            ))}
          </div>

          {/* Segment Filter (Mainboard vs SME) */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/40 text-xs">
            {(['ALL', 'MAIN', 'SME'] as const).map(seg => (
              <Button
                key={seg}
                variant={segmentFilter === seg ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => {
                  setSegmentFilter(seg);
                  setPage(1);
                }}
                className="text-xs font-medium px-2.5"
              >
                {seg === 'ALL' ? 'All Segments' : seg === 'MAIN' ? 'Mainboard' : 'SME Platform'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Connection Notice if partial error with cached results */}
      {fetchError && stocks.length > 0 && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 flex items-center justify-between text-xs text-foreground">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span>{fetchError}</span>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setRetryKey(k => k + 1)}
            className="text-xs h-7 gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        </div>
      )}

      {/* Universe Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-xs">Company / Identifiers</TableHead>
                <TableHead className="text-xs text-right">Price (INR)</TableHead>
                <TableHead className="text-xs text-right">Day Change</TableHead>
                <TableHead className="text-xs text-right hidden sm:table-cell">Market Cap</TableHead>
                <TableHead className="text-xs text-center hidden md:table-cell">Data Coverage</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border/40 animate-pulse">
                    <TableCell className="py-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-3.5 w-20 bg-muted rounded" />
                          <div className="h-3 w-8 bg-muted/60 rounded" />
                        </div>
                        <div className="h-2.5 w-36 bg-muted/50 rounded" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-3.5 w-16 bg-muted rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        <div className="h-3.5 w-14 bg-muted rounded ml-auto" />
                        <div className="h-2.5 w-10 bg-muted/50 rounded ml-auto" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <div className="h-3.5 w-16 bg-muted rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <div className="h-3.5 w-20 bg-muted/40 rounded mx-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-6 w-16 bg-muted/40 rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : fetchError && stocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center py-8">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-semibold text-foreground">Unable to Load Universe Catalog</p>
                        <p className="text-xs text-muted-foreground px-4">
                          {fetchError}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setRetryKey(k => k + 1)}
                        className="mt-1 text-xs gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry Connection
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : stocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center py-8">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Search className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm font-semibold text-foreground">No Indian Equities Found</p>
                      <p className="text-xs text-muted-foreground">
                        No listed counters match &quot;{searchQuery}&quot; with current filters.
                      </p>
                      {(searchQuery || exchangeFilter !== 'ALL' || segmentFilter !== 'ALL') && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setSearchQuery('');
                            setExchangeFilter('ALL');
                            setSegmentFilter('ALL');
                            setPage(1);
                          }}
                          className="mt-2 text-xs"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                stocks.map(stock => {
                  const isPos = stock.change >= 0;
                  return (
                    <TableRow key={`${stock.symbol}_${stock.isin || ''}`} className="border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <Link href={`/stocks/${stock.symbol}`} className="group block">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground font-mono tabular-nums group-hover:text-primary transition-colors">
                              {stock.symbol}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{stock.exchange}</Badge>
                            {stock.isSME && (
                              <Badge variant="default" className="text-[9px] px-1 py-0 bg-amber-600/80 text-white">
                                SME
                              </Badge>
                            )}
                            {stock.bseCode && (
                              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                                BSE: {stock.bseCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">{stock.companyName}</div>
                          {stock.isin && (
                            <div className="text-[9px] text-muted-foreground/70 font-mono">ISIN: {stock.isin}</div>
                          )}
                        </Link>
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-foreground">
                        {stock.currentPrice > 0 ? (
                          formatINR(stock.currentPrice)
                        ) : (
                          <span className="text-muted-foreground font-normal text-[11px]">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums text-xs">
                        {stock.currentPrice > 0 ? (
                          <>
                            <span className={`font-semibold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {formatPercent(stock.percentChange)}
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                              {isPos ? '+' : ''}{stock.change.toFixed(2)}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums text-xs text-muted-foreground hidden sm:table-cell">
                        {stock.marketCapCrores > 0 ? formatCrores(stock.marketCapCrores) : '—'}
                      </TableCell>

                      <TableCell className="text-center hidden md:table-cell">
                        {stock.coverage ? (
                          <div className="inline-flex items-center gap-1 text-[9px] font-mono">
                            <span className={`px-1 py-0.5 rounded border transition-colors ${stock.coverage.quotes ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground/40 border-border/40'}`} title="Quotes: Real-time Live Quotes">
                              Q
                            </span>
                            <span className={`px-1 py-0.5 rounded border transition-colors ${stock.coverage.historicalOHLCV ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground/40 border-border/40'}`} title="Historical OHLCV: Daily Candlesticks & Technicals">
                              H
                            </span>
                            <span className={`px-1 py-0.5 rounded border transition-colors ${stock.coverage.fundamentals ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground/40 border-border/40'}`} title="Fundamentals: Key Financial Ratios & Valuations">
                              F
                            </span>
                            <span className={`px-1 py-0.5 rounded border transition-colors ${stock.coverage.financialStatements ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground/40 border-border/40'}`} title="Statements: Income Statement, Balance Sheet, Cash Flow">
                              S
                            </span>
                            <span className={`px-1 py-0.5 rounded border transition-colors ${stock.coverage.corporateActions ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground/40 border-border/40'}`} title="Actions: Dividends, Splits, SEBI Filings">
                              A
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Standard</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <AddToWatchlistModal symbol={stock.symbol} />
                          <CreateAlertDialog symbol={stock.symbol} currentPrice={stock.currentPrice} />
                          <Link href={`/stocks/${stock.symbol}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span className="tabular-nums">
                Showing {stocks.length} of {totalCount} instruments
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-3 w-3 mr-1" /> Previous
                </Button>
                <span className="font-mono tabular-nums text-foreground font-semibold">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExploreStocksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full animate-pulse">
          <div className="h-8 w-64 bg-muted/60 rounded mb-2" />
          <div className="h-12 w-full bg-muted/40 rounded mb-4" />
          <div className="h-80 w-full bg-muted/20 rounded" />
        </div>
      }
    >
      <ExploreStocksContent />
    </Suspense>
  );
}
