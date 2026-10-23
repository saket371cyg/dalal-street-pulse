'use client';

import React from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border/60 bg-card/30 mt-auto text-xs text-muted-foreground">
      <div className="max-w-7xl 2xl:max-w-[1680px] mx-auto px-4 sm:px-6 2xl:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Column 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <div className="h-6 w-6 rounded-full bg-neutral-900 border border-neutral-700/70 flex items-center justify-center text-foreground font-bold text-xs shadow-xs">
                ₹
              </div>
              <span className="font-serif text-sm tracking-tight">Dalal Street Pulse</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-border/80 text-muted-foreground bg-muted/40">
                IN Financial Intel
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground/90 max-w-md">
              High-fidelity Indian equity analytics engine powered by unified NSE & BSE market feeds.
              Grounded artificial intelligence, historical candlestick charting, company fundamentals, and automated session briefings.
            </p>
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 text-[10px] leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-3 w-3 text-primary shrink-0" />
                <span>Regulatory Disclosure & Disclaimer</span>
              </div>
              <p className="text-muted-foreground">
                For financial intelligence, research and educational use only. Not SEBI registered investment advice.
                Standard 15-minute exchange delay applies to public quote streams unless real-time entitlements are configured.
              </p>
            </div>
          </div>

          {/* Column 3: Markets & Stocks */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Market Discovery
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/markets" className="hover:text-foreground transition-colors">
                  NSE & BSE Indices
                </Link>
              </li>
              <li>
                <Link href="/stocks" className="hover:text-foreground transition-colors">
                  Explore Stock Universe
                </Link>
              </li>
              <li>
                <Link href="/stocks?segment=MAIN" className="hover:text-foreground transition-colors">
                  Mainboard Capital
                </Link>
              </li>
              <li>
                <Link href="/stocks?segment=SME" className="hover:text-foreground transition-colors">
                  SME Emerge Platform
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Intelligence & Analytics */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Research & Intel
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/briefing" className="hover:text-foreground transition-colors">
                  Daily Market Briefing
                </Link>
              </li>
              <li>
                <Link href="/insights" className="hover:text-foreground transition-colors">
                  AI Financial Analyst
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-foreground transition-colors">
                  Regulatory News & MCA Filings
                </Link>
              </li>
              <li>
                <Link href="/alerts" className="hover:text-foreground transition-colors">
                  Price Alerts Engine
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Platform & System */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              System & Operations
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/watchlists" className="hover:text-foreground transition-colors">
                  Portfolio Watchlists
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-foreground transition-colors">
                  Preferences & Exchange
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-foreground transition-colors">
                  Security Master Sync
                </Link>
              </li>
              <li className="pt-1">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  All Feeds Operational (IST)
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>© 2026 Dalal Street Pulse. All rights reserved.</span>
            <span>•</span>
            <span className="font-mono">Timezone: Asia/Kolkata (IST)</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-muted-foreground font-mono">NSE / BSE Certified Snapshot</span>
            <span>•</span>
            <Link href="/settings" className="hover:text-foreground transition-colors">
              Platform Settings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
