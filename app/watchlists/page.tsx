'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ListFilter,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Watchlist, StockQuote } from '@/types';
import { formatINR, formatPercent, formatCrores } from '@/lib/utils/indian-market';
import { CreateAlertDialog } from '@/components/alerts/CreateAlertDialog';
import { useLiveQuotes } from '@/hooks/useLiveQuotes';

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('');
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(true);

  // New Watchlist State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');

  // Add Stock State
  const [symbolToAdd, setSymbolToAdd] = useState('');

  const loadWatchlists = async () => {
    try {
      const res = await fetch('/api/watchlists');
      const data = await res.json();
      if (data.watchlists) {
        setWatchlists(data.watchlists);
        if (data.watchlists.length > 0 && !activeWatchlistId) {
          setActiveWatchlistId(data.watchlists[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlists();
  }, []);

  // Active watchlist and live streaming
  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0];
  const activeSymbols = useMemo(() => activeWatchlist?.symbols || [], [activeWatchlist?.symbols]);

  const { quotes: liveQuotes, getFlashClass } = useLiveQuotes({
    symbols: activeSymbols,
    initialQuotes: quotes,
    enabled: activeSymbols.length > 0,
  });

  const mergedQuotes = { ...quotes, ...liveQuotes };

  // Fetch initial quotes for active watchlist symbols
  useEffect(() => {
    if (activeWatchlist && activeWatchlist.symbols.length > 0) {
      activeWatchlist.symbols.forEach(sym => {
        fetch(`/api/stocks/${sym}`)
          .then(res => res.json())
          .then(data => {
            if (data.quote) {
              setQuotes(prev => ({ ...prev, [sym]: data.quote }));
            }
          })
          .catch(e => console.error(e));
      });
    }
  }, [activeWatchlist]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;

    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim(), symbols: [] }),
      });
      const data = await res.json();
      if (data.watchlist) {
        setWatchlists(prev => [...prev, data.watchlist]);
        setActiveWatchlistId(data.watchlist.id);
        setNewWatchlistName('');
        setShowCreateModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWatchlist = async (id: string) => {
    if (watchlists.length <= 1) return; // Keep at least one
    try {
      await fetch(`/api/watchlists/${id}`, { method: 'DELETE' });
      const updated = watchlists.filter(w => w.id !== id);
      setWatchlists(updated);
      if (activeWatchlistId === id && updated.length > 0) {
        setActiveWatchlistId(updated[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbolToAdd.trim() || !activeWatchlist) return;

    try {
      const res = await fetch(`/api/watchlists/${activeWatchlist.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', symbol: symbolToAdd.trim() }),
      });
      const data = await res.json();
      if (data.watchlist) {
        setWatchlists(prev => prev.map(w => w.id === activeWatchlist.id ? data.watchlist : w));
        setSymbolToAdd('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveStock = async (sym: string) => {
    if (!activeWatchlist) return;
    try {
      const res = await fetch(`/api/watchlists/${activeWatchlist.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', symbol: sym }),
      });
      const data = await res.json();
      if (data.watchlist) {
        setWatchlists(prev => prev.map(w => w.id === activeWatchlist.id ? data.watchlist : w));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <ListFilter className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Personalized Watchlists
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time prices, trigger alerts, and organize your Indian stock portfolio holdings.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="gap-1.5 text-xs h-8"
        >
          <Plus className="h-3.5 w-3.5" />
          New Watchlist
        </Button>
      </div>

      {/* Create Watchlist Modal Form */}
      {showCreateModal && (
        <Card className="border-primary/40 bg-card p-4">
          <form onSubmit={handleCreateWatchlist} className="flex items-center gap-3">
            <Input
              type="text"
              value={newWatchlistName}
              onChange={e => setNewWatchlistName(e.target.value)}
              placeholder="Watchlist Name (e.g. High Growth Tech, Dividend Yielders)..."
              className="text-xs h-9 flex-1"
              autoFocus
            />
            <Button type="submit" size="sm" className="text-xs h-9">Create</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)} className="text-xs h-9">
              Cancel
            </Button>
          </form>
        </Card>
      )}

      {/* Watchlist Tabs / Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-3">
        {watchlists.map(w => (
          <div
            key={w.id}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
              activeWatchlistId === w.id
                ? 'border-primary bg-primary/10 text-foreground font-semibold'
                : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
            }`}
            onClick={() => setActiveWatchlistId(w.id)}
          >
            <span>{w.name} ({w.symbols.length})</span>
            {watchlists.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWatchlist(w.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Stock to Active Watchlist Bar */}
      {activeWatchlist && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 border border-border/60 p-3 rounded-xl">
          <form onSubmit={handleAddStock} className="flex items-center gap-2 flex-1 max-w-md">
            <Input
              placeholder="Add stock symbol (e.g. RELIANCE, TCS, INFY)..."
              value={symbolToAdd}
              onChange={e => setSymbolToAdd(e.target.value.toUpperCase())}
              className="h-8 text-xs font-mono tabular-nums uppercase"
            />
            <Button type="submit" size="sm" className="h-8 text-xs">Add</Button>
          </form>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Quick add:</span>
            {['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSymbolToAdd(s);
                }}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border/60 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
              >
                +{s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Stocks Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="text-xs">Symbol / Company</TableHead>
                <TableHead className="text-xs text-right">Price (INR)</TableHead>
                <TableHead className="text-xs text-right">Day Change</TableHead>
                <TableHead className="text-xs text-right hidden sm:table-cell">Market Cap</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border/40 animate-pulse">
                    <TableCell className="py-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-3.5 w-16 bg-muted rounded" />
                          <div className="h-3 w-8 bg-muted/60 rounded" />
                        </div>
                        <div className="h-2.5 w-32 bg-muted/50 rounded" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-3.5 w-16 bg-muted rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-3.5 w-14 bg-muted rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <div className="h-3.5 w-16 bg-muted rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-6 w-16 bg-muted/40 rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !activeWatchlist || activeWatchlist.symbols.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center py-8">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <ListFilter className="h-7 w-7 text-muted-foreground/40" />
                      <p className="text-sm font-semibold text-foreground">Watchlist is Empty</p>
                      <p className="text-xs text-muted-foreground">
                        Add Indian equities using the symbol search bar above or browse the directory.
                      </p>
                      <Link href="/stocks" className="mt-2">
                        <Button variant="outline" size="xs" className="text-xs">
                          Explore Indian Universe
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activeWatchlist.symbols.map(sym => {
                  const q = mergedQuotes[sym] || mergedQuotes[sym.toUpperCase()];
                  const isPos = q ? q.change >= 0 : true;

                  return (
                    <TableRow key={sym} className="border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <Link href={`/stocks/${sym}`} className="group block">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground font-mono tabular-nums group-hover:text-primary transition-colors">
                              {sym}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{q?.exchange || 'NSE'}</Badge>
                            {q?.freshness === 'live' && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Tick" />
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{q?.companyName || sym}</div>
                        </Link>
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-foreground">
                        <span className={`inline-block ${getFlashClass(sym)}`}>
                          {q ? formatINR(q.currentPrice) : '—'}
                        </span>
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums text-xs">
                        {q ? (
                          <>
                            <span className={`font-semibold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {formatPercent(q.percentChange)}
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                              {isPos ? '+' : ''}{q.change.toFixed(2)}
                            </div>
                          </>
                        ) : '—'}
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums text-xs text-muted-foreground hidden sm:table-cell">
                        {q ? formatCrores(q.marketCapCrores) : '—'}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {q && <CreateAlertDialog symbol={sym} currentPrice={q.currentPrice} />}
                          <Link href={`/stocks/${sym}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStock(sym)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
