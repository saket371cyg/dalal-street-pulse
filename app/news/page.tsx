'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FinancialNewsItem } from '@/types';
import { VERIFIED_INDIAN_NEWS } from '@/lib/market-data/dataset';

export default function MarketNewsPage() {
  const [news, setNews] = useState<FinancialNewsItem[]>(VERIFIED_INDIAN_NEWS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLiveNews = async () => {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.news && Array.isArray(data.news) && data.news.length > 0) {
        setNews(data.news);
      }
    } catch (e) {
      console.warn('Failed to fetch live news, using verified seed news:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLiveNews();
    const interval = setInterval(loadLiveNews, 300000); // auto-refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadLiveNews();
  };

  const categories = ['ALL', 'Policy', 'Earnings', 'Macro', 'Corporate', 'Banking'] as const;

  const filteredNews = selectedCategory === 'ALL'
    ? news
    : news.filter(n => n.category === selectedCategory);

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Indian Financial News & Disclosures
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time verified Indian financial media covering RBI policy, corporate earnings, SEBI circulars & domestic markets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Financial Feed (IST)
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="xs"
            onClick={() => setSelectedCategory(cat)}
            className="text-xs"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* News List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && news.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/60 bg-card/60 p-5 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted/60 rounded" />
              </div>
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-12 w-full bg-muted/40 rounded" />
              <div className="h-3 w-20 bg-muted/50 rounded" />
            </Card>
          ))
        ) : filteredNews.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-lg">
            No news articles found for this category.
          </div>
        ) : (
          filteredNews.map(item => {
            const isBullish = item.sentiment === 'bullish';
            const isBearish = item.sentiment === 'bearish';

            return (
              <Card key={item.id} className="border-border/60 bg-card/70 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{item.source}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.category}</Badge>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono gap-1 ${
                        isBullish
                          ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                          : isBearish
                          ? 'border-rose-500/30 text-rose-500 bg-rose-500/10'
                          : 'border-border text-muted-foreground bg-muted/40'
                      }`}
                    >
                      {isBullish ? <TrendingUp className="h-2.5 w-2.5" /> : isBearish ? <TrendingDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                      {item.sentiment.toUpperCase()}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-foreground leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.summary}
                  </p>

                  {item.relatedSymbols.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground">Tickers:</span>
                      {item.relatedSymbols.map(sym => (
                        <Link key={sym} href={`/stocks/${sym}`}>
                          <Badge variant="secondary" className="text-[10px] font-mono hover:bg-primary/20 hover:text-primary transition-colors">
                            {sym}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>

                <div className="px-5 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono tabular-nums">{item.publishedAt}</span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Source Link <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
