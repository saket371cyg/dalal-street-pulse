# Dalal Street Pulse — Indian Stock Market Intelligence Platform

Dalal Street Pulse is a modern, high-performance financial intelligence web application engineered specifically for the **Indian equity markets (NSE & BSE)**. Built with Next.js 16 (App Router & Turbopack), TypeScript, and Tailwind CSS, it prioritizes Indian financial conventions: authentic `₹` INR currency formatting with Lakh/Crore notation, official `Asia/Kolkata` (IST) market sessions, interactive candlestick charting, real-time quotes, multi-exchange master reconciliation, and a concise, evidence-grounded AI financial analyst.

---

## 1. Key Features

- **NSE & BSE Unified Market Overview**: Real-time tracking of major Indian benchmark indices (NIFTY 50, BSE SENSEX, NIFTY Bank, NIFTY IT) with intraday range bars, volume metrics, and official trading session statuses (Pre-Open, Regular, Post-Close, and Exchange Holidays).
- **Security Master & Multi-Exchange Ingestion**: Reconciles official NSE and BSE security masters (`EQUITY_L.csv`, `BSE_Securities.csv`), handles SME platform listings (NSE Emerge & BSE SME), tracks dual-listed equities, and resolves historical symbol ticker changes.
- **Interactive Candlestick & Area Charts**: High-speed OHLC candlestick and area charts with volume histograms, crosshairs, tooltips, and multi-timeframe navigation (`1D`, `1W`, `1M`, `3M`, `6M`, `1Y`, `5Y`).
- **Company Fundamentals & Valuation**: Enterprise valuation, P/E vs industry medians, P/B, ROE, ROCE, Debt-to-Equity, EPS, book value, and quarterly/annual financial statement tracking.
- **Concise, Evidence-Based AI Analyst**:
  - Direct answers delivered in the first sentence without conversational filler.
  - Transparent, deterministic **Credibility Percentage** (0–100%) and rating (`High`, `Moderate`, `Low`) based on verified price recency, fundamental depth, and source quality.
  - Stock-specific supporting evidence (up to 3 concise bullet points) and invalidation risk caveats.
  - Classifies user questions across 8 categories: `BULLISH_BEARISH`, `WHY_MOVED`, `FACTUAL`, `TECHNICAL`, `FUNDAMENTAL`, `COMPARISON`, `FORECAST`, and `EDUCATIONAL`.
  - Runs in real-time with Google Gemini or offline with deterministic financial mathematical engines.
- **Personalized Watchlists & Price Alerts**: User-isolated watchlists with symbol deduplication, combined with an automated alerts engine checking `PRICE_ABOVE`, `PRICE_BELOW`, and percentage move conditions.
- **Daily Market Briefings & News**: Automated post-market synthesis of daily catalysts, RBI policy actions, and corporate earnings with sentiment tagging.
- **Diagnostic Admin Console**: Operational dashboard displaying master ingestion statistics, provider health, WebSocket connection states, and manual sync triggers.

---

