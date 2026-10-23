'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';
import { StockQuote, InstrumentCoverageStatus } from '@/types';
import { formatINR, formatPercent } from '@/lib/utils/indian-market';

interface SearchStockItem extends StockQuote {
  isin?: string;
  bseCode?: string;
  isSME?: boolean;
  coverage?: InstrumentCoverageStatus;
}

const POPULAR_INDIAN_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE', sector: 'Energy & Petrochemicals' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', exchange: 'NSE', sector: 'Information Technology' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  { symbol: 'INFY', name: 'Infosys Ltd.', exchange: 'NSE', sector: 'Information Technology' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', exchange: 'NSE', sector: 'Telecommunications' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', exchange: 'NSE', sector: 'Automotive' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'Banking & Financials' },
  { symbol: 'ETERNAL', name: 'Eternal Ltd. (Zomato)', exchange: 'NSE', sector: 'Consumer Internet' },
  { symbol: 'SWIGGY', name: 'Swiggy Ltd.', exchange: 'NSE', sector: 'Consumer Internet' },
  { symbol: 'DRONACHARYA', name: 'Droneacharya Aerial Innovations', exchange: 'NSE', sector: 'Drones & Tech', isSME: true },
];

export function GlobalSearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkeys: '/' or 'Cmd+K' / 'Ctrl+K'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in another input/textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((e.key === '/' && !isInput) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/stocks?q=${encodeURIComponent(query.trim())}&limit=8`)
        .then(res => res.json())
        .then(data => {
          if (data.stocks) {
            setResults(data.stocks);
            setSelectedIndex(0);
          }
        })
        .catch(err => console.error('Search error:', err))
        .finally(() => setLoading(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectStock = useCallback((symbol: string) => {
    setOpen(false);
    router.push(`/stocks/${symbol}`);
  }, [router]);

  // Keyboard navigation within results
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    const activeList = query.trim() ? results : POPULAR_INDIAN_STOCKS;
    const maxIndex = activeList.length - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeList.length > 0 && activeList[selectedIndex]) {
        handleSelectStock(activeList[selectedIndex].symbol);
      } else if (query.trim()) {
        // Navigate to explorer with current query
        setOpen(false);
        router.push(`/stocks?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Trigger Button rendered in Navbar */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 text-xs text-muted-foreground h-8 px-3 rounded-lg border-border/60 bg-muted/30 hover:bg-muted/80 hover:text-foreground hover:border-border transition-colors shrink-0 cursor-pointer"
        title="Search Indian stocks (Press / or Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="hidden sm:inline">Search NSE / BSE stocks...</span>
        <span className="sm:hidden">Search</span>
        <kbd className="pointer-events-none hidden h-4 select-none items-center gap-1 rounded bg-muted/80 px-1.5 font-mono text-[10px] font-medium opacity-100 min-[1100px]:flex">
          /
        </kbd>
      </Button>

      {/* Global Search Dialog Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="p-0 max-w-2xl bg-card/95 backdrop-blur-md border-border/80 shadow-2xl rounded-2xl overflow-hidden sm:max-w-xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Search Indian Stock Universe</DialogTitle>
          <DialogHeader className="sr-only">
            <span>Search Indian Stocks</span>
          </DialogHeader>

          {/* Search Header Input */}
          <div className="relative flex items-center px-4 py-3 border-b border-border/50 bg-background/50">
            <Search className="h-4 w-4 text-primary shrink-0 mr-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by stock name, NSE symbol (e.g. RELIANCE), BSE code (500325), or ISIN..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground placeholder:text-xs"
            />
            {loading && <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0 mr-2" />}
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0 mr-1"
                title="Clear query"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted/60 text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Search Content Body */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
            {/* When user has typed query */}
            {query.trim() ? (
              results.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Matching Stocks ({results.length})</span>
                    <span className="text-[10px] font-normal normal-case">Use ↑ ↓ arrows to navigate</span>
                  </div>
                  {results.map((stock, idx) => {
                    const isSelected = idx === selectedIndex;
                    const hasPrice = stock.currentPrice > 0;
                    const isPos = stock.change >= 0;

                    return (
                      <div
                        key={`${stock.symbol}_${stock.exchange}_${idx}`}
                        onClick={() => handleSelectStock(stock.symbol)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border border-primary/30 text-foreground' : 'hover:bg-muted/40 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono font-bold text-xs text-primary shrink-0">
                            {stock.symbol.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs font-mono text-foreground">{stock.symbol}</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                                {stock.exchange}
                              </Badge>
                              {stock.isSME && (
                                <Badge className="text-[9px] px-1 py-0 bg-amber-600/80 text-white">
                                  SME
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {stock.companyName}
                            </div>
                          </div>
                        </div>

                        {/* Price & Change column */}
                        <div className="text-right shrink-0 ml-3">
                          {hasPrice ? (
                            <>
                              <div className="font-mono font-bold text-xs text-foreground">
                                {formatINR(stock.currentPrice)}
                              </div>
                              <div className={`flex items-center justify-end gap-0.5 font-mono text-[10px] ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isPos ? <TrendingUp className="h-2.5 w-2.5 inline" /> : <TrendingDown className="h-2.5 w-2.5 inline" />}
                                <span>{isPos ? '+' : ''}{stock.change.toFixed(2)} ({formatPercent(stock.percentChange)})</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-[11px] text-muted-foreground font-mono">
                              View Details
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : !loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <p>No listed equities found matching &quot;{query}&quot;.</p>
                  <p className="text-[11px] text-muted-foreground/80">
                    Try searching by company name (e.g. &quot;Tata Motors&quot;), ticker (&quot;TCS&quot;), or BSE code (&quot;500325&quot;).
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/stocks?q=${encodeURIComponent(query.trim())}`);
                    }}
                    className="mt-2 text-xs"
                  >
                    Open in Stock Universe Explorer
                  </Button>
                </div>
              ) : null
            ) : (
              /* When query is empty: Show Trending / Quick Jump */
              <div className="space-y-3 p-1">
                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Trending Indian Bluechips & High Activity</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {POPULAR_INDIAN_STOCKS.map((stock, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={stock.symbol}
                        onClick={() => handleSelectStock(stock.symbol)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                          isSelected ? 'bg-primary/10 border-primary/30 text-foreground' : 'bg-muted/20 border-border/40 hover:bg-muted/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs font-mono text-foreground">{stock.symbol}</span>
                            <Badge variant="outline" className="text-[8.5px] px-1 py-0">{stock.exchange}</Badge>
                            {stock.isSME && <Badge className="text-[8.5px] px-1 py-0 bg-amber-600/80 text-white">SME</Badge>}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{stock.name}</div>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0 ml-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-3 border-t border-border/50 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[9px]">↵ Enter</kbd> to view</span>
              <span className="hidden sm:inline">•</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[9px]">ESC</kbd> to close</span>
            </div>

            {query.trim() && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setOpen(false);
                  router.push(`/stocks?q=${encodeURIComponent(query.trim())}`);
                }}
                className="text-xs text-primary hover:text-primary gap-1 p-0 h-auto font-medium"
              >
                <span>View all in Stock Explorer</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
