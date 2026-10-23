'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { StockQuote } from '@/types';

export type TickDirection = 'up' | 'down' | null;

export interface UseLiveQuotesOptions {
  symbols?: string[];
  initialQuotes?: Record<string, StockQuote> | StockQuote[];
  enabled?: boolean;
}

export interface UseLiveQuotesReturn {
  quotes: Record<string, StockQuote>;
  getQuote: (symbol: string) => StockQuote | undefined;
  getFlash: (symbol: string) => TickDirection;
  getFlashClass: (symbol: string) => string;
  feedStatus: any;
  isConnected: boolean;
}

export function useLiveQuotes({
  symbols = [],
  initialQuotes,
  enabled = true,
}: UseLiveQuotesOptions = {}): UseLiveQuotesReturn {
  // Build initial lookup map
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>(() => {
    const map: Record<string, StockQuote> = {};
    if (initialQuotes) {
      if (Array.isArray(initialQuotes)) {
        for (const q of initialQuotes) {
          if (q?.symbol) map[q.symbol.toUpperCase()] = q;
        }
      } else {
        for (const [k, v] of Object.entries(initialQuotes)) {
          if (v?.symbol) map[k.toUpperCase()] = v;
        }
      }
    }
    return map;
  });

  const [flashes, setFlashes] = useState<Record<string, TickDirection>>({});
  const [feedStatus, setFeedStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Keep latest quotes in ref for tick direction comparison without re-subscribing
  const quotesRef = useRef<Record<string, StockQuote>>(quotes);
  useEffect(() => {
    quotesRef.current = quotes;
  }, [quotes]);

  // Flash timers map to clear ticks cleanly
  const flashTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Sync initialQuotes if prop changes with change detection to avoid render loops
  useEffect(() => {
    if (!initialQuotes) return;

    setQuotes(prev => {
      let hasChanges = false;
      const updated = { ...prev };
      const items = Array.isArray(initialQuotes) ? initialQuotes : Object.values(initialQuotes);

      for (const q of items) {
        if (!q?.symbol) continue;
        const sym = q.symbol.toUpperCase();
        const existing = prev[sym];

        // Only update if symbol was missing or price/timestamp genuinely differed
        if (!existing || existing.currentPrice !== q.currentPrice || existing.lastUpdated !== q.lastUpdated) {
          updated[sym] = q;
          hasChanges = true;
        }
      }

      // If nothing actually changed, return prev to preserve referential equality and avoid re-rendering
      return hasChanges ? updated : prev;
    });
  }, [initialQuotes]);

  // Connect to SSE stream
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const symbolsParam = symbols.length > 0 ? symbols.map(s => s.trim().toUpperCase()).join(',') : '';
    const url = symbolsParam ? `/api/quotes/stream?symbols=${encodeURIComponent(symbolsParam)}` : '/api/quotes/stream';

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.addEventListener('status', (e: MessageEvent) => {
        try {
          const status = JSON.parse(e.data);
          setFeedStatus(status);
        } catch {}
      });

      eventSource.addEventListener('quote', (e: MessageEvent) => {
        try {
          const newQuote: StockQuote = JSON.parse(e.data);
          const sym = newQuote.symbol.toUpperCase();
          const prevQuote = quotesRef.current[sym];

          if (prevQuote && prevQuote.currentPrice !== newQuote.currentPrice) {
            const dir: TickDirection = newQuote.currentPrice > prevQuote.currentPrice ? 'up' : 'down';

            // Set flash state
            setFlashes(prev => ({ ...prev, [sym]: dir }));

            // Clear previous timer for this symbol
            if (flashTimersRef.current[sym]) {
              clearTimeout(flashTimersRef.current[sym]);
            }

            // Reset flash after 1200ms
            flashTimersRef.current[sym] = setTimeout(() => {
              setFlashes(prev => {
                const next = { ...prev };
                delete next[sym];
                return next;
              });
            }, 1200);
          }

          setQuotes(prev => {
            const existing = prev[sym];
            if (
              existing &&
              existing.currentPrice === newQuote.currentPrice &&
              existing.lastUpdated === newQuote.lastUpdated &&
              existing.volume === newQuote.volume &&
              existing.freshness === newQuote.freshness
            ) {
              return prev;
            }
            return {
              ...prev,
              [sym]: newQuote,
            };
          });
        } catch {}
      });

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.warn('[useLiveQuotes] Failed to establish EventSource stream:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      // Clear all flash timers
      Object.values(flashTimersRef.current).forEach(t => clearTimeout(t));
      flashTimersRef.current = {};
    };
  }, [symbols.join(','), enabled]);

  const getQuote = useCallback(
    (symbol: string): StockQuote | undefined => {
      return quotes[symbol.toUpperCase()];
    },
    [quotes]
  );

  const getFlash = useCallback(
    (symbol: string): TickDirection => {
      return flashes[symbol.toUpperCase()] || null;
    },
    [flashes]
  );

  const getFlashClass = useCallback(
    (symbol: string): string => {
      const dir = flashes[symbol.toUpperCase()];
      if (dir === 'up') {
        return 'bg-emerald-500/25 text-emerald-400 transition-colors duration-500 rounded px-1';
      }
      if (dir === 'down') {
        return 'bg-rose-500/25 text-rose-400 transition-colors duration-500 rounded px-1';
      }
      return 'transition-colors duration-500';
    },
    [flashes]
  );

  return {
    quotes,
    getQuote,
    getFlash,
    getFlashClass,
    feedStatus,
    isConnected,
  };
}