## 2. Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router with Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with dark financial theme tokens
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) primitives with [Lucide React](https://lucide.dev/) icons
- **Data Persistence**: [MongoDB](https://www.mongodb.com/) client with connection pooling and resilient in-memory fallback store
- **Authentication**: Lightweight session-based authentication with bcrypt password hashing and secure HTTP-only cookies
- **Market Data Feeds**:
  - **TrueData**: WebSocket tick streams and REST historical bars (`wss://realtime.truedata.in`, `https://history.truedata.in`).
  - **EODHD**: Extended fundamentals, financial statements, and news.
  - **Exchange Master**: Unified reconciliation engine for NSE & BSE securities.
  - **Hybrid Provider**: Automated fallback and multi-vendor query routing.
- **AI Intelligence**: [Google GenAI SDK](https://github.com/google-gemini/deprecations) (`@google/genai`) with fallback deterministic quantitative modeling
- **Job Orchestration**: [Inngest](https://www.inngest.com/) for background sync workflows and scheduled alert evaluations
- **Email Notifications**: [Nodemailer](https://nodemailer.com/) with configurable SMTP transport
- **Testing**: [Vitest](https://vitest.dev/) test suite with 72 unit and integration tests

---

## 3. Application Architecture & Routes

| Route | View | Description |
|---|---|---|
| `/` | **Overview Dashboard** | Real-time index benchmarks, session status banner, top gainers/losers, sector performance, and executive briefing |
| `/markets` | **Indian Markets** | In-depth NSE & BSE sectoral indices, FII & DII daily institutional flow statistics, and index weightages |
| `/stocks` | **Security Discovery** | Search catalog across NSE & BSE equities, SME board filters, market capitalization tiers, and quick-add actions |
| `/stocks/[symbol]` | **Stock Detail** | Real-time quote, interactive candlestick charts, 10+ valuation ratios, financial statements, and AI analyst thesis |
| `/watchlists` | **Portfolio Watchlists** | Isolated user watchlists with real-time SSE quote streaming and quick removal |
| `/alerts` | **Price Alerts Engine** | Target threshold triggers, condition monitoring, trigger logs, and manual evaluation controls |
| `/insights` | **AI Market Analyst** | Interactive financial intelligence console with credibility scoring and source attribution |
| `/news` | **Market News & Filings** | Financial news feed categorized by sentiment, regulatory impact, and corporate announcements |
| `/briefing` | **Daily Session Briefing** | End-of-day market commentary, key macro drivers, and email dispatch triggers |
| `/settings` | **Preferences** | User profile, default exchange preference (NSE / BSE), and alert notification thresholds |
| `/admin` | **System Diagnostics** | Security master ingestion stats, provider health checks, and Inngest job triggers |

---

## 4. Prerequisites

- **Node.js**: Version 18.18.0 or higher (Node 20+ recommended)
- **Package Manager**: npm (v9 or v10)
- **MongoDB** *(Optional)*: Local MongoDB instance or MongoDB Atlas URI (in-memory fallback is active if MongoDB is omitted)
- **Google Gemini API Key** *(Optional)*: Required for natural language AI generation (deterministic quantitative engines operate if omitted)
- **TrueData / EODHD Credentials** *(Optional)*: Required for live vendor feeds (standby evaluation mode active by default)

---

## 5. Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/dalal-street-pulse.git
   cd dalal-street-pulse
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` to provide your credentials (all external credentials are fully optional for local development).

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Development, Testing & Verification Commands

| Command | Action |
|---|---|
| `npm run dev` | Starts local Next.js development server with Turbopack |
| `npm run lint` | Runs ESLint 9 to verify code quality and style standards |
| `npx tsc --noEmit` | Runs TypeScript compiler to verify zero type errors |
| `npm test` | Runs complete Vitest test suite (72 unit and integration tests) |
| `npm run build` | Builds optimized production bundle using Next.js Turbopack |
| `npm start` | Starts production HTTP server |

---

## 7. Market Data Limitations & Feed Notes

- **Delayed vs Real-Time Quotes**: By default, quote snapshots in evaluation mode reflect official exchange end-of-day and recent tick observations. During regular market hours, if TrueData WebSocket credentials (`TRUE_DATA_USERNAME` and `TRUE_DATA_PASSWORD`) are configured, the server streams live NSE/BSE ticks. Otherwise, standard 15-minute exchange delays apply.
- **Resilient Fallback Mode**: If external market data providers or MongoDB instances are unreachable, Dalal Street Pulse automatically transitions to verified reference data with zero synthetic or mock US price substitutions.
- **Official Trading Hours**: All session status calculations are strictly aligned with Indian Standard Time (`Asia/Kolkata`, UTC+05:30):
  - Normal Equity Market: 09:15 to 15:30 IST (Monday through Friday)
  - Pre-Open Session: 09:00 to 09:15 IST
  - Post-Closing Session: 15:30 to 16:00 IST

---

## 8. Compliance & Disclaimer

> **IMPORTANT REGULATORY NOTICE**:
> 
> Dalal Street Pulse and its AI Financial Analyst features are engineered exclusively for **informational, educational, and research purposes**. 
>
> - The application does not provide SEBI-registered personalized investment advice, financial planning, or buy/sell recommendations.
> - Equity investments are subject to market risks. Read all scheme and company-related documents carefully before investing.
> - Past financial performance, technical indicators, and AI-generated credibility scores do not guarantee future returns.
