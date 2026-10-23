'use client';

import React, { useState } from 'react';
import { RAGAskResponse, CredibilityScoreResult, CredibilityFactor } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Scale,
  Sparkles,
} from 'lucide-react';

interface AIAnalystResponseProps {
  data: RAGAskResponse;
  compact?: boolean;
  className?: string;
}

export function AIAnalystResponse({ data, compact = false, className = '' }: AIAnalystResponseProps) {
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [showChunks, setShowChunks] = useState(false);

  const {
    answer,
    conclusion,
    supportingEvidence = [],
    caveat,
    detailedAnalysis,
    credibility,
    questionType,
    stockSymbol,
    groundedSources = [],
    chunksUsed = [],
    modelUsed,
    executionTimeMs,
  } = data;

  // Determine display values
  const displayConclusion = conclusion || (answer ? answer.split('\n\n')[0].replace(/^\*\*|\*\*$/g, '') : '');
  const displayEvidence =
    supportingEvidence.length > 0
      ? supportingEvidence
      : answer
      ? answer
          .split('\n')
          .filter(l => l.startsWith('- ') || l.startsWith('* '))
          .map(l => l.replace(/^[-*]\s*/, ''))
      : [];

  const displayCaveat =
    caveat ||
    (answer && answer.includes('**Caveat:**')
      ? answer.split('**Caveat:**')[1]?.trim()
      : undefined);

  // Credibility Rating styling
  const getRatingBadge = (rating?: CredibilityScoreResult['rating']) => {
    switch (rating) {
      case 'High':
        return {
          variant: 'default' as const,
          className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 font-semibold',
          barColor: 'bg-emerald-500',
        };
      case 'Moderate':
        return {
          variant: 'secondary' as const,
          className: 'bg-amber-500/15 text-amber-500 border-amber-500/30 font-semibold',
          barColor: 'bg-amber-500',
        };
      case 'Low':
        return {
          variant: 'destructive' as const,
          className: 'bg-rose-500/15 text-rose-500 border-rose-500/30 font-semibold',
          barColor: 'bg-rose-500',
        };
      case 'Not Scored':
        return {
          variant: 'outline' as const,
          className: 'bg-muted/40 text-muted-foreground border-border font-normal',
          barColor: 'bg-muted-foreground/40',
        };
      case 'Unavailable':
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-muted/40 text-muted-foreground border-border font-normal',
          barColor: 'bg-muted-foreground/30',
        };
    }
  };

  const ratingStyle = getRatingBadge(credibility?.rating);

  const getQuestionTypeBadge = (type?: string) => {
    switch (type) {
      case 'BULLISH_BEARISH':
        return { label: 'Directional Bias', icon: TrendingUp };
      case 'WHY_MOVED':
        return { label: 'Price Catalyst', icon: Sparkles };
      case 'TECHNICAL':
        return { label: 'Technical Study', icon: TrendingUp };
      case 'FUNDAMENTAL':
        return { label: 'Fundamental Health', icon: Scale };
      case 'COMPARISON':
        return { label: 'Stock Comparison', icon: Scale };
      case 'FORECAST':
        return { label: 'Risk Envelope', icon: AlertTriangle };
      case 'EDUCATIONAL':
        return { label: 'Financial Concept', icon: BookOpen };
      case 'FACTUAL':
      default:
        return { label: 'Verified Market Fact', icon: CheckCircle2 };
    }
  };

  const typeMeta = getQuestionTypeBadge(questionType);
  const TypeIcon = typeMeta.icon;

  return (
    <div
      className={`rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm ${compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3.5'} text-xs text-foreground shadow-xs transition-all ${className}`}
      data-testid="ai-analyst-response"
    >
      {/* 1. Direct Conclusion Header (Prominent & Scannable) */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 inline-flex items-center gap-1 bg-background/50 border-primary/30 text-primary"
          >
            <TypeIcon className="h-3 w-3" />
            <span>{typeMeta.label}</span>
            {stockSymbol && <span className="text-muted-foreground font-normal">• {stockSymbol}</span>}
          </Badge>

          {credibility && credibility.rating && (
            <Badge variant={ratingStyle.variant} className={`text-[10px] px-2 py-0.2 font-mono ${ratingStyle.className}`}>
              <ShieldCheck className="h-3 w-3 mr-1 inline" />
              {credibility.score !== null ? `Credibility: ${credibility.score}%` : credibility.rating}
            </Badge>
          )}
        </div>

        {/* The first sentence / Direct conclusion */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm font-semibold text-foreground leading-snug">
          {displayConclusion.replace(/^\*\*|\*\*$/g, '')}
        </div>
      </div>

      {/* 2. Supporting Evidence (Up to 3 concise bullet points) */}
      {displayEvidence.length > 0 && (
        <div className="space-y-1.5 pt-0.5">
          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
            Supporting Evidence:
          </span>
          <ul className="space-y-1.5 pl-1">
            {displayEvidence.slice(0, 3).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Main Risk or Invalidation Caveat */}
      {displayCaveat && (
        <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11px] text-foreground/90">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-600 dark:text-amber-400">Primary Caveat: </span>
            <span className="text-muted-foreground">{displayCaveat}</span>
          </div>
        </div>
      )}

      {/* 4. Deterministic Credibility Indicator (Immediately beneath the answer) */}
      <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-semibold text-xs text-foreground">Evidence Credibility:</span>
            <span className="font-mono font-bold text-xs text-foreground">
              {credibility?.score !== null && credibility?.score !== undefined
                ? `${credibility.score}%`
                : credibility?.rating || 'Not Scored'}
            </span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${ratingStyle.className}`}>
              {credibility?.rating || 'Unrated'}
            </Badge>
          </div>

          <button
            type="button"
            onClick={() => setShowScoreDetails(prev => !prev)}
            className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            aria-expanded={showScoreDetails}
          >
            <HelpCircle className="h-3 w-3" />
            <span>Why this score?</span>
            {showScoreDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Progress bar */}
        {credibility && credibility.score !== null && (
          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${ratingStyle.barColor}`}
              style={{ width: `${Math.max(5, Math.min(100, credibility.score))}%` }}
            />
          </div>
        )}

        {/* Mandatory Probability vs Evidence Distinction Disclaimer */}
        <p className="text-[10px] text-muted-foreground italic leading-normal">
          {credibility?.disclaimer ||
            'Credibility measures the quality, completeness, and verification of the underlying market evidence, not the certainty of the market outlook or future stock performance.'}
        </p>

        {/* Expandable "Why this score?" breakdown */}
        {showScoreDetails && credibility && (
          <div className="mt-2.5 pt-2.5 border-t border-border/40 space-y-2.5 animate-in fade-in-50 duration-200">
            <p className="text-[11px] text-foreground font-medium">{credibility.explanation}</p>

            {credibility.factors && credibility.factors.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {credibility.factors.map((factor: CredibilityFactor, fIdx: number) => {
                  const statusColor =
                    factor.status === 'good'
                      ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
                      : factor.status === 'warning'
                      ? 'text-amber-500 border-amber-500/20 bg-amber-500/5'
                      : 'text-rose-500 border-rose-500/20 bg-rose-500/5';

                  return (
                    <div
                      key={fIdx}
                      className={`p-2 rounded-md border text-[10px] space-y-1 ${statusColor}`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span>{factor.name}</span>
                        <span className="font-mono">{factor.score}/100 ({factor.weight}%)</span>
                      </div>
                      <p className="text-muted-foreground leading-tight text-[9px]">{factor.details}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {credibility.limitations && credibility.limitations.length > 0 && (
              <div className="p-2 rounded-md bg-muted/40 border border-border/40 text-[10px] text-muted-foreground space-y-0.5">
                <span className="font-semibold text-foreground block">Observed Limitations:</span>
                <ul className="list-disc pl-3.5 space-y-0.5">
                  {credibility.limitations.map((lim: string, lIdx: number) => (
                    <li key={lIdx}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Optional "View detailed analysis" (Pivots, Moving Averages, Quarterly Statements) */}
      {detailedAnalysis && (
        <div className="pt-1 border-t border-border/40">
          <button
            type="button"
            onClick={() => setShowDetailedAnalysis(prev => !prev)}
            className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1.5 cursor-pointer py-1"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>
              {showDetailedAnalysis ? 'Hide' : 'View'} detailed quantitative analysis (pivots, technical indicators & disclosures)
            </span>
            {showDetailedAnalysis ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showDetailedAnalysis && (
            <div className="mt-2 p-3.5 rounded-lg border border-border/60 bg-muted/20 text-xs font-mono leading-relaxed whitespace-pre-line text-muted-foreground max-h-96 overflow-y-auto">
              {detailedAnalysis}
            </div>
          )}
        </div>
      )}

      {/* 6. Grounded Sources & Execution Metadata */}
      <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        {groundedSources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-emerald-500 font-semibold flex items-center gap-1 mr-1">
              <ShieldCheck className="h-3 w-3" /> Verified Sources:
            </span>
            {groundedSources.map((src, idx) => (
              <Badge key={idx} variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                {src}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto text-[9px] font-mono text-muted-foreground">
          {modelUsed && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {modelUsed}
            </Badge>
          )}
          {executionTimeMs ? <span>{executionTimeMs}ms</span> : null}
        </div>
      </div>

      {/* 7. Vector Chunks Used (if RAG retrieved disclosures are present) */}
      {chunksUsed.length > 0 && (
        <div className="pt-1 border-t border-border/30">
          <button
            type="button"
            onClick={() => setShowChunks(prev => !prev)}
            className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="h-3 w-3" />
            <span>
              {showChunks ? 'Hide' : 'View'} {chunksUsed.length} retrieved regulatory filings & news items
            </span>
          </button>

          {showChunks && (
            <div className="mt-2 space-y-1.5">
              {chunksUsed.map((chunk, cIdx) => (
                <div key={cIdx} className="p-2 rounded border border-border/40 bg-muted/10 text-[10px] space-y-0.5">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>{chunk.title}</span>
                    <Badge variant="outline" className="text-[8px] uppercase">
                      {chunk.category}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground italic line-clamp-2">"{chunk.snippet}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
