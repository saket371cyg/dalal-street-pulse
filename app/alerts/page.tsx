'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PriceAlert } from '@/types';
import { formatINR } from '@/lib/utils/indian-market';
import { CreateAlertDialog } from '@/components/alerts/CreateAlertDialog';

export default function PriceAlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (data.alerts) setAlerts(data.alerts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleToggle = async (alertId: string, currentActive: boolean) => {
    try {
      await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, active: !currentActive }),
      });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, active: !currentActive } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      await fetch(`/api/alerts?id=${alertId}`, { method: 'DELETE' });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleEvaluateNow = async () => {
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await fetch('/api/alerts/evaluate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setEvalResult(`Evaluated ${data.checkedCount} active alerts. ${data.triggeredCount} condition(s) met & notifications dispatched.`);
        loadAlerts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(false);
    }
  };

  const activeAlerts = alerts.filter(a => !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 2xl:px-8 max-w-7xl 2xl:max-w-[1680px] mx-auto w-full transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Price Alerts Engine
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configurable price crossing thresholds, percentage movement triggers & Inngest background polling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEvaluateNow}
            disabled={evaluating}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${evaluating ? 'animate-spin' : ''}`} />
            Evaluate Alerts Now
          </Button>

          <CreateAlertDialog
            symbol="RELIANCE"
            currentPrice={2984.50}
            onAlertCreated={loadAlerts}
            triggerButton={
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> New Alert
              </Button>
            }
          />
        </div>
      </div>

      {evalResult && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/10 text-xs text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{evalResult}</span>
        </div>
      )}

      {/* Active Alerts Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Active Price Alerts</CardTitle>
            <span className="text-[11px] text-muted-foreground font-mono">{activeAlerts.length} active</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="text-xs">Stock</TableHead>
                <TableHead className="text-xs">Condition</TableHead>
                <TableHead className="text-xs text-right">Threshold</TableHead>
                <TableHead className="text-xs text-right">Initial Price</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-border/40 animate-pulse">
                    <TableCell className="py-3">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-16 bg-muted rounded" />
                        <div className="h-2.5 w-28 bg-muted/60 rounded" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-24 bg-muted/50 rounded" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-3.5 w-16 bg-muted rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-3.5 w-14 bg-muted rounded ml-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="h-5 w-16 bg-muted/50 rounded mx-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-6 w-14 bg-muted/40 rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : activeAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center py-8">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Bell className="h-7 w-7 text-muted-foreground/40" />
                      <p className="text-sm font-semibold text-foreground">No Active Price Alerts</p>
                      <p className="text-xs text-muted-foreground">
                        Configure crossing thresholds or percentage movement triggers to receive instant notifications.
                      </p>
                      <Link href="/stocks" className="mt-2">
                        <Button variant="outline" size="xs" className="text-xs">
                          Select Stock to Monitor
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activeAlerts.map(alert => (
                  <TableRow key={alert.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3">
                      <Link href={`/stocks/${alert.symbol}`} className="font-bold text-xs text-foreground font-mono tabular-nums hover:text-primary">
                        {alert.symbol}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">{alert.companyName}</div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {alert.condition === 'PRICE_ABOVE' ? 'Price Crosses Above' :
                         alert.condition === 'PRICE_BELOW' ? 'Price Crosses Below' :
                         alert.condition === 'PCT_GAIN_ABOVE' ? 'Gain ≥ %' : 'Drop ≥ %'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-foreground">
                      {alert.condition.startsWith('PRICE') ? formatINR(alert.thresholdValue) : `${alert.thresholdValue}%`}
                    </TableCell>

                    <TableCell className="text-right font-mono tabular-nums text-xs text-muted-foreground">
                      {formatINR(alert.initialPrice)}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] gap-1 ${
                          alert.active
                            ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {alert.active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {alert.active ? 'Monitoring' : 'Paused'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(alert.id, alert.active)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title={alert.active ? 'Pause Alert' : 'Resume Alert'}
                        >
                          {alert.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(alert.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Triggered Alerts History */}
      {triggeredAlerts.length > 0 && (
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2 border-b border-border/40">
            <CardTitle className="text-sm font-semibold text-foreground">Triggered Alerts History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="text-xs">Stock</TableHead>
                  <TableHead className="text-xs">Target Condition</TableHead>
                  <TableHead className="text-xs text-right">Trigger Price</TableHead>
                  <TableHead className="text-xs text-right">Trigger Time (IST)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggeredAlerts.map(alert => (
                  <TableRow key={alert.id} className="border-border/40">
                    <TableCell className="py-2.5 font-bold font-mono tabular-nums text-xs text-foreground">
                      {alert.symbol}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {alert.condition} (Target: {alert.thresholdValue})
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-emerald-500">
                      {alert.triggeredPrice ? formatINR(alert.triggeredPrice) : 'Triggered'}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-muted-foreground font-mono tabular-nums">
                      {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
