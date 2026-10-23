import { RAGDocumentChunk } from '@/types';

/**
 * Pre-curated, grounded knowledge chunks for Indian Equities (NSE/BSE),
 * Corporate Disclosures, RBI Monetary Policy, and Valuation Frameworks.
 */
export const INITIAL_KNOWLEDGE_BASE: Omit<RAGDocumentChunk, 'embedding'>[] = [
  // =========================================================================
  // RELIANCE INDUSTRIES (RELIANCE)
  // =========================================================================
  {
    id: 'rag_rel_01',
    documentId: 'rel_q2_fy26_disclosures',
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Limited',
    title: 'Reliance Industries: Business Segments, Oil-to-Chemicals & Retail Performance',
    category: 'earnings',
    content: `Reliance Industries (NSE: RELIANCE / BSE: 500325) reported consolidated quarterly revenue of ₹2,35,400 Crore.
Key highlights by operating segment:
1. Reliance Retail: Continued omni-channel footprint expansion with 18,900+ physical stores and gross revenue growing 12.8% YoY. Footfalls crossed 290 million.
2. Digital Services (Jio Infocomm): 5G network rollout completed nationwide on True 5G SA (Standalone) architecture. Monthly data consumption per user crossed 30.1 GB, driving ARPU expansion.
3. Oil-to-Chemicals (O2C): Refined product exports maintained robust margins despite global crack spread volatility. Feedstock flexibility cushioned petrochemical margin pressure.
4. Capital Expenditure: Ongoing investment in the Dhirubhai Ambani Green Energy Giga Complex at Jamnagar (solar PV, energy storage, electrolyzers, and green hydrogen).`,
    sourceUrl: 'https://www.bseindia.com/corporates/ann.html',
    publishedAt: '2026-01-20T10:00:00.000Z',
    metadata: { exchange: 'NSE', segment: 'Conglomerate' },
  },
  {
    id: 'rag_rel_02',
    documentId: 'rel_valuation_debt',
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Limited',
    title: 'Reliance Industries: Net Debt Profile, ROCE, and Valuation Analysis',
    category: 'filing',
    content: `Reliance Industries maintains net debt-to-equity below 0.45x, underpinned by cash flows from digital and retail verticals.
- Trailing P/E trades between 24x to 28x, near its historical 5-year median.
- ROCE stands at approximately 10.5%–11.5%, which is expected to expand as major Jamnagar green energy capex begins contributing to cash flow.
- Promoters hold approximately 50.3% equity, with zero promoter pledging reported to stock exchanges.
- Strategic Catalyst: Future potential value unlocking through planned retail and telecom initial public offerings (IPOs).`,
    sourceUrl: 'https://www.nseindia.com/companies-listing/corporate-filings',
    publishedAt: '2026-02-15T12:00:00.000Z',
    metadata: { exchange: 'NSE' },
  },

  // =========================================================================
  // TATA CONSULTANCY SERVICES (TCS)
  // =========================================================================
  {
    id: 'rag_tcs_01',
    documentId: 'tcs_q3_fy26_commentary',
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services Limited',
    title: 'TCS: Earnings Analysis, Cloud Deals, and Operating Margins',
    category: 'earnings',
    content: `Tata Consultancy Services (NSE: TCS / BSE: 532540) delivered quarterly revenue of ₹64,250 Crore with operating margins steady at 24.8%.
- Total Contract Value (TCV): Secured $10.2 Billion in deal wins during the quarter, led by North American BFSI modernization and European manufacturing cloud transformation.
- Generative AI & Digital: TCS AI WisdomNext and dedicated AI practice pipeline exceeded $1.8 Billion in qualified opportunities.
- Capital Allocation: ROCE maintained above 45%, reflecting asset-light execution and high cash conversion. More than 80% of net profits returned to shareholders via dividends and share buybacks.`,
    sourceUrl: 'https://www.tcs.com/investor-relations',
    publishedAt: '2026-01-14T17:30:00.000Z',
    metadata: { exchange: 'NSE', sector: 'Information Technology' },
  },

  // =========================================================================
  // HDFC BANK (HDFCBANK)
  // =========================================================================
  {
    id: 'rag_hdfc_01',
    documentId: 'hdfc_post_merger_health',
    symbol: 'HDFCBANK',
    companyName: 'HDFC Bank Limited',
    title: 'HDFC Bank: Post-Merger LDR Normalisation, Asset Quality & NIMs',
    category: 'filing',
    content: `HDFC Bank (NSE: HDFCBANK / BSE: 500180) reported steady progress on key post-merger balance sheet metrics:
1. Loan-to-Deposit Ratio (LDR): Moderated downward towards 100% from 110% through deposit mobilization campaigns and controlled credit growth.
2. Net Interest Margin (NIM): Core NIM annualized at 3.45%–3.50%. Management projects gradual expansion as high-cost liabilities mature.
3. Asset Quality: Gross NPA at 1.28% and Net NPA at 0.35%, ranking among the lowest in Indian banking. Provision Coverage Ratio (PCR) remains robust above 72%.
4. Branch Network: Cross-selling mortgage, auto, credit card, and wealth products across 8,800+ branch touchpoints nationwide.`,
    sourceUrl: 'https://www.hdfcbank.com/investor-relations',
    publishedAt: '2026-01-18T14:00:00.000Z',
    metadata: { exchange: 'NSE', sector: 'Banking' },
  },

  // =========================================================================
  // INFOSYS (INFY)
  // =========================================================================
  {
    id: 'rag_infy_01',
    documentId: 'infy_fy26_outlook',
    symbol: 'INFY',
    companyName: 'Infosys Limited',
    title: 'Infosys: Constant Currency Growth, Topaz AI, and Valuation',
    category: 'earnings',
    content: `Infosys (NSE: INFY / BSE: 500209) reported quarterly revenue of ₹40,980 Crore with constant currency (CC) revenue growth of 4.2% YoY.
- Operating margins stood at 21.2%, inside management's guided band of 20%–22%.
- AI Platform (Infosys Topaz): Over 300 active enterprise generative AI client projects spanning financial fraud detection, automated code refactoring, and supply chain intelligence.
- Valuation: Trading at 26x P/E, with dividend yield hovering around 2.4%. Free cash flow conversion stood at 105% of net profit.`,
    sourceUrl: 'https://www.infosys.com/investors.html',
    publishedAt: '2026-01-16T18:00:00.000Z',
    metadata: { exchange: 'NSE', sector: 'Information Technology' },
  },

  // =========================================================================
  // ICICI BANK (ICICIBANK)
  // =========================================================================
  {
    id: 'rag_icici_01',
    documentId: 'icici_credit_growth',
    symbol: 'ICICIBANK',
    companyName: 'ICICI Bank Limited',
    title: 'ICICI Bank: Industry-Leading Return on Assets (RoA) and Digital Banking',
    category: 'filing',
    content: `ICICI Bank (NSE: ICICIBANK / BSE: 532174) achieved a Return on Assets (RoA) of 2.36% and Return on Equity (RoE) of 18.2%.
- Net Interest Margin (NIM): Resilient at 4.36%, supported by a low-cost CASA (Current Account Savings Account) ratio above 40%.
- Digital Ecosystem: iMobile Pay app drives over 90% of end-to-end retail lending disbursements and credit card originations.
- Capital Adequacy: Tier-1 CRAR remains fortified at 16.1%, providing sufficient buffer for 15%+ organic credit expansion without equity dilution.`,
    sourceUrl: 'https://www.icicibank.com/aboutus/annual.page',
    publishedAt: '2026-01-22T11:00:00.000Z',
    metadata: { exchange: 'NSE', sector: 'Banking' },
  },

  // =========================================================================
  // TATA MOTORS (TATAMOTORS)
  // =========================================================================
  {
    id: 'rag_tatamotors_01',
    documentId: 'tatamotors_ev_jlr',
    symbol: 'TATAMOTORS',
    companyName: 'Tata Motors Limited',
    title: 'Tata Motors: JLR Free Cash Flow, Domestic EV Dominance & Demerger',
    category: 'earnings',
    content: `Tata Motors (NSE: TATAMOTORS / BSE: 500570) posted record quarterly performance propelled by Jaguar Land Rover (JLR) and domestic passenger EV sales:
- JLR Performance: Range Rover, Defender, and Range Rover Sport models accounted for 67% of order books, generating £850 Million in quarterly free cash flow.
- Electric Vehicles: Commands ~68% share in Indian passenger electric vehicles (Nexon EV, Punch EV, Curvv EV).
- Structural Demerger: Board approved splitting into two listed entities: (1) Commercial Vehicles (CVs) and related investments, and (2) Passenger Vehicles (PV, EV, JLR), creating tailored capital allocation for each vehicle cycle.`,
    sourceUrl: 'https://www.tatamotors.com/investors',
    publishedAt: '2026-01-30T16:00:00.000Z',
    metadata: { exchange: 'NSE', sector: 'Automobile' },
  },

  // =========================================================================
  // MACRO: RBI MONETARY POLICY & INFLATION
  // =========================================================================
  {
    id: 'rag_macro_rbi_01',
    documentId: 'rbi_mpc_stance',
    title: 'Reserve Bank of India (RBI) MPC Monetary Policy & Liquidity Framework',
    category: 'macro',
    content: `The Reserve Bank of India Monetary Policy Committee (MPC) maintained the policy repo rate at 6.50% while operating with a 'neutral' stance.
Key implications for Indian capital markets:
1. Banking Spreads: With policy rates stable, deposit competition has peaked, allowing Net Interest Margins (NIMs) of frontline banks to stabilize.
2. CPI Inflation: Headline retail inflation prints near 4.5%–4.8%, inside RBI's statutory tolerance band of 2%–6% with target anchor at 4.0%.
3. Liquidity Operations: RBI actively manages banking system liquidity through variable rate repo (VRR) and reverse repo (VRRR) auctions to balance credit flow and inflation risks.`,
    sourceUrl: 'https://www.rbi.org.in',
    publishedAt: '2026-02-08T09:30:00.000Z',
    metadata: { institution: 'RBI', scope: 'Monetary Policy' },
  },
  {
    id: 'rag_macro_fii_dii_01',
    documentId: 'fii_dii_structural_flows',
    title: 'FII vs DII Institutional Dynamics: The SIP Cushion on Dalal Street',
    category: 'macro',
    content: `Indian equity markets have undergone a structural paradigm shift in institutional liquidity:
- Domestic Institutional Investors (DIIs): Monthly Systematic Investment Plan (SIP) contributions from Indian retail investors consistently exceed ₹25,000 Crore (~$3 Billion/month), channeled via mutual funds and EPFO.
- Foreign Institutional Investors (FIIs): While FII flows oscillate according to US 10-year Treasury yields and dollar index (DXY) movements, domestic institutional inflows have repeatedly cushioned NIFTY 50 corrections to less than 8%–10% during global market drawdowns.`,
    sourceUrl: 'https://www.amfiindia.com',
    publishedAt: '2026-02-12T14:00:00.000Z',
    metadata: { scope: 'Liquidity Flows' },
  },

  // =========================================================================
  // EDUCATIONAL: VALUATION METRICS & REGULATORY SURVEILLANCE
  // =========================================================================
  {
    id: 'rag_edu_pe_01',
    documentId: 'edu_pe_ratio_guide',
    title: 'Understanding Price-to-Earnings (P/E) Ratio in Indian Stock Markets',
    category: 'educational',
    content: `The Price-to-Earnings (P/E) Ratio represents the valuation multiple investors are willing to pay for each ₹1 of annual earnings:
- Formula: Current Market Price (CMP) ÷ Earnings Per Share (EPS).
- Benchmark Context: The NIFTY 50 index historically trades within a 19x to 26x P/E corridor. Values below 20x often indicate attractive historical value, while values above 26x warrant caution.
- Industry Comparison: Always benchmark a stock against its Sector Median (e.g., FMCG typically trades at 45x–55x due to stable cash flows, while Metals trade at 8x–12x due to cyclicality).
- PEG Ratio: Price/Earnings to Growth = P/E ÷ Annual EPS Growth Rate. A PEG < 1.0 suggests a company is undervalued relative to its earnings growth pace.`,
    sourceUrl: 'https://www.nseindia.com/education',
    publishedAt: '2026-01-01T00:00:00.000Z',
    metadata: { topic: 'Valuation' },
  },
  {
    id: 'rag_edu_roce_roe_01',
    documentId: 'edu_roce_roe_guide',
    title: 'ROCE vs ROE: Capital Allocation & Moat Analysis on Dalal Street',
    category: 'educational',
    content: `Return on Capital Employed (ROCE) and Return on Equity (ROE) measure how effectively management reinvests capital:
1. ROCE Formula: Earnings Before Interest & Taxes (EBIT) ÷ Total Capital Employed (Total Assets minus Current Liabilities).
   - Why it matters: ROCE accounts for both debt and equity. It prevents highly leveraged companies from looking artificially profitable. An Indian manufacturing company with ROCE > 18% consistently possesses an economic moat.
2. ROE Formula: Net Profit after Taxes (PAT) ÷ Shareholders' Equity.
   - Caution: A company can artificially inflate ROE by taking on excessive debt. Always verify Debt-to-Equity alongside ROE.
3. Quality Test on Dalal Street: Bluechips like TCS, Titan, and Nestle consistently achieve ROCE > 30% with near-zero debt.`,
    sourceUrl: 'https://www.sebi.gov.in/investor-education.html',
    publishedAt: '2026-01-01T00:00:00.000Z',
    metadata: { topic: 'Financial Health' },
  },
  {
    id: 'rag_edu_promoter_pledging_01',
    documentId: 'edu_promoter_pledging',
    title: 'Promoter Pledging: Risks, Warning Signs, and SEBI Surveillance Rules',
    category: 'educational',
    content: `Promoter Pledging occurs when company founders/promoters use their shares as collateral to borrow loans:
- Primary Risk: If the stock price falls below the lender's margin maintenance threshold, lenders can invoke the pledge and dump shares in the open market, triggering severe price crashes.
- SEBI Rules: Promoters must disclose all encumbrances and pledges within 2 working days. Exchanges automatically highlight companies with high promoter pledge.
- Dalal Street Rule of Thumb: Any company with promoter pledging exceeding 20%–25% of total promoter holdings poses severe governance and solvency risks.`,
    sourceUrl: 'https://www.sebi.gov.in/legal/regulations',
    publishedAt: '2026-01-01T00:00:00.000Z',
    metadata: { topic: 'Corporate Governance' },
  },
  {
    id: 'rag_edu_asm_gsm_01',
    documentId: 'edu_asm_gsm_framework',
    title: 'SEBI & Exchange ASM / GSM Surveillance Framework Explained',
    category: 'educational',
    content: `NSE and BSE implement Additional Surveillance Measure (ASM) and Graded Surveillance Measure (GSM) to safeguard retail investors:
- Triggers: High price volatility, client concentration, sudden surge in volume without financial announcements, or extreme P/E divergence from fundamentals.
- Restrictions on ASM Stocks:
  1. 100% upfront margin required (intraday leverage disabled).
  2. Reduced price bands (5% or 2% circuits).
  3. Trade-to-trade (T2T) settlement (no same-day square off).
- Significance: Placing a stock under ASM is not an indictment of wrongdoing, but an objective warning signal of speculative volatility.`,
    sourceUrl: 'https://www.nseindia.com/reports-and-indices/surveillance',
    publishedAt: '2026-01-01T00:00:00.000Z',
    metadata: { topic: 'Market Surveillance' },
  },
];
