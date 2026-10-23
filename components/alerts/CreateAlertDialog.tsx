'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle2 } from 'lucide-react';
import { formatINR } from '@/lib/utils/indian-market';
import { AlertCondition } from '@/types';

interface CreateAlertDialogProps {
  symbol: string;
  currentPrice: number;
  triggerButton?: React.ReactNode;
  onAlertCreated?: () => void;
}

export function CreateAlertDialog({
  symbol,
  currentPrice,
  triggerButton,
  onAlertCreated,
}: CreateAlertDialogProps) {
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState<AlertCondition>('PRICE_ABOVE');
  const [threshold, setThreshold] = useState<string>(Math.round(currentPrice * 1.05).toString());
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threshold || isNaN(Number(threshold))) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          condition,
          thresholdValue: Number(threshold),
          notes,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        if (onAlertCreated) onAlertCreated();
        setTimeout(() => {
          setSuccess(false);
          setOpen(false);
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to create alert:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (triggerButton as React.ReactElement) || (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Bell className="h-3.5 w-3.5 text-primary" />
              Set Alert
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">{symbol}</Badge>
            <DialogTitle className="text-base">Create Price Alert</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Current Price: <span className="font-semibold text-foreground font-mono">{formatINR(currentPrice)}</span>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-foreground">Alert Activated!</p>
            <p className="text-xs text-muted-foreground mt-1">
              You will receive in-app & email notifications when {symbol} triggers this condition.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Trigger Condition</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Button
                  type="button"
                  variant={condition === 'PRICE_ABOVE' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start h-9"
                  onClick={() => {
                    setCondition('PRICE_ABOVE');
                    setThreshold(Math.round(currentPrice * 1.05).toString());
                  }}
                >
                  Price Crosses Above
                </Button>
                <Button
                  type="button"
                  variant={condition === 'PRICE_BELOW' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start h-9"
                  onClick={() => {
                    setCondition('PRICE_BELOW');
                    setThreshold(Math.round(currentPrice * 0.95).toString());
                  }}
                >
                  Price Crosses Below
                </Button>
                <Button
                  type="button"
                  variant={condition === 'PCT_GAIN_ABOVE' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start h-9"
                  onClick={() => {
                    setCondition('PCT_GAIN_ABOVE');
                    setThreshold('3.0');
                  }}
                >
                  Daily Gain &ge; %
                </Button>
                <Button
                  type="button"
                  variant={condition === 'PCT_LOSS_BELOW' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs justify-start h-9"
                  onClick={() => {
                    setCondition('PCT_LOSS_BELOW');
                    setThreshold('3.0');
                  }}
                >
                  Daily Drop &ge; %
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {condition.startsWith('PRICE') ? 'Target Price (INR)' : 'Percentage Threshold (%)'}
              </label>
              <Input
                type="number"
                step="any"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                placeholder={condition.startsWith('PRICE') ? 'e.g. 2950' : 'e.g. 3.5'}
                required
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Notes / Thesis (Optional)</label>
              <Input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Breakout above 52W high or trailing stop"
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? 'Activating...' : 'Activate Alert'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
