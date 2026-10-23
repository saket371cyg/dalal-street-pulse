'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Bell,
  Search,
  Clock,
  ShieldCheck,
  User,
  Settings,
  LogOut,
  LineChart,
  BookOpen,
  Newspaper,
  Compass,
  ListFilter,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MarketIndex, InAppNotification } from '@/types';
import { formatPercent } from '@/lib/utils/indian-market';
import { GlobalSearchDialog } from '@/components/layout/GlobalSearchDialog';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [indices, setIndices] = useState<MarketIndex[]>([
    {
      symbol: '^NSEI',
      name: 'NIFTY 50',
      currentValue: 24894.25,
      change: 142.6,
      percentChange: 0.58,
      previousClose: 24751.65,
      high: 24945.8,
      low: 24780.1,
      lastUpdated: new Date().toISOString(),
      status: 'live',
    },
    {
      symbol: '^BSESN',
      name: 'SENSEX',
      currentValue: 81688.4,
      change: 450.2,
      percentChange: 0.55,
      previousClose: 81238.2,
      high: 81820.5,
      low: 81350.25,
      lastUpdated: new Date().toISOString(),
      status: 'live',
    },
  ]);
  const [sessionInfo, setSessionInfo] = useState<{ statusLabel: string; istTime: string; isHoliday: boolean } | null>(null);
  const [liveTime, setLiveTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // 1-second live ticking clock in Asia/Kolkata (IST)
  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const formatted = `${timeStr} IST`;
      setLiveTime(prev => (prev !== formatted ? formatted : prev));
    };

    tick();
    const clockInterval = setInterval(tick, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Poll indices and notifications
  useEffect(() => {
    const fetchMarketData = () => {
      fetch('/api/stocks?mode=indices')
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.indices) setIndices(data.indices);
          if (data?.session) setSessionInfo(data.session);
        })
        .catch(err => console.warn('[Navbar] Indices poll notice:', err?.message || err));
    };

    const fetchNotifications = () => {
      fetch('/api/notifications')
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.notifications) setNotifications(data.notifications);
          if (data?.unreadCount !== undefined) setUnreadCount(data.unreadCount);
        })
        .catch(err => console.warn('[Navbar] Notifications poll notice:', err?.message || err));
    };

    fetchMarketData();
    fetchNotifications();

    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: '/', label: 'Overview', icon: LineChart },
    { href: '/markets', label: 'Markets', icon: Compass },
    { href: '/stocks', label: 'Stocks', icon: Search },
    { href: '/watchlists', label: 'Watchlists', icon: ListFilter },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    { href: '/insights', label: 'AI Insights', icon: ShieldCheck },
    { href: '/news', label: 'News', icon: Newspaper },
    { href: '/briefing', label: 'Briefing', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top Market Ticker Strip */}
      <div className="w-full bg-muted/40 border-b border-border/40 px-3 sm:px-6 2xl:px-8 py-1 text-xs">
        <div className="max-w-[1680px] mx-auto flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">
          {/* Indices ticker */}
          <div className="flex items-center gap-3 sm:gap-5 whitespace-nowrap overflow-x-auto no-scrollbar shrink">
            {indices.slice(0, 4).map((idx, i) => {
              const isPos = idx.change >= 0;
              const mobileVis = i >= 2 ? 'hidden xl:flex' : i >= 1 ? 'hidden sm:flex' : 'flex';
              return (
                <Link
                  key={idx.symbol}
                  href="/markets"
                  className={`${mobileVis} items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0`}
                >
                  <span className="font-semibold text-foreground/90">{idx.name}:</span>
                  <span className="font-mono tabular-nums">{idx.currentValue.toLocaleString('en-IN')}</span>
                  <span className={`flex items-center gap-0.5 font-mono tabular-nums text-[11px] font-medium ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPos ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}
                    {formatPercent(idx.percentChange)}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Live IST Session Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-muted-foreground text-[11px] shrink-0 pl-1 sm:pl-2">
            <span className="flex items-center gap-1 font-mono tabular-nums" suppressHydrationWarning>
              <Clock className="h-3 w-3 text-primary animate-pulse shrink-0" />
              {mounted ? liveTime : (sessionInfo?.istTime || 'Asia/Kolkata (IST)')}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 sm:px-2 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shrink-0" suppressHydrationWarning>
              <span className="hidden sm:inline">{sessionInfo?.statusLabel || 'Regular Session'}</span>
              <span className="sm:hidden">{sessionInfo?.statusLabel ? (sessionInfo.statusLabel.length > 10 ? 'Market' : sessionInfo.statusLabel) : 'Open'}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Navbar Bar */}
      <div className="w-full max-w-[1680px] mx-auto flex h-14 items-center justify-between px-3 sm:px-6 2xl:px-8 gap-2 sm:gap-4">
        {/* Brand & Desktop Links */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 xl:gap-5 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0 group">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-neutral-900 border border-neutral-700/70 flex items-center justify-center text-foreground font-semibold text-xs sm:text-sm shadow-sm group-hover:border-primary/50 transition-colors shrink-0">
              ₹
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-[14px] sm:text-[16px] font-bold tracking-tight text-foreground leading-none font-serif select-none whitespace-nowrap">
                Dalal Street Pulse
              </span>
              <span className="hidden sm:inline text-[8.5px] text-muted-foreground/80 tracking-[0.2em] uppercase font-medium font-sans mt-0.5 select-none whitespace-nowrap">
                INDIAN FINANCIAL INTELLIGENCE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden min-[1100px]:flex items-center gap-1 xl:gap-1.5">
            {navLinks.map(link => {
              const isActive = link.href === '/' ? pathname === '/' : pathname === link.href || pathname.startsWith(link.href + '/');
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none whitespace-nowrap ${
                    isActive
                      ? 'bg-secondary text-secondary-foreground font-semibold border border-border shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : 'opacity-70'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Search Dialog Trigger */}
          <GlobalSearchDialog />

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer outline-none shrink-0">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-rose-500 text-[8.5px] sm:text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40">
                <DropdownMenuLabel className="p-0 text-xs font-semibold">Notifications</DropdownMenuLabel>
                <Link href="/alerts" className="text-[11px] text-primary hover:underline">
                  Manage Alerts
                </Link>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No new notifications.
                  </div>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-lg mb-1 text-xs transition-colors ${
                        !n.read ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="font-semibold text-foreground text-xs">{n.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-border/60 inline-flex items-center justify-center hover:bg-muted/50 cursor-pointer outline-none transition-colors shrink-0">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1">
              <div className="px-2.5 py-2 border-b border-border/40">
                <p className="text-xs font-semibold text-foreground">Dalal Street Investor</p>
                <p className="text-[11px] text-muted-foreground truncate">investor@dalalstreetpulse.com</p>
              </div>
              <DropdownMenuItem
                onClick={() => router.push('/watchlists')}
                className="flex items-center gap-2 cursor-pointer text-xs"
              >
                <ListFilter className="h-3.5 w-3.5" /> My Watchlists
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/alerts')}
                className="flex items-center gap-2 cursor-pointer text-xs"
              >
                <Bell className="h-3.5 w-3.5" /> Price Alerts
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/settings')}
                className="flex items-center gap-2 cursor-pointer text-xs"
              >
                <Settings className="h-3.5 w-3.5" /> Preferences & Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                  } catch {}
                  window.location.reload();
                }}
                className="flex items-center gap-2 cursor-pointer text-xs text-rose-500 hover:text-rose-400"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile / Minimized Screen Menu Toggle (Visible below 1150px) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-[1100px]:hidden h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
        </div>
      </div>

      {/* Slide-Down Mobile / Minimized Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="min-[1100px]:hidden border-t border-border/60 bg-background/98 backdrop-blur-md px-4 py-3 animate-in slide-in-from-top-2 duration-150 shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pb-2">
            {navLinks.map(link => {
              const isActive = link.href === '/' ? pathname === '/' : pathname === link.href || pathname.startsWith(link.href + '/');
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'bg-secondary text-secondary-foreground font-semibold border border-border shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-mono">Asia/Kolkata (IST)</span>
            <Link href="/admin" className="text-primary hover:underline">
              System Diagnostics →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
