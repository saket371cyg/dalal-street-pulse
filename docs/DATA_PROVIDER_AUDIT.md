# Comprehensive Indian Market Data Provider Evaluation & Coverage Audit

## 1. Executive Summary

This document evaluates authorized Indian equity data sources across the National Stock Exchange of India (NSE) and BSE Ltd., focusing on **TrueData**, **EODHD**, and **Official Exchange Security Masters**. The goal is to establish an institutional-grade data ingestion architecture with verified coverage, symbol reconciliation, and transparent licensing compliance.

---

## 2. Provider Benchmark & Coverage Matrix

| Evaluation Criteria | TrueData (Primary Candidate) | EODHD (Benchmark Alternative) | Official Exchange Master (NSE & BSE) | Hybrid Recommended Architecture |
|---|---|---|---|---|
| **Exchange Authorization** | Officially Authorized Vendor (NSE & BSE) | Third-Party Global Aggregator | Primary Source Authority | Exchange Masters + Authorized APIs |
| **NSE Equities (Mainboard)** | 2,200+ listed equities | ~2,100 active `.NSE` tickers | 2,240+ (`EQUITY_L.csv`) | Complete reconciliation via ISIN |
| **BSE Equities (Mainboard)** | Full BSE Cash (4,500+ listed equities) | ~3,800 active `.BSE` tickers | 4,800+ (`BSE_Directory.csv`) | Complete reconciliation via Scrip Code |
| **SME Segments** | Supported (NSE EMERGE & BSE SME) | Partial (only liquid SME names) | 100% official coverage (`SME_L.csv`) | Ingested via official SME masters |
| **Symbol Change History** | Provided via TrueData Instrument API | Handled via ticker redirects | Official NSE `symbol_change.csv` | Explicit `symbol_aliases` collection in MongoDB |
| **Live / Real-Time Data** | Tick-by-tick WebSocket (<50ms latency) | 15-minute delayed or WebSocket | Not applicable (EOD / static files) | TrueData for live ticks; 15-min delay for free tier |
| **Historical OHLCV Depth** | 1-min intraday (10+ yrs), EOD (25+ yrs) | Daily EOD (20+ yrs), Intraday 1-min (1 yr) | Daily Bhavcopy only | TrueData for intraday; EODHD for historical depth |
| **Financial Statements** | Basic company profile & ratios | Full Balance Sheets, P&L, Cash Flow | SEBI/Exchange quarterly PDF/XBRL filings | EODHD Fundamentals API + Exchange filings |
| **Corporate Announcements** | Available via Corporate Actions API | Corporate events (Dividends, Splits) | Official NSE/BSE corporate action RSS/JSON | Unified `corporate_actions` collection |
| **Company News** | Basic market commentary | Full News API with sentiment & tickers | Official press releases only | News ingestion with sentiment tag |
| **Licensing & Redirection** | Requires NSE/BSE digital display license for public web platforms | Permitted for SaaS/Web application display | Public master files for reference | Compliant disclosure badges (Delayed / EOD / Live) |
| **Estimated Cost** | ₹2,500 - ₹15,000+/mo + exchange fees | $19.99 - $79.99/mo (All-World API) | Free for security master downloads | Tiered configuration via environment variables |

---

## 3. Provider Deep Dives

### 3.1 TrueData India
- **Architecture**: Dual-protocol API offering WebSocket feeds for tick-level L1 market data and RESTful endpoints for historical bar queries.
- **Symbol Formats**:
  - NSE Equities: `RELIANCE`, `TCS`, `HDFCBANK`
  - BSE Equities: `RELIANCE-BSE` or `500325` (BSE Scrip Code)
  - Indices: `NIFTY 50`, `NIFTY BANK`, `SENSEX`
- **Strengths**: Low latency, authorized Indian vendor status, complete SME coverage, direct exchange tick accuracy.
- **Limitations**: Commercial redistribution on multi-user websites requires official NSE/BSE market data agreements and subscriber auditing.

### 3.2 EODHD (End of Day Historical Data)
- **Architecture**: REST API + WebSockets covering global exchanges with dedicated Indian namespaces.
- **Symbol Formats**:
  - NSE Equities: `{SYMBOL}.NSE` (e.g., `RELIANCE.NSE`, `INFY.NSE`)
  - BSE Equities: `{SYMBOL}.BSE` or `{SCRIP_CODE}.BSE` (e.g., `500325.BSE`)
  - Indices: `NSEI.INDX` (NIFTY 50), `BSESN.INDX` (SENSEX)
- **Strengths**: Deep historical fundamentals (10+ years of quarterly income statements, balance sheets, and cash flows), clean news feeds with sentiment tagging, simple developer pricing.
- **Limitations**: Incomplete coverage of illiquid SME counters; 15-minute standard delay on non-realtime plans.

### 3.3 Official Exchange Security Masters
- **NSE India**:
  - `EQUITY_L.csv`: Security master containing Symbol, Company Name, Series (`EQ`, `BE`, `BZ`), Date of Listing, Paid Up Value, Market Lot, ISIN, Face Value.
  - `SME_L.csv`: Dedicated list of NSE EMERGE SME platform companies.
  - `symbol_change.csv`: Complete historical mapping of previous symbol to current symbol and effective date.
- **BSE India**:
  - `BSE_Security_Directory.csv`: Security code (5-6 digits), Security Id, Security Name, Status (`Active` / `Suspended`), Group (`A`, `B`, `T`, `M` for SME), Face Value, ISIN.
- **Reconciliation Rule**: **ISIN (International Securities Identification Number)** is used as the universal unique key to link NSE and BSE listings of the same company (e.g. `INE002A01018` for Reliance Industries links `RELIANCE` on NSE and `500325` / `RELIANCE` on BSE).

---

## 4. Final Selected Architecture: The Hybrid Ingestion Engine

To satisfy production reliability, complete coverage, and cost-effectiveness, Dalal Street Pulse uses a **Pluggable Multi-Tier Hybrid Ingestion Engine**:

1. **Security Master Ingestion Layer**:
   - Ingests official NSE (`EQUITY_L`, `SME_L`, `symbol_change`) and BSE security directories.
   - Unifies listings into a single canonical instrument record linked by `isin`.
   - Preserves exchange-specific identities: `nseSymbol` and `bseCode`.

2. **Market Data Provider Abstraction (`MarketDataProvider`)**:
   - `TrueDataProvider`: Evaluated for high-frequency live streaming & intraday tick data.
   - `EODHDProvider`: Primary source for multi-year historical OHLCV, detailed financial statements (Quarterly P&L, Balance Sheet, Cash Flow), and financial news.
   - `ExchangeMasterProvider`: Ingests and reconciles official security master CSVs and corporate actions.
   - `HybridProvider`: Intelligently routes calls to the best available provider with automatic fallback and cached offline demo modes.

3. **Inngest Sync Workflow**:
   - Daily automated master sync at 06:00 IST (pre-market).
   - Intraday quote snapshot sync every 15 minutes during trading hours (09:15–15:30 IST).
   - EOD fundamentals & corporate actions sync at 18:00 IST (post-market).
