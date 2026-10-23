import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { TooltipProvider } from '@/components/ui/tooltip';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Dalal Street Pulse | Indian Stock Market Intelligence & AI Analytics',
  description:
    'Comprehensive Indian stock market intelligence platform prioritizing NSE and BSE equities, interactive historical charts, fundamentals, watchlists, price alerts, and grounded AI market briefings.',
};

import { Suspense } from 'react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary overflow-x-hidden">
        <TooltipProvider>
          <Suspense fallback={<div className="h-14 border-b border-border/70" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </TooltipProvider>
      </body>
    </html>
  );
}
