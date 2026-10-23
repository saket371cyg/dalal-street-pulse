'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  RefreshCw,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DailyMarketBriefing } from '@/types';
import { formatPercent } from '@/lib/utils/indian-market';

export default function DailyBriefingPage() {
  const [briefing, setBriefing] = useState<DailyMarketBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadBriefing = async () => {
    try {
      const res = await fetch('/api/briefing');
      const data = await res.json();
      if (data.briefing) setBriefing(data.briefing);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefing();
  }, []);

  const handleManualGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/briefing', { method: 'POST' });
      const data = await res.json();
      if (data.briefing) setBriefing(data.briefing);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 max-w-4xl mx-auto w-full animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <Card className="border-border/60 bg-card/60 p-6 space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-muted/60 rounded" />
            <div className="h-7 w-3/4 bg-muted rounded" />
          </div>
          <div className="h-24 bg-muted/30 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-28 bg-muted/20 rounded-xl" />
            <div className="h-28 bg-muted/20 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-14 bg-muted/20 rounded-lg" />
            <div className="h-14 bg-muted/20 rounded-lg" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Daily Indian Market Briefing
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated intelligence report generated after market close (16:30 IST) powered by Inngest workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualGenerate}
            disabled={generating}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Synthesizing...' : 'Generate Fresh Briefing'}
          </Button>

          <Link href="/settings">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
              <Mail className="h-3.5 w-3.5 text-primary" /> Email Delivery
            </Button>
          </Link>
        </div>
      </div>

      {briefing ? (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-6 pb-4 border-b border-border/40 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono tabular-nums">{briefing.date} (Asia/Kolkata)</span>
              <span>•</span>
              <Badge variant="outline" className="text-[10px]">NSE & BSE Synthesis</Badge>
            </div>
            <CardTitle className="text-xl font-bold text-foreground leading-snug">
              {briefing.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Executive Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Executive Market Summary
              </h3>
              <p className="text-xs leading-relaxed text-foreground/90 bg-muted/20 p-4 rounded-xl border border-border/40">
                {briefing.executiveSummary}
              </p>
            </div>

            {/* Benchmark Catalysts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border/40 bg-card/40 space-y-1.5">
                <span className="text-xs font-bold text-emerald-400">NIFTY 50 Movement Drivers</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{briefing.niftyMoveReason}</p>
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-card/40 space-y-1.5">
                <span className="text-xs font-bold text-blue-400">SENSEX Movement Drivers</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{briefing.sensexMoveReason}</p>
              </div>
            </div>

            {/* Top Sectors in Focus */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Top Sectoral Rotations
              </h3>
              <div className="space-y-2">
                {briefing.topSectors.map((sec, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-foreground">{sec.sector}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{sec.commentary}</p>
                    </div>
                    <Badge variant={sec.change >= 0 ? 'default' : 'destructive'} className="font-mono tabular-nums text-xs w-fit">
                      {formatPercent(sec.change)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Stories Grounded */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Key Economic & Corporate Developments
              </h3>
              <div className="space-y-2.5">
                {briefing.keyStories.map((story, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-border/40 bg-card/40 space-y-1">
                    <h4 className="text-xs font-bold text-foreground">{story.headline}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{story.impact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Upcoming Catalysts & Economic Calendar
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {briefing.upcomingEvents.map((ev, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sources */}
            <div className="pt-4 border-t border-border/40 flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Grounded Citations: {briefing.sources.join(' • ')}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No briefing available yet. Click "Generate Fresh Briefing" above.
        </div>
      )}
    </div>
  );
}
