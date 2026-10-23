# Dalal Street Pulse — Indian Stock Market Intelligence Platform

A complete, production-grade financial intelligence web application built specifically for the **Indian stock market (NSE & BSE)**. Prioritizes Indian equities, benchmark indices (NIFTY 50, SENSEX, NIFTY Bank, NIFTY IT), ₹ INR formatting, Asia/Kolkata (IST) market sessions, interactive historical charts, fundamental valuation metrics, personalized watchlists, automated price alerts, Inngest background workflows, and grounded AI market intelligence.

---

## 1. Project Overview & Market Scope

- **Primary Markets**: National Stock Exchange of India (NSE) and BSE Ltd.
- **Default Currency**: Indian Rupee (`₹` / INR) with authentic Indian digit grouping (`12,34,567.89`) and Lakh/Crore notation (`₹15.42 Lakh Cr`, `₹4,230 Cr`).
- **Timezone**: `Asia/Kolkata` (IST, UTC+05:30) with real-time detection of official trading sessions (Pre-open 09:00–09:15, Regular Equity 09:15–15:30, Post-Closing 15:30–16:00, Weekends, and NSE/BSE official exchange holidays).
- **Core Principle**: Zero fake prices, zero synthetic US market substitutions. All default charts, watchlists, news, briefings, and AI outputs prioritize Indian companies.

---

## 2. Technology Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 with custom dark financial tokens
- **UI Components**: shadcn/ui (Nova design preset) with Lucide Icons
- **Typography**: Geist Sans & Geist Mono
- **Database & Persistence**: MongoDB client with connection pooling and resilient local development fallback store
- **Authentication**: Session-based authentication with bcrypt password hashing and secure HTTP-only cookies
- **Market Data Engine**: Unified Indian equities provider abstraction supporting quotes, historical OHLCV candles, company fundamentals, and financial news
- **Charting**: High-performance interactive candlestick OHLC and area time series charts with volume histograms, crosshairs, tooltips, and timeframe selectors (`1D`, `1W`, `1M`, `3M`, `6M`, `1Y`, `5Y`)
- **Background Workflows**: Inngest SDK (`/api/inngest`) for periodic alert evaluations and automated post-market daily briefings (16:30 IST)
- **Email Dispatch**: Nodemailer with configurable SMTP credentials
- **Testing**: Vitest unit & integration test suite

---

## 3. Application Navigation & Architecture

| Route | Purpose | Key Features |
|---|---|---|
| `/` | **Overview Dashboard** | NIFTY 50, SENSEX, NIFTY Bank live tickers, session clock, AI executive briefing, market gainers/losers, sector heatmap |
| `/markets` | **Indian Markets** | In-depth NSE & BSE index levels, FII & DII daily institutional flow statistics, sectoral weightages |
| `/stocks` | **Explore Stocks** | Live debounced search across NSE/BSE tickers, sector filter, market cap categorization, 1-click watchlist & alert triggers |
| `/stocks/[symbol]` | **Stock Details** | Real-time quote in INR, interactive area/candlestick charts, 10+ valuation ratios, quarterly & annual statements, shareholding pattern, AI thesis |
| `/watchlists` | **Personalized Watchlists** | Create multiple named watchlists, add/remove stocks, live quotes, user data isolation |
| `/alerts` | **Price Alerts** | Crossing above/below targets, % gain/drop thresholds, active/paused status, trigger history, manual "Evaluate Now" button |
| `/insights` | **AI Insights** | Grounded Indian macroeconomic analysis, valuation verdict, educational assistant for financial concepts |
| `/news` | **Market News** | Verified RBI policy, corporate earnings, SEBI regulations, categorized with sentiment tags and source links |
| `/briefing` | **Daily Briefings** | Post-market daily AI report, key catalyst breakdown, manual generation action, email subscription toggle |
| `/settings` | **User Settings** | Investor profile, default market (NSE vs BSE), notification preferences, briefing schedule |
| `/admin` | **Administration** | Provider health, MongoDB persistence status, Inngest background workflow logs |

---

## 4. Environment Configuration

Copy `.env.example` to `.env.local` to configure your environment variables:

```bash
cp .env.example .env.local
```

### Key Environment Variables

```env
# 1. MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/stock_market_ai

# 2. Authentication
BETTER_AUTH_SECRET=super_secret_key_32chars_minimum
BETTER_AUTH_URL=http://localhost:3000

# 3. Market Data Provider
MARKET_DATA_API_KEY=
MARKET_DATA_PROVIDER=hybrid_nse_bse

# 4. AI Provider
AI_PROVIDER=gemini
AI_API_KEY=
AI_MODEL=gemini-1.5-flash

# 5. Inngest Workflows
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# 6. Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Dalal Street Pulse <no-reply@dalalstreetpulse.com>"
```

> **Resilient Development Mode**: If `MONGODB_URI` or `AI_API_KEY` is not provided, the platform automatically utilizes its high-fidelity in-memory persistence and grounded rule-based analytical engine, allowing complete inspection without external configuration blockers.

---

## 5. Development & Testing Commands

### Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Unit & Integration Tests
```bash
npm run test
```
Executes the Vitest test suite covering:
- Indian Rupee and Lakh/Crore digit grouping formatting
- IST market session calculations and exchange holiday detection
- Symbol normalization between NSE (`.NS`), BSE (`.BO`), and clean tickers
- Watchlist item deduplication and user isolation
- Price alert trigger condition evaluation
- Grounded AI analysis schema validation

### Run Production Build
```bash
npm run build
```
Compiles and validates all 27 pages, route handlers, and TypeScript components with Next.js Turbopack.

---

## 6. Regulatory & Data Disclosures

- All equity quotes and indices are derived from verified official NSE and BSE disclosures.
- Market data is subject to standard 15-minute exchange delays unless real-time entitlements are provided.
- This application is created for financial intelligence and educational analytics; it does not provide SEBI-registered personalized investment recommendations.
