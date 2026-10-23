'use client';

import React from 'react';
import { CompanyFundamentals } from '@/types';
import { formatCrores, formatINR } from '@/lib/utils/indian-market';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Info, ShieldCheck, PieChart } from 'lucide-react';

interface FundamentalsGridProps {
  fundamentals: CompanyFundamentals;
}

export function FundamentalsGrid({ fundamentals }: FundamentalsGridProps) {
  const hasMarketCap = fundamentals.marketCapCrores > 0;
  const hasPE = fundamentals.peRatio > 0;
  const hasPB = fundamentals.pbRatio > 0;
  const hasEPS = fundamentals.eps !== undefined && fundamentals.eps !== null;
  const hasBookValue = fundamentals.bookValuePerShare > 0;
  const hasROE = fundamentals.roe !== undefined && fundamentals.roe !== null && fundamentals.roe !== 0;
  const hasROCE = fundamentals.roce !== undefined && fundamentals.roce !== null && fundamentals.roce !== 0;
  const hasDebtToEquity = fundamentals.debtToEquity !== undefined && fundamentals.debtToEquity !== null;

  // Enterprise Value approximation: Market Cap + Estimated Net Debt (DebtToEquity * Equity)
  const estimatedDebt = hasMarketCap && hasDebtToEquity && fundamentals.debtToEquity > 0
    ? fundamentals.marketCapCrores * (fundamentals.debtToEquity / (1 + fundamentals.debtToEquity))
    : 0;
  const enterpriseValueCrores = hasMarketCap ? fundamentals.marketCapCrores + estimatedDebt : 0;

  const metrics = [
    {
      label: 'Market Cap',
      value: hasMarketCap ? formatCrores(fundamentals.marketCapCrores) : '—',
      hint: 'Total aggregate valuation of all outstanding shares listed on the exchange.',
      status: hasMarketCap ? 'normal' : 'unavailable',
    },
    {
      label: 'Enterprise Value (EV)',
      value: enterpriseValueCrores > 0 ? formatCrores(enterpriseValueCrores) : '—',
      hint: 'Theoretical takeover price: Market Capitalization + Total Debt - Cash balances.',
      status: enterpriseValueCrores > 0 ? 'normal' : 'unavailable',
    },
    {
      label: 'P/E Ratio (TTM)',
      value: hasPE ? `${fundamentals.peRatio.toFixed(1)}x` : '— (N/A: Deficit)',
      hint: hasPE
        ? `Trailing 12-month Price to Earnings multiple. Benchmark Industry P/E: ${fundamentals.industryPE > 0 ? `${fundamentals.industryPE.toFixed(1)}x` : 'Unassigned'}`
        : 'Net profit over the past four quarters is negative or unsupplied.',
      status: hasPE ? 'normal' : 'unavailable',
    },
    {
      label: 'Price-to-Book (P/B)',
      value: hasPB ? `${fundamentals.pbRatio.toFixed(2)}x` : '—',
      hint: hasBookValue
        ? `Ratio of stock price to book value per share (₹${fundamentals.bookValuePerShare.toFixed(2)}).`
        : 'Balance sheet equity not filed or unsupplied.',
      status: hasPB ? 'normal' : 'unavailable',
    },
    {
      label: 'EPS (TTM)',
      value: hasEPS ? formatINR(fundamentals.eps) : '—',
      hint: 'Earnings per share over the past four reported quarters.',
      status: hasEPS ? 'normal' : 'unavailable',
    },
    {
      label: 'Dividend Yield',
      value: fundamentals.dividendYield > 0 ? `${fundamentals.dividendYield.toFixed(2)}%` : '0.00%',
      hint: fundamentals.dividendYield > 0
        ? 'Annual dividend payout expressed as a percentage of current market price.'
        : 'No dividend declared or dividend yield is zero for this financial cycle.',
      status: 'normal',
    },
    {
      label: 'Return on Equity (ROE)',
      value: hasROE ? `${fundamentals.roe.toFixed(1)}%` : '—',
      hint: 'Net income generated as a percentage of shareholder equity.',
      status: hasROE ? 'normal' : 'unavailable',
    },
    {
      label: 'ROCE',
      value: hasROCE ? `${fundamentals.roce.toFixed(1)}%` : '—',
      hint: 'Return on Capital Employed (EBIT divided by total capital employed).',
      status: hasROCE ? 'normal' : 'unavailable',
    },
    {
      label: 'Debt to Equity',
      value: hasDebtToEquity ? fundamentals.debtToEquity.toFixed(2) : '—',
      hint: hasDebtToEquity
        ? fundamentals.debtToEquity < 0.5
          ? 'Conservative leverage ratio (< 0.5).'
          : 'High leverage balance sheet structure.'
        : 'Debt disclosures unsupplied for this counter.',
      status: hasDebtToEquity ? 'normal' : 'unavailable',
    },
    {
      label: 'Book Value / Share',
      value: hasBookValue ? formatINR(fundamentals.bookValuePerShare) : '—',
      hint: 'Net asset value per share according to official balance sheet filing.',
      status: hasBookValue ? 'normal' : 'unavailable',
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {metrics.map(m => (
            <div
              key={m.label}
              className="p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{m.label}</span>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/60 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[11px] max-w-xs">
                    {m.hint}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div
                className={`text-lg font-bold font-mono mt-1 tracking-tight ${
                  m.status === 'unavailable' ? 'text-muted-foreground text-sm font-normal' : 'text-foreground'
                }`}
              >
                {m.value}
              </div>

              <div className="text-[10px] text-muted-foreground/80 mt-1 truncate" title={m.hint}>
                {m.hint}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function ShareholdingChart({ fundamentals }: { fundamentals: CompanyFundamentals }) {
  const hasData =
    (fundamentals.promoterHoldingPercent || 0) > 0 ||
    (fundamentals.fiiHoldingPercent || 0) > 0 ||
    (fundamentals.diiHoldingPercent || 0) > 0 ||
    (fundamentals.publicHoldingPercent || 0) > 0;

  if (!hasData) {
    return (
      <div className="p-4 rounded-xl border border-border/60 bg-card/60 flex flex-col items-center justify-center text-center p-8">
        <PieChart className="h-6 w-6 text-muted-foreground mb-2" />
        <h4 className="text-xs font-semibold text-foreground">Shareholding Disclosures Unsupplied</h4>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
          Regulatory shareholding pattern filings are currently unsupplied by the public feed for this counter.
        </p>
      </div>
    );
  }

  const holdings = [
    { label: 'Promoter', pct: fundamentals.promoterHoldingPercent || 0, color: 'bg-blue-500' },
    { label: 'FII (Foreign)', pct: fundamentals.fiiHoldingPercent || 0, color: 'bg-emerald-500' },
    { label: 'DII (Domestic)', pct: fundamentals.diiHoldingPercent || 0, color: 'bg-amber-500' },
    { label: 'Public & Others', pct: fundamentals.publicHoldingPercent || 0, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-4 rounded-xl border border-border/60 bg-card/60">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <PieChart className="h-3.5 w-3.5 text-primary" />
          Shareholding Pattern (Official Exchange Disclosures)
        </h4>
        <span className="text-[11px] text-muted-foreground font-mono">Q3 FY26 Filing</span>
      </div>

      {/* Progress stack */}
      <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted/60 mb-4">
        {holdings.map(h => (
          <div
            key={h.label}
            style={{ width: `${Math.max(0, h.pct)}%` }}
            className={`h-full ${h.color}`}
            title={`${h.label}: ${h.pct.toFixed(2)}%`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {holdings.map(h => (
          <div key={h.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${h.color} shrink-0`} />
            <div>
              <div className="text-[11px] text-muted-foreground">{h.label}</div>
              <div className="text-xs font-bold font-mono text-foreground">{h.pct.toFixed(2)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
