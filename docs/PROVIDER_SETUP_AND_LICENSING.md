# Indian Market Data Provider Setup, Coverage Limitations & Licensing Guide

## 1. Architecture Overview

Dalal Street Pulse uses a **Pluggable Multi-Tier Hybrid Ingestion Engine** specifically engineered for the Indian equity market (NSE & BSE). The system reconciles exchange listings using **ISIN (International Securities Identification Number)** as the canonical unique key, ensuring dual-listed equities, BSE-only counters, SME platforms (NSE EMERGE & BSE SME), and historical symbol changes are managed with zero data fabrication.

```
                  ┌──────────────────────────────────────────────────────────┐
                  │                 Official Exchange Masters                │
                  │  NSE (EQUITY_L, SME_L, symbol_change) + BSE Directory    │
                  └─────────────────────────────┬────────────────────────────┘
                                                │ (ISIN Reconciliation)
                                                ▼
┌───────────────────────┐        ┌─────────────────────────┐        ┌───────────────────────┐
│       TrueData        │        │   Canonical Instruments  │        │         EODHD         │
│ (Authorized NSE & BSE)│◄───────┤         Database        ├───────►│  (Historical Depth   │
│ Live Ticks & L1 Feeds │        │  (MongoDB / Multi-Index)│        │   Statements & News)  │
└───────────────────────┘        └──────────────┬──────────┘        └───────────────────────┘
                                                │
                                                ▼
                                 ┌─────────────────────────┐
                                 │   Pluggable Provider    │
                                 │   Abstraction Layer     │
                                 └──────────────┬──────────┘
                                                │
                         ┌──────────────────────┴──────────────────────┐
                         ▼                                             ▼
                 Inngest Workflows                              Next.js Frontend
          (Master, Quotes, Actions Cron)                 (Lazy Loaded with Coverage Badges)
```

---

## 2. Environment Variables & Configuration

Configure the following variables in your `.env.local` or production container environment:

| Variable | Required | Default | Description |
|---|---|---|---|
| `MARKET_DATA_PROVIDER` | No | `HYBRID` | Active provider: `HYBRID`, `TRUEDATA`, `EODHD`, or `EXCHANGE_MASTER`. |
| `TRUE_DATA_USERNAME` | Optional | `""` | TrueData API account username. |
| `TRUE_DATA_PASSWORD` | Optional | `""` | TrueData API account password. |
| `TRUE_DATA_BASE_URL` | Optional | `https://api.truedata.in` | TrueData REST API gateway. |
| `EODHD_API_TOKEN` | Optional | `""` | EODHD API secret token. |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/stock_market_ai` | MongoDB connection URI with connection pooling. |
| `INNGEST_EVENT_KEY` | Optional | `""` | Inngest event key for background workflow triggers. |

---

## 3. Provider Capabilities & Coverage Benchmark

| Feature / Segment | TrueData | EODHD | Official Exchange Masters | Hybrid (Dalal Street Pulse) |
|---|---|---|---|---|
| **Exchange Authorization** | Officially Authorized (NSE & BSE) | Global Aggregator | Primary Regulatory Authority | Full Legal Compliance |
| **NSE Mainboard Equities** | ~2,200 active counters | ~2,100 active tickers | 2,240+ (`EQUITY_L.csv`) | 100% ISIN Reconciled |
| **BSE Mainboard Equities** | 4,500+ active counters | ~3,800 active tickers | 4,800+ (`BSE_Directory.csv`) | 100% Scrip Code Reconciled |
| **NSE EMERGE SME** | Supported | Partial / Unavailable | 100% (`SME_L.csv`) | Supported with SME Lot Disclosures |
| **BSE SME** | Supported | Incomplete | 100% (`Group M`) | Supported with SME Lot Disclosures |
| **BSE-Only Listings** | Supported | Partial | 100% Covered | Preserved with BSE Exchange Flag |
| **Symbol Changes / Mergers** | Via Instrument Updates | Via Ticker Redirects | Official `symbol_change.csv` | Indexed `symbol_aliases` collection |
| **Live / Real-Time Data** | Tick-by-Tick (<50ms) | 15-min Delayed | Bhavcopy Only (EOD) | Live via TrueData / Delayed fallback |
| **Historical OHLCV Depth** | 1-min Intraday (10 yrs) | Daily EOD (20+ yrs) | Bhavcopy Daily | Intraday via TrueData; EOD via EODHD |
| **Audited Financial Statements** | Basic Ratios only | Full P&L, BS, Cash Flow | SEBI/Exchange Filings | EODHD + Exchange Filings |
| **Corporate Announcements** | Available | Corporate Events Only | Official Exchange Feeds | Unified Corporate Actions Collection |
| **Company News & Sentiment** | Not Offered | Full News API with sentiment | Regulatory Disclosures | News feed with sentiment tagging |

---

## 4. Subscription Requirements & Pricing

### 4.1 TrueData India
- **Subscription Tiers**:
  - *Developer / Individual*: ₹2,500 – ₹4,500 / month (1–2 simultaneous WebSocket connections, restricted to personal or proprietary trading).
  - *Commercial Redistribution*: ₹15,000 – ₹50,000+ / month + official NSE/BSE redistribution royalties.
- **Entitlements**: NSE Cash L1, BSE Cash L1, Intraday Bars, Historical EOD.

### 4.2 EODHD
- **Subscription Tiers**:
  - *All-World Extended*: $19.99 – $79.99 / month (includes 100,000 API calls/day, historical fundamentals, and news API).
- **Entitlements**: `.NSE` and `.BSE` namespaces, quarterly income statements, balance sheets, and cash flows.

---

## 5. Rate Limits & Pacing Rules

1. **TrueData REST**:
   - Limit: 300 requests / minute.
   - WebSockets: Max 50–100 symbols per connection.
2. **EODHD REST**:
   - Limit: 60 requests / minute on standard plans; burst allowance of 100 requests.
3. **Exchange Master File Ingestion**:
   - Downloaded and cached once daily at **06:00 AM IST** (pre-market).
   - Ingests ~7,000+ instruments across NSE & BSE with exponential retry backoff.
4. **Intraday Quote Snapshotting**:
   - Executed every 15 minutes between **09:15 AM and 03:30 PM IST** (market hours).

---

## 6. Regulatory & Licensing Compliance

When displaying Indian stock market data publicly, the following legal rules must be strictly adhered to:

1. **Delayed Data Disclosure**:
   - Unless you have executed a formal Digital Display Agreement with NSE Data & Analytics Ltd. and BSE Ltd., all market prices must clearly state:
     `"15-Minute Delayed Data - For Informational Purposes Only"`.
2. **Zero Fabrication Policy**:
   - SME companies and newly listed equities frequently do not have quarterly audited statements or active news coverage.
   - The platform **never synthesizes or fabricates** mock values; it transparently displays:
     `"Financial statements not available for this counter"`.
3. **Data Attribution**:
   - Every stock detail page and diagnostics report prominently labels data sources:
     `"Source: NSE Official Security Master & TrueData Feed"`.

---

## 7. How to Switch Providers

### Method 1: Environment Variable (Recommended for Production)
Update `.env.local` or your Docker/Kubernetes environment:
```bash
# To run exclusively with TrueData
MARKET_DATA_PROVIDER=TRUEDATA

# To run exclusively with EODHD
MARKET_DATA_PROVIDER=EODHD

# To run with official Exchange Master only
MARKET_DATA_PROVIDER=EXCHANGE_MASTER

# To run with full Hybrid orchestration (Default)
MARKET_DATA_PROVIDER=HYBRID
```
Restart the application or trigger a hot reload.

### Method 2: Programmatic Switching in Code
Use the provider factory in `lib/market-data/providers/index.ts`:
```typescript
import { getMarketDataProvider } from '@/lib/market-data/providers';

// Instantiate specific provider on demand
const trueDataProvider = getMarketDataProvider('TRUEDATA');
const quote = await trueDataProvider.getQuote('RELIANCE');
```

### Method 3: Triggering Immediate Synchronization
You can trigger synchronization at any time without waiting for Inngest crons:
1. Navigate to `/admin` in the application.
2. Click **"Sync Security Master"**, **"Sync Corporate Actions"**, or **"Sync Quotes Snapshot"**.
3. Or send a POST request:
```bash
curl -X POST http://localhost:3000/api/admin/sync \
  -H "Content-Type: application/json" \
  -d '{"jobType": "SECURITY_MASTER"}'
```
