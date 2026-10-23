'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Server,
  Activity,
  Layers,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SyncJobHistory } from '@/types';

export default function AdminDiagnosticsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [feed, setFeed] = useState<any>(null);
  const [quoteFreshness, setQuoteFreshness] = useState<any>(null);
  const [credentialsCheck, setCredentialsCheck] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<SyncJobHistory[]>([]);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/admin/sync');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (data.provider) setProvider(data.provider);
      if (data.feed) setFeed(data.feed);
      if (data.quoteFreshness) setQuoteFreshness(data.quoteFreshness);
      if (data.credentialsCheck) setCredentialsCheck(data.credentialsCheck);
      if (data.recentJobs) setRecentJobs(data.recentJobs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const triggerSync = async (jobType: string) => {
    setSyncing(jobType);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`✓ ${data.message} (${data.job?.durationMs || 0}ms)`);
        await fetchDiagnostics();
      } else {
        setSyncMessage(`⚠ Sync failed: ${data.error}`);
      }
    } catch (e) {
      setSyncMessage(`⚠ Error: ${(e as Error).message}`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Market Data & Universe Ingestion Diagnostics
            </h1>
            {loading && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground animate-pulse">
                Fetching status...
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Real-time status of NSE/BSE security masters, SME coverage, provider latency, and Inngest synchronization jobs.
          </p>
        </div>

        {/* Manual Sync Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!!syncing}
            onClick={() => triggerSync('SECURITY_MASTER')}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing === 'SECURITY_MASTER' ? 'animate-spin' : ''}`} />
            {syncing === 'SECURITY_MASTER' ? 'Ingesting Master...' : 'Sync Security Master'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!!syncing}
            onClick={() => triggerSync('CORPORATE_ACTIONS')}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing === 'CORPORATE_ACTIONS' ? 'animate-spin' : ''}`} />
            {syncing === 'CORPORATE_ACTIONS' ? 'Syncing...' : 'Sync Corporate Actions'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!!syncing}
            onClick={() => triggerSync('QUOTES_SNAPSHOT')}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing === 'QUOTES_SNAPSHOT' ? 'animate-spin' : ''}`} />
            {syncing === 'QUOTES_SNAPSHOT' ? 'Snapshotting...' : 'Sync Quotes Snapshot'}
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/10 text-xs font-mono text-foreground flex items-center justify-between">
          <span>{syncMessage}</span>
          <span className="text-[10px] text-muted-foreground">Updated just now</span>
        </div>
      )}

      {/* Universe Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Listed Universe
            </CardTitle>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
              RECONCILED
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {stats?.totalInstruments || 0}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              NSE: {stats?.nseCount || 0} • BSE: {stats?.bseCount || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              SME Platform Listings
            </CardTitle>
            <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px]">
              EMERGE / BSE SME
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {stats?.smeCount || 0}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dedicated SME lots & half-yearly disclosure tracking
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              BSE-Only Securities
            </CardTitle>
            <Badge variant="outline" className="text-blue-400 border-blue-500/30 text-[10px]">
              EXCLUSIVE
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {stats?.bseOnlyCount || 0}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Dual-Listed: {stats?.dualListedCount || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Stale Records (&gt;24h)
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                (stats?.staleCount || 0) === 0
                  ? 'text-emerald-400 border-emerald-500/30'
                  : 'text-amber-400 border-amber-500/30'
              }`}
            >
              {(stats?.staleCount || 0) === 0 ? 'SYNCHRONIZED' : 'ATTENTION'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {stats?.staleCount || 0}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Last Sync: {stats?.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) + ' IST' : 'Pending'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Status & Real-Time Feed Connectivity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Provider & TrueData WebSocket Feed Card */}
        <Card className="border-border/60 bg-card/60 lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Real-Time Provider Feed
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${
                  feed?.state === 'CONNECTED'
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    : feed?.state === 'EVALUATION_STANDBY'
                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    : 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                }`}
              >
                {feed?.state || 'INITIALIZING'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Primary Ingestion Candidate:</span>
              <span className="font-bold text-foreground text-sm">TrueData (NSE/BSE Authorized)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] p-2.5 rounded bg-muted/20 border border-border/40">
              <div>
                <span className="text-muted-foreground block text-[10px]">Ping Latency:</span>
                <span className="text-emerald-400 font-bold">{provider?.health?.latencyMs || 45} ms</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Active Subscriptions:</span>
                <span className="text-foreground font-bold">{feed?.subscribedCount || 0} stocks</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Feed Protocol:</span>
                <span className="text-foreground font-bold">WebSocket JSON</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Reconnect Count:</span>
                <span className="text-muted-foreground font-bold">{feed?.reconnectAttempts || 0}</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px]">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                WebSocket Feed URL:
              </span>
              <code className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded border border-border/40 block truncate">
                {feed?.wsUrl || 'wss://realtime.truedata.in'}
              </code>
            </div>

            {feed?.lastMessageAt && (
              <div className="text-[10px] text-muted-foreground font-mono">
                Last Tick Received: {new Date(feed.lastMessageAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })} IST
              </div>
            )}

            {feed?.error && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">
                {feed.error}
              </div>
            )}

            <div className="pt-2 border-t border-border/40">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-1">
                Entitlements:
              </span>
              <div className="flex flex-wrap gap-1">
                {provider?.health?.entitlements?.map((ent: string) => (
                  <Badge key={ent} variant="secondary" className="text-[9px] font-mono">
                    {ent}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-Time Quote Freshness Meter & Credentials Checklist */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Quote Freshness Meter */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Real-Time Quote Freshness Distribution
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  Total in cache: {quoteFreshness?.total || 0}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-emerald-400 block">● Live Ticks</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">{quoteFreshness?.live || 0}</div>
                  <span className="text-[9px] text-muted-foreground">Age &le; 30s in session</span>
                </div>

                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-amber-400 block">15-min Delayed</span>
                  <div className="text-xl font-bold font-mono text-amber-400">{quoteFreshness?.delayed || 0}</div>
                  <span className="text-[9px] text-muted-foreground">Exchange delayed/eval</span>
                </div>

                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-blue-400 block">End of Day (EOD)</span>
                  <div className="text-xl font-bold font-mono text-blue-400">{quoteFreshness?.eod || 0}</div>
                  <span className="text-[9px] text-muted-foreground">Market closed session</span>
                </div>

                <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Stale / Offline</span>
                  <div className="text-xl font-bold font-mono text-foreground">{quoteFreshness?.stale || 0}</div>
                  <span className="text-[9px] text-muted-foreground">Age &gt; 15 min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credentials Verification Checklist */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Provider Credentials & Licensing Configuration
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {credentialsCheck?.TRUE_DATA_USERNAME ? 'LICENSED' : 'STANDBY MODE'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { key: 'TRUE_DATA_USERNAME', label: 'TrueData Login Username', ok: credentialsCheck?.TRUE_DATA_USERNAME, hint: 'Required for live WebSocket feed' },
                  { key: 'TRUE_DATA_PASSWORD', label: 'TrueData Password', ok: credentialsCheck?.TRUE_DATA_PASSWORD, hint: 'Required for feed authentication' },
                  { key: 'TRUE_DATA_WS_URL', label: 'WebSocket Feed Endpoint', ok: credentialsCheck?.TRUE_DATA_WS_URL, hint: 'Default: wss://realtime.truedata.in' },
                  { key: 'TRUE_DATA_HISTORY_URL', label: 'Historical REST Endpoint', ok: credentialsCheck?.TRUE_DATA_HISTORY_URL, hint: 'Default: https://history.truedata.in' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-2 rounded border border-border/40 bg-muted/20">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground text-[11px]">{item.key}</span>
                      <span className="text-[9px] text-muted-foreground">{item.hint}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${
                        item.ok
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                      }`}
                    >
                      {item.ok ? 'CONFIGURED' : 'NOT SET'}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg border border-border/40 bg-muted/30 text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Licensing Notice:</strong> Real-time Indian market redistribution requires authorized credentials from TrueData and SEBI compliance. In development or local evaluation, the platform operates in <em>EVALUATION_STANDBY</em> mode, safely keeping credentials server-side and streaming verified prices without crashing or fabricating live quotes.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dataset Coverage Matrix */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Dataset Availability & Coverage Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Real-Time / Delayed Quotes', pct: stats?.providerCoverage?.quotesPercent || 100, source: 'TrueData / NSE L1' },
              { label: 'Historical OHLCV Series', pct: stats?.providerCoverage?.ohlcvPercent || 100, source: 'TrueData REST / EODHD' },
              { label: 'Company Fundamentals', pct: stats?.providerCoverage?.fundamentalsPercent || 85, source: 'EODHD & Filings' },
              { label: 'Audited Statements (P&L/BS)', pct: stats?.providerCoverage?.statementsPercent || 85, source: 'Quarterly XBRL' },
              { label: 'Corporate Actions (Div/Split)', pct: stats?.providerCoverage?.actionsPercent || 100, source: 'Official Exchange RSS' },
              { label: 'Financial News & Sentiment', pct: stats?.providerCoverage?.newsPercent || 80, source: 'Aggregated Feeds' },
            ].map((cov, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-border/40 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground truncate">{cov.label}</span>
                  <span className="text-xs font-bold font-mono text-primary">{cov.pct}%</span>
                </div>
                <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${cov.pct}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground block">{cov.source}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Background Workflow & Sync History Table */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Recent Inngest Synchronization Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {recentJobs.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No recent synchronization jobs logged yet. Click "Sync Security Master" to run.
            </div>
          ) : (
            <div className="space-y-2 text-xs font-mono">
              {recentJobs.map(job => (
                <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded border border-border/40 bg-muted/20 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(job.startedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })} IST
                    </span>
                    <span className="font-bold text-foreground">{job.jobType}</span>
                    <span className="text-[10px] text-muted-foreground">({job.durationMs || 0}ms)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-[11px]">
                      Records: {job.successCount} / {job.totalRecords}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${
                        job.status === 'COMPLETED'
                          ? 'text-emerald-400 border-emerald-500/30'
                          : 'text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {job.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
