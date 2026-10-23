import { NextRequest } from 'next/server';
import { getTrueDataFeedManager } from '@/lib/market-data/truedata-feed';
import { normalizeIndianSymbol } from '@/lib/utils/indian-market';
import { StockQuote } from '@/types';

/**
 * Server-Sent Events (SSE) Real-Time Quote Streaming Endpoint
 *
 * Streams live ticks and quote updates directly from the server-side
 * TrueData Feed Manager to the browser client with:
 * - Immediate initial quote snapshot on connect
 * - Active symbol filtering (?symbols=RELIANCE,TCS)
 * - Connection status events
 * - 15-second heartbeat keep-alive frames
 * - Graceful connection cleanup on client disconnect
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbols = searchParams.get('symbols');

  const symbolsFilter: string[] = rawSymbols
    ? rawSymbols
        .split(',')
        .map(s => normalizeIndianSymbol(s).cleanSymbol)
        .filter(Boolean)
    : [];

  const feedManager = getTrueDataFeedManager();

  // If specific symbols were requested, ensure TrueData manager has subscribed
  if (symbolsFilter.length > 0) {
    feedManager.subscribe(symbolsFilter);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      const safeEnqueue = (text: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };

      // 1. Send connection status frame
      const statusData = feedManager.getConnectionStatus();
      safeEnqueue(`event: status\ndata: ${JSON.stringify(statusData)}\n\n`);

      // 2. Push immediate cached snapshot so the frontend has immediate data
      const initialQuotes: StockQuote[] = symbolsFilter.length > 0
        ? symbolsFilter
            .map(sym => feedManager.getCachedQuote(sym))
            .filter((q): q is StockQuote => q !== null)
        : feedManager.getAllCachedQuotes().slice(0, 30);

      for (const quote of initialQuotes) {
        safeEnqueue(`event: quote\ndata: ${JSON.stringify(quote)}\n\n`);
      }

      // 3. Attach quote update listener
      const onQuote = (quote: StockQuote) => {
        if (symbolsFilter.length === 0 || symbolsFilter.includes(quote.symbol)) {
          safeEnqueue(`event: quote\ndata: ${JSON.stringify(quote)}\n\n`);
        }
      };

      feedManager.on('quote', onQuote);

      // 4. Send 15-second heartbeat comment frames to keep connection open
      const heartbeatInterval = setInterval(() => {
        safeEnqueue(`: heartbeat ${Date.now()}\n\n`);
      }, 15000);

      // 5. Cleanup on abort
      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(heartbeatInterval);
        feedManager.off('quote', onQuote);
        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, max-age=0',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering in Nginx/Vercel
    },
  });
}
