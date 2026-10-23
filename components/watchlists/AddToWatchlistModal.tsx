'use client';

import React, { useState, useEffect } from 'react';
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
import { Bookmark, CheckCircle2, Plus } from 'lucide-react';
import { Watchlist } from '@/types';

interface AddToWatchlistModalProps {
  symbol: string;
  triggerButton?: React.ReactNode;
}

export function AddToWatchlistModal({ symbol, triggerButton }: AddToWatchlistModalProps) {
  const [open, setOpen] = useState(false);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>('');
  const [newWatchlistName, setNewWatchlistName] = useState<string>('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/watchlists')
        .then(res => res.json())
        .then(data => {
          if (data.watchlists) {
            setWatchlists(data.watchlists);
            if (data.watchlists.length > 0) {
              setSelectedWatchlistId(data.watchlists[0].id);
            }
          }
        })
        .catch(err => console.error('Failed to fetch watchlists:', err));
    }
  }, [open]);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const targetId = selectedWatchlistId;

      if (creatingNew && newWatchlistName.trim()) {
        const createRes = await fetch('/api/watchlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newWatchlistName.trim(), symbols: [symbol] }),
        });
        if (createRes.ok) {
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            setOpen(false);
          }, 1000);
          return;
        }
      }

      if (targetId) {
        const addRes = await fetch(`/api/watchlists/${targetId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', symbol }),
        });
        if (addRes.ok) {
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            setOpen(false);
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Failed to add to watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (triggerButton as React.ReactElement) || (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Bookmark className="h-3.5 w-3.5 text-primary" />
              Watchlist
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">{symbol}</Badge>
            <DialogTitle className="text-base">Save to Watchlist</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Keep track of live movements and receive tailored Indian market alerts.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-foreground">Added to Watchlist!</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {!creatingNew ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Select Destination Watchlist</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {watchlists.map(wl => {
                    const alreadyPresent = wl.symbols.includes(symbol);
                    const isSelected = selectedWatchlistId === wl.id;
                    return (
                      <div
                        key={wl.id}
                        onClick={() => setSelectedWatchlistId(wl.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border/60 hover:bg-muted/40'
                        }`}
                      >
                        <span className="font-medium text-foreground">{wl.name}</span>
                        {alreadyPresent ? (
                          <Badge variant="secondary" className="text-[10px]">Already Saved</Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">{wl.symbols.length} stocks</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreatingNew(true)}
                  className="w-full text-xs text-primary gap-1 mt-2"
                >
                  <Plus className="h-3.5 w-3.5" /> Create New Watchlist
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">New Watchlist Name</label>
                <Input
                  type="text"
                  value={newWatchlistName}
                  onChange={e => setNewWatchlistName(e.target.value)}
                  placeholder="e.g. Banking Momentum or Long-Term Gems"
                  className="text-xs"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreatingNew(false)}
                  className="text-xs text-muted-foreground"
                >
                  &larr; Choose Existing Watchlist
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={loading || (!selectedWatchlistId && !newWatchlistName)}>
                {loading ? 'Saving...' : 'Save Stock'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
