import { MarketDataProvider } from './types';
import { TrueDataProvider } from './truedata';
import { EODHDProvider } from './eodhd';
import { ExchangeMasterProvider } from './exchange-master';
import { HybridProvider } from './hybrid';

export * from './types';
export * from './truedata';
export * from './eodhd';
export * from './exchange-master';
export * from './hybrid';

let activeProviderInstance: MarketDataProvider | null = null;

/**
 * Factory to get or switch the configured MarketDataProvider
 */
export function getMarketDataProvider(preferred?: string): MarketDataProvider {
  const providerName = (preferred || process.env.MARKET_DATA_PROVIDER || 'HYBRID').toUpperCase();

  if (activeProviderInstance && !preferred) {
    return activeProviderInstance;
  }

  let provider: MarketDataProvider;

  switch (providerName) {
    case 'TRUEDATA':
      provider = new TrueDataProvider();
      break;
    case 'EODHD':
      provider = new EODHDProvider();
      break;
    case 'EXCHANGE_MASTER':
      provider = new ExchangeMasterProvider();
      break;
    case 'HYBRID':
    default:
      provider = new HybridProvider();
      break;
  }

  if (!preferred) {
    activeProviderInstance = provider;
  }

  return provider;
}
