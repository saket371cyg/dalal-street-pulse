'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Bell,
  Mail,
  Shield,
  CheckCircle2,
  Save,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { UserProfile } from '@/types';

export default function UserSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/settings', { signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.settings) setProfile(data.settings);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.warn('[Settings] Profile fetch notice:', err?.message || err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 max-w-3xl mx-auto w-full animate-pulse">
        <div className="space-y-1">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted/60 rounded" />
        </div>
        <Card className="border-border/60 bg-card/60 p-5 space-y-4">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-10 bg-muted/30 rounded" />
            <div className="h-10 bg-muted/30 rounded" />
          </div>
        </Card>
        <Card className="border-border/60 bg-card/60 p-5 space-y-4">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-14 bg-muted/20 rounded" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 sm:px-6 max-w-3xl mx-auto w-full">
      <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Account & Platform Preferences
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure default Indian exchange, alert notification channels, and automated market briefing delivery.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-5 pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Investor Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Personalized identification for briefings and alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Full Name</label>
                <Input
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email Address</label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indian Market Defaults Card */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-5 pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Regional & Market Standards
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Preferred Primary Exchange</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={profile.defaultMarket === 'NSE' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 text-xs h-9"
                    onClick={() => setProfile({ ...profile, defaultMarket: 'NSE' })}
                  >
                    NSE (National)
                  </Button>
                  <Button
                    type="button"
                    variant={profile.defaultMarket === 'BSE' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 text-xs h-9"
                    onClick={() => setProfile({ ...profile, defaultMarket: 'BSE' })}
                  >
                    BSE (Bombay)
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Default Currency</label>
                <Input
                  value={profile.currency}
                  disabled
                  className="text-xs h-9 bg-muted/40 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Standard Timezone</label>
                <Input
                  value={profile.timezone}
                  disabled
                  className="text-xs h-9 bg-muted/40 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification & Briefing Delivery Card */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-5 pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Automated Daily Briefings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Daily Post-Market Email Briefing</span>
                <p className="text-[11px] text-muted-foreground">
                  Receive a concise AI executive report in your inbox each day after 16:30 IST.
                </p>
              </div>
              <Switch
                checked={profile.emailBriefingEnabled}
                onCheckedChange={checked => setProfile({ ...profile, emailBriefingEnabled: checked })}
              />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <label className="text-xs font-medium text-foreground">Scheduled Delivery Time (IST)</label>
              <Input
                value={profile.briefingDeliveryTime}
                onChange={e => setProfile({ ...profile, briefingDeliveryTime: e.target.value })}
                placeholder="16:30"
                className="text-xs h-9 font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Preferences Saved!
            </span>
          )}
          <Button type="submit" size="sm" disabled={saving} className="gap-1.5 text-xs h-9 px-5">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
