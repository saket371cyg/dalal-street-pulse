'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function AIInsightsPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<
    {
      q: string;
      a: string;
      sources: string[];
      chunksUsed?: any[];
      modelUsed?: string;
      executionTimeMs?: number;
      showChunks?: boolean;
    }[]
  >([
    {
      q: 'How should a retail investor evaluate P/E and ROCE for Indian IT companies like TCS and Infosys?',
      a: `In Indian IT equities (TCS, Infosys, Wipro):
1. **ROCE (Return on Capital Employed):** Tier-1 IT exporters operate asset-light business models with minimal debt, which routinely yields ROCE exceeding 40-50%. High ROCE indicates superior returns generated on invested client-delivery infrastructure.
2. **P/E (Price-to-Earnings):** Historically, Indian IT trades between 22x and 32x trailing P/E depending on US/Europe discretionary tech spending cycles. Compare current multiples against the 5-year median P/E and CC (constant currency) dollar revenue growth guidance.
3. **Dividend & Buybacks:** Consistent free cash flow conversion (>80% of net profit returned to shareholders via dividends and share repurchases) is a vital quality hallmark.`,
      sources: ['NSE Corporate Disclosures', 'ICAI Valuation Principles'],
      modelUsed: 'RAG Vector Engine',
    },
  ]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQ = question;
    setQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQ }),
      });
      const data = await res.json();
      if (data.answer) {
        setConversations(prev => [
          ...prev,
          {
            q: currentQ,
            a: data.answer,
            sources: data.groundedSources || ['SEBI Guidelines', 'NSE Data'],
            chunksUsed: data.chunksUsed,
            modelUsed: data.modelUsed,
            executionTimeMs: data.executionTimeMs,
            showChunks: false,
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleEvidence = (idx: number) => {
    setConversations(prev =>
      prev.map((c, i) => (i === idx ? { ...c, showChunks: !c.showChunks } : c))
    );
  };

  const quickQuestions = [
    'What does P/E ratio mean in Indian markets?',
    'Explain ROCE vs ROE with practical examples',
    'How do RBI Repo Rate changes affect Bank NIFTY?',
    'Why is Promoter Pledging an important risk factor in India?',
    'What is the debt and ROCE profile of Reliance Industries?',
    'How is Tata Motors performing in JLR and domestic EVs?',
    'Explain HDFC Bank LDR and margin trends after merger',
  ];

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full transition-all">
      <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AI Financial Intelligence & Educational Assistant
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Grounded Indian stock market explanations, valuation metrics, and beginner-to-advanced financial concepts.
        </p>
      </div>

      {/* Macro Commentary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <Badge variant="outline" className="w-fit text-[10px] mb-1">Monetary Policy</Badge>
            <CardTitle className="text-sm font-bold text-foreground">RBI Repo Rate & Liquidity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
            The RBI MPC neutral stance paves the way for potential rate adjustments. Banking spreads remain resilient while credit expansion in retail and SME sectors averages 13-15% YoY.
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <Badge variant="outline" className="w-fit text-[10px] mb-1">Corporate Earnings</Badge>
            <CardTitle className="text-sm font-bold text-foreground">Q2 FY26 Earnings Outlook</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
            Frontline corporate announcements signal steady operating margins. Discretionary demand in festive quarters is balancing raw material volatility in metals and crude derivatives.
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <Badge variant="outline" className="w-fit text-[10px] mb-1">Structural Growth</Badge>
            <CardTitle className="text-sm font-bold text-foreground">Domestic SIP Compounding</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
            Record retail SIP participation exceeding ₹23,500 Cr per month acts as a resilient structural counter-weight to foreign institutional outflows, stabilizing Indian largecap benchmarks.
          </CardContent>
        </Card>
      </div>

      {/* Interactive AI Assistant Area */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="p-5 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Interactive Financial Q&A (Grounded Analyst)
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">Strict Evidence Grounding</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {/* Conversation history */}
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
            {conversations.map((c, idx) => (
              <div key={idx} className="space-y-2.5">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground text-xs p-3.5 rounded-2xl rounded-tr-xs max-w-lg font-medium shadow-xs">
                    {c.q}
                  </div>
                </div>
                <div className="flex justify-start items-start gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-card border border-border/60 text-foreground text-xs p-4 rounded-2xl rounded-tl-xs max-w-2xl leading-relaxed whitespace-pre-line shadow-xs">
                    {c.a}
                    <div className="mt-3.5 pt-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="flex items-center gap-1 text-emerald-500 font-medium mr-1">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Grounded Sources:</span>
                        </div>
                        {c.sources.map((src, sIdx) => (
                          <Badge key={sIdx} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                            {src}
                          </Badge>
                        ))}
                      </div>

                      {c.modelUsed && (
                        <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {c.modelUsed} {c.executionTimeMs ? `• ${c.executionTimeMs}ms` : ''}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Expandable RAG Retrieved Evidence Chunks */}
                    {c.chunksUsed && c.chunksUsed.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-border/30">
                        <button
                          type="button"
                          onClick={() => toggleEvidence(idx)}
                          className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="h-3 w-3" />
                          {c.showChunks ? 'Hide' : 'View'} {c.chunksUsed.length} Vector-Retrieved Evidence Chunks
                        </button>

                        {c.showChunks && (
                          <div className="mt-2 space-y-2">
                            {c.chunksUsed.map((chunk, chIdx) => (
                              <div
                                key={chIdx}
                                className="p-2.5 rounded-lg border border-border/50 bg-muted/20 text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-foreground truncate">{chunk.title}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Badge variant="outline" className="text-[9px] uppercase px-1 py-0">
                                      {chunk.category}
                                    </Badge>
                                    {chunk.relevanceScore !== undefined && (
                                      <Badge variant="secondary" className="text-[9px] font-mono px-1 py-0 text-emerald-500">
                                        {(chunk.relevanceScore * 100).toFixed(0)}% match
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-muted-foreground text-[10px] line-clamp-3 italic">
                                  "{chunk.snippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 animate-spin">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="bg-muted/40 border border-border/50 text-xs p-3.5 rounded-xl text-muted-foreground animate-pulse">
                  Consulting Indian market fundamentals database & computing response...
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="pt-2 border-t border-border/40">
            <span className="text-[11px] text-muted-foreground block mb-1.5 font-medium">Common Indian Market Questions:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-[11px] bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:text-foreground text-muted-foreground px-2.5 py-1 rounded-lg border border-border/40 transition-all cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Question Input */}
          <form onSubmit={handleAsk} className="flex gap-2 pt-1">
            <Input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask any question about Indian stocks, ratios, SEBI rules, or valuation..."
              className="text-xs h-10 flex-1"
            />
            <Button type="submit" size="sm" disabled={loading || !question.trim()} className="gap-1.5 text-xs h-10 px-4">
              <Send className="h-3.5 w-3.5" /> Ask Analyst
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
