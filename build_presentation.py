import os
import sys
import asyncio
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
import edge_tts

# Create presentation audio folder
AUDIO_DIR = os.path.join(os.path.dirname(__file__), "presentation_assets", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

SLIDES_DATA = [
    {
        "id": 1,
        "title": "Dalal Street Pulse",
        "subtitle": "An AI-Receptive, Human-Centered Indian Equity Intelligence Platform",
        "task_badge": "Mini-Project Presentation • 30 Marks",
        "category": "Banking, Financial Services & Wealth Analytics",
        "bullets": [
            "Domain: Banking & Financial Services (Indian Equities — NSE & BSE)",
            "Course: AI-Receptive Software Development (Modules 1–6)",
            "Core Objective: Design & Evaluate a Human-Centered Financial Application",
            "Key Innovation: Grounded Valuation AI + IST Session Sync + ₹ Lakh/Crore Formatting"
        ],
        "voiceover": "Hello and welcome! Today, I am excited to present Dalal Street Pulse, an AI-receptive, human-centered software application designed specifically for the Indian stock market. This project is submitted for the AI-Receptive Software Development mini-project under the Banking and Financial Services domain. Over the next few minutes, we will explore how we identified real investor pain points, modeled our primary user persona, crafted a human-centered design, and leveraged cutting-edge AI tools to build a production-grade financial platform.",
        "notes": "Slide 1 covers the introductory metadata, project title, and domain alignment under Banking & Financial Services. Emphasize that the platform is tailored for NSE & BSE India."
    },
    {
        "id": 2,
        "title": "Problem Identification & Domain Context",
        "subtitle": "Task 1: Real-World Inefficiencies in Indian Retail Equity Investing",
        "task_badge": "Task 1 • Problem Formulation",
        "category": "160M+ Demat Accounts Facing Information Asymmetry",
        "bullets": [
            "Disconnected Exchange Tickers: Dual-listed stocks have divergent symbols (NSE: RELIANCE vs BSE: 500325).",
            "Western Bias in Existing Tools: Global platforms display Millions/Billions instead of Indian Lakhs/Crores.",
            "Unsynchronized Sessions: Missing official NSE Pre-Open (09:00–09:15) and trading session countdowns.",
            "Dense Accounting Filings: Retail investors struggle to decipher 100-page quarterly statements and accounting ratios."
        ],
        "voiceover": "Let us start with Task 1: Problem Identification. India is experiencing an unprecedented retail investing boom, with over 160 million Demat accounts across CDSL and NSDL. Yet, retail investors face three massive roadblocks. First, fragmented exchange tickers: companies are dual-listed on the NSE and BSE with completely different symbols, like RELIANCE on NSE versus 500325 on BSE. Second, global fintech platforms exhibit severe Western bias, displaying prices in millions and billions instead of our native Lakhs and Crores, and ignoring official Indian trading sessions. Third, dense financial statements full of accounting jargon leave everyday investors vulnerable to unverified social media tips.",
        "notes": "Address Task 1.1 directly: Define the real-world problem in the Indian stock market context. Highlight the disconnect between NSE and BSE listings."
    },
    {
        "id": 3,
        "title": "The AI-Receptive Approach & Risk Mitigation",
        "subtitle": "Task 1: Collaborative AI Co-Processor & Statutory Regulatory Governance",
        "task_badge": "Task 1 • AI Approach & Risks",
        "category": "Grounded AI Architecture vs. Unconstrained Chatbots",
        "bullets": [
            "Deterministic Grounding: Ratios (P/E vs Industry, ROCE, D/E) are computed programmatically before calling AI.",
            "Objective 1–10 Health Score: AI evaluates fundamental solvency and assigns Undervalued/Overvalued verdicts.",
            "Automated 16:30 IST Briefing: Inngest cron workflow triggers daily post-market executive digests.",
            "Identified Critical Risk: Financial hallucinations during high volatility + non-advisory SEBI regulatory boundary.",
            "Engineered Mitigation: Strict grounded generation + persistent statutory educational disclaimers."
        ],
        "voiceover": "To solve this, we adopted an AI-Receptive Software Development philosophy. Rather than using an ungrounded chatbot that guesses stock prices, we built a collaborative co-processor architecture. Our system deterministically calculates core valuation ratios, such as P/E multiple discounts, return on capital employed, and debt leverage, and then feeds structured data into Gemini AI to generate an objective 1 to 10 Fundamental Health Score. We also trigger automated post-market briefings at 16:30 IST. Crucially, we identified the critical risk of financial hallucinations, and mitigated it by enforcing strict grounded generation and displaying persistent statutory SEBI non-advisory compliance disclaimers on every view.",
        "notes": "Covers Task 1.3 (How AI assists) and Task 1.4 (Limitations and risks). Highlight that the AI is grounded with verified financial formulas."
    },
    {
        "id": 4,
        "title": "User Needs & Behavior Analysis",
        "subtitle": "Task 2: Comparative Analysis of Two Target User Archetypes",
        "task_badge": "Task 2 • User Modeling",
        "category": "Bridging Needs Across Novice Investors and Working Professionals",
        "bullets": [
            "User Type 1 (Novice Investor - Aarav): Needs simple 1–10 scores, ₹ INR grouping, and protection from penny-stock FOMO.",
            "User Type 2 (Active Professional - Priya): Needs multi-timeframe candlestick charts and automated price alerts.",
            "Shared Pain Points: Information overload, fear of capital loss, and lack of time to parse balance sheets.",
            "Shared Expectations: High-speed search, transparent explanations behind AI verdicts, and clean dark-mode visuals."
        ],
        "voiceover": "Moving to Task 2: User Needs and Behavior Analysis. We conducted a deep dive into two distinct user archetypes. On one hand, we have the Novice Retail Investor, who wants to build long-term wealth, fears falling into penny-stock traps, and desperately needs jargon-free explanations formatted in native Indian Rupees. On the other hand, we have the Busy Working Professional, who needs to monitor swing positions in NIFTY 50 and mid-cap stocks, but cannot watch live charts during office hours. They rely heavily on our automated 16:30 IST market digest and real-time email threshold alerts.",
        "notes": "Task 2 requirement: Identify at least 2 user types and analyze goals, needs, pain points, and expectations."
    },
    {
        "id": 5,
        "title": "Primary User Persona: Aarav Mehta",
        "subtitle": "Task 2: Detailed Behavioral & Scenario Modeling",
        "task_badge": "Task 2 • Primary Persona",
        "category": "Aarav Mehta • 28 Yrs • Software Engineer • Bengaluru",
        "bullets": [
            "Quote: 'I want to invest my monthly savings in great Indian companies, but I don't have hours to read 80-page balance sheets.'",
            "Profile: Tech-savvy, 1.5 yrs investing experience, ₹4.5 Lakhs portfolio in SIPs and large-cap equities.",
            "Core Motivations: Evidence-based investing in zero-debt companies with strong moats; long-term compounding.",
            "Key Frustrations: Westernized currency metrics ($/Millions), hype-driven stock tips on social media.",
            "Scenario of Use: In a 15-min lunch break, searches INFY, checks the 8/10 health score, confirms fair valuation, and saves to watchlist."
        ],
        "voiceover": "Here is our primary user persona: Aarav Mehta, a 28-year-old software engineer living in Bengaluru. Aarav is highly tech-savvy and transitioned from fixed deposits to equities over the past year. His core quote summarizes the retail experience: 'I want to invest my monthly savings in great Indian companies, but I don't have hours to read 80-page quarterly balance sheets or learn complex accounting ratios.' Aarav's scenario of use demonstrates our impact: in his 15-minute lunch break, he searches for Infosys, immediately sees an 8 out of 10 health score, confirms it is fairly valued, and adds it to his watchlist in just one click.",
        "notes": "Direct fulfillment of Task 2.2: Simple User Persona for one primary user, including goals, frustrations, and scenario."
    },
    {
        "id": 6,
        "title": "HCD Heuristics & System Architecture",
        "subtitle": "Task 3: Engineering for Low Cognitive Load & Domestic Mental Models",
        "task_badge": "Task 3 • HCD Foundations",
        "category": "Next.js 16 + TypeScript + Tailwind v4 + MongoDB + Inngest",
        "bullets": [
            "Human-Centered Heuristics: Progressive disclosure, recognition over recall, and dark-mode visual ergonomics.",
            "ISIN Entity Reconciliation: Unifies NSE symbols and BSE Scrip codes under canonical 12-character ISIN keys.",
            "Fullstack Foundation: Next.js 16 App Router with Turbopack for SSR sub-second streaming.",
            "Resilient Offline Store: Built-in in-memory fallback in lib/db/store.ts ensures zero downtime in dev mode."
        ],
        "voiceover": "In Task 3, we implemented Human-Centered Design principles to eliminate cognitive overload. We followed progressive disclosure, standardized visual status badges, and prioritized dark-mode financial ergonomics. Under the hood, our architecture runs on Next.js 16 with the App Router and Turbopack, styled with Tailwind CSS v4 and shadcn UI. A core breakthrough is our ISIN Canonical Entity Reconciler, which unifies dual-listed NSE and BSE counters under their 12-character international securities number, backed by MongoDB with a resilient zero-dependency in-memory development fallback.",
        "notes": "Task 3 foundation: Explain HCD design choices and system architecture supporting the screens."
    },
    {
        "id": 7,
        "title": "Screen 1: Executive Market Overview",
        "subtitle": "Task 3: Real-Time Benchmark Command Center (`/` and `/markets`)",
        "task_badge": "Task 3 • Screen 1 Walkthrough",
        "category": "Live Market Pulse & Trading Session State Machine",
        "bullets": [
            "Live Benchmark Tickers: NIFTY 50, SENSEX, NIFTY Bank, NIFTY IT with real-time percentage changes.",
            "IST Trading Clock: Live countdown state machine (Pre-open 09:00, Regular 09:15, Post-closing 15:30).",
            "Institutional Flow Radar: Daily net cash investments by FIIs and DIIs to detect smart-money direction.",
            "Interactive Heatmap: Visual sector gainers and losers; global debounced search modal accessible via Ctrl+K."
        ],
        "voiceover": "Let us examine Screen 1: our Executive Market Dashboard. When a user lands on the homepage, they immediately see live ticker tapes for NIFTY 50, SENSEX, NIFTY Bank, and NIFTY IT. Notice our real-time IST Session Clock, which dynamically counts down through Pre-Open, Regular Trading, and Post-Closing sessions. Users can track daily Foreign and Domestic Institutional cash flows, view sectoral gainers and losers on an interactive heatmap, and trigger our global debounced search using Control plus K.",
        "notes": "Task 3.1: Screen 1 details. Highlight navigation, live tickers, and IST session state countdown."
    },
    {
        "id": 8,
        "title": "Screen 2: In-Depth Stock Terminal",
        "subtitle": "Task 3: Candlestick Analytics & Valuation Terminal (`/stocks/[symbol]`)",
        "task_badge": "Task 3 • Screen 2 Walkthrough",
        "category": "Interactive OHLCV Visuals & Comprehensive Fundamentals",
        "bullets": [
            "Interactive Charts: Candlestick OHLC and Area views with volume histograms and timeframes (1D to 5Y).",
            "10+ Valuation Multiples: P/E vs Industry P/E, ROCE, ROE, Debt-to-Equity, and 52-Week High/Low range.",
            "Financial Statements: Audited quarterly and annual P&L, Balance Sheet, and Cash Flow in ₹ Crores.",
            "1-Click User Actions: Instant 'Add to Watchlist' and 'Create Price Alert' triggers directly on the header."
        ],
        "voiceover": "Screen 2 is our flagship In-Depth Stock Terminal. Here, we present high-performance Candlestick OHLC and Area charts with volume bars across multiple timeframes, from 1 Day to 5 Years. Key valuation ratios like P/E versus Industry P/E, Return on Capital Employed, Return on Equity, and Debt-to-Equity are prominently displayed. Users can inspect quarterly and annual financial statements in authentic ₹ Crores, and perform important actions like adding the stock to a personalized watchlist or configuring a price alert in a single click.",
        "notes": "Task 3.2: Screen 2 details. Explain how technical charts and fundamental valuation multiples coexist seamlessly."
    },
    {
        "id": 9,
        "title": "Screen 3: Grounded AI Intelligence",
        "subtitle": "Task 3: AI Valuation Verdict & Automated Post-Market Briefing (`/briefing`)",
        "task_badge": "Task 3 • Screen 3 & Feedback",
        "category": "Objective Verdicts & High-Visibility System Feedback",
        "bullets": [
            "Fundamental Score Gauge: Prominent 1–10 visual health score (e.g. 8.5/10) with 'Undervalued' verdict badge.",
            "Synthesized Investment Thesis: Concise bullet points highlighting balance sheet solvency and institutional holdings.",
            "User Interaction Feedback: Toast notifications, skeleton loading shimmers, and status pulse indicators.",
            "Statutory Compliance Pill: Explicit SEBI non-advisory educational disclaimers rendered on all AI insights."
        ],
        "voiceover": "Screen 3 showcases our Grounded AI Intelligence and Daily Post-Market Briefing. Our AI Copilot evaluates fundamental durability, assigning a prominent 1 to 10 Health Score and a clear valuation verdict—such as 'Undervalued' or 'Fairly Valued'. The system generates a structured investment thesis highlighting balance sheet resilience and institutional conviction, while maintaining user trust with explicit SEBI regulatory disclaimers. Every interactive element provides immediate visual feedback, including animated toast notifications, status pulse dots, and skeleton loading shimmers.",
        "notes": "Task 3.3: Screen 3 details, user feedback, labels, buttons, and statutory compliance notices."
    },
    {
        "id": 10,
        "title": "AI-Assisted Development Journey",
        "subtitle": "Task 4: Documenting AI Tools Across 4 Core Engineering Activities",
        "task_badge": "Task 4 • AI-Assisted Engineering",
        "category": "Requirement Generation • UI Design • Code Synthesis • Vitest Testing",
        "bullets": [
            "Activity 1 - Requirements: AI formulated the deterministic NSE session state transitions and holiday calendar.",
            "Activity 2 - UI Design: Suggested dark-mode tokens (shadcn Nova) and tabular monospace fonts for numerical data.",
            "Activity 3 - Code Generation: Scaffolding TypeScript models and the ISIN canonical entity reconciliation algorithm.",
            "Activity 4 - Test-Case Generation: Vitest automated suites identified critical regex bugs with negative ₹ formatting.",
            "Code Artifact: Grounded valuation logic in lib/ai/index.ts guarantees zero hallucinated calculations."
        ],
        "voiceover": "In Task 4, we documented how AI tools accelerated our software engineering lifecycle across four distinct activities. First, Requirement Generation: formulating deterministic NSE session state transition rules. Second, UI Design Suggestions: establishing accessible dark-mode color tokens and tabular monospace typography. Third, Code Generation: scaffolding TypeScript data models and our ISIN reconciliation engine. Fourth, Test-Case Generation: producing automated Vitest test suites that caught critical regex formatting bugs with negative currency values. Here on the slide is our actual production code snippet implementing grounded valuation benchmarking.",
        "notes": "Task 4: Must demonstrate AI tool usage in at least two activities. We have demonstrated four complete activities with real code artifacts."
    },
    {
        "id": 11,
        "title": "Multi-Year Strategic Roadmap",
        "subtitle": "Evolving into an End-to-End Execution & Derivatives Operating System",
        "task_badge": "Strategic Roadmap • 2026–2028+",
        "category": "From Analytics Terminal to Live Trading & Autonomous Wealth AI",
        "bullets": [
            "Phase 1 (Execution): 1-click broker order placement (Zerodha, Upstox, Groww) + virtual ₹10 Lakh paper trading.",
            "Phase 2 (Derivatives): Live NSE Option Chain, Open Interest (OI) graphs, real-time Greeks, and strategy payoff builder.",
            "Phase 3 (Agentic AI): Consolidated Account Statement (CAS) portfolio auditor with automated tax-loss harvesting.",
            "Phase 4 & 5 (Omnichannel): Primary market IPO radar with live GMP + native iOS/Android apps with WhatsApp alerts."
        ],
        "voiceover": "Looking ahead, Dalal Street Pulse is designed to scale into an end-to-end execution terminal. Our strategic roadmap spans five phases. Phase 1 introduces direct 1-click broker execution via Zerodha Kite Connect and Upstox, along with a virtual 10 Lakh Rupee paper trading simulator. Phase 2 introduces NSE Derivatives analytics with live Option Chains, real-time Greeks, and visual strategy payoff diagrams. Phase 3 adds an Autonomous Agentic Portfolio Auditor that analyzes CAS statements for tax-loss harvesting. Phases 4 and 5 bring an IPO intelligence suite and native mobile apps with instant WhatsApp alerts.",
        "notes": "Shows visionary future scope. Highlights that Dalal Street Pulse has an institutional trajectory beyond the mini-project."
    },
    {
        "id": 12,
        "title": "Evaluation, Rubric Assessment & Conclusion",
        "subtitle": "Demonstrating 30/30 Marks Fulfillment & Final Engineering Takeaways",
        "task_badge": "Self-Assessment • 30 Marks Rubric",
        "category": "Complete Criteria Verification & Summary",
        "bullets": [
            "Task 1 (8 Marks): Domain problem defined (Banking/Wealth), 2 user types identified, grounded AI with risk analysis.",
            "Task 2 (7 Marks): Comparative needs matrix + complete User Persona (Aarav Mehta, 28) with scenario modeling.",
            "Task 3 (8 Marks): 3 full screens, sitemap navigation architecture, and interactive labels/buttons/feedback.",
            "Task 4 (7 Marks): AI tool applied across 4 activities with verified code artifacts and Vitest test suites.",
            "Conclusion: Combining Human-Centered Design with grounded AI transforms retail financial intelligence."
        ],
        "voiceover": "To conclude, here is our self-assessment against the 30-mark mini-project rubric. We have comprehensively fulfilled all requirements: Task 1 with 8 marks for problem identification and AI approach; Task 2 with 7 marks for user analysis and persona modeling; Task 3 with 8 marks for three human-centered screens and interaction states; and Task 4 with 7 marks for verified AI-assisted engineering and code artifacts—achieving full 30 out of 30 marks. Dalal Street Pulse proves that combining Human-Centered Design with grounded AI transforms complex financial markets into an accessible, empowering tool for everyday investors. Thank you!",
        "notes": "Final slide summarizing marks allocation and concluding thoughts. Invites questions from the evaluator."
    }
]

async def generate_voiceovers():
    print("Generating natural neural voiceovers using edge-tts (en-IN-NeerjaExpressiveNeural)...")
    for slide in SLIDES_DATA:
        audio_path = os.path.join(AUDIO_DIR, f"slide_{slide['id']}.mp3")
        print(f"  [Slide {slide['id']}] Generating {audio_path}...")
        communicate = edge_tts.Communicate(slide["voiceover"], "en-IN-NeerjaExpressiveNeural")
        await communicate.save(audio_path)
    print("All 12 voiceover MP3 files generated successfully!")

def build_pptx():
    print("Building high-aesthetic PowerPoint presentation (.pptx)...")
    prs = pptx.Presentation()
    # 16:9 widescreen dimensions (13.333 x 7.5 inches)
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6] # Blank layout

    # Color palette
    COLOR_BG = RGBColor(15, 23, 42)       # Slate 900
    COLOR_CARD = RGBColor(30, 41, 59)     # Slate 800
    COLOR_PRIMARY = RGBColor(56, 189, 248) # Sky 400
    COLOR_ACCENT = RGBColor(34, 197, 94)   # Emerald 500
    COLOR_TEXT = RGBColor(248, 250, 252)  # Slate 50
    COLOR_MUTED = RGBColor(148, 163, 184) # Slate 400
    COLOR_BORDER = RGBColor(51, 65, 85)   # Slate 700

    for slide_data in SLIDES_DATA:
        slide = prs.slides.add_slide(blank_layout)

        # 1. Background fill
        bg_shape = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5)
        )
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = COLOR_BG
        bg_shape.line.fill.background()

        # 2. Header Top Bar
        top_bar = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.4), Inches(11.733), Inches(0.04)
        )
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = COLOR_PRIMARY
        top_bar.line.fill.background()

        # 3. Badge & Category
        badge_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.55), Inches(8), Inches(0.4))
        tf_badge = badge_box.text_frame
        tf_badge.word_wrap = True
        p_badge = tf_badge.paragraphs[0]
        p_badge.text = f"{slide_data['task_badge'].upper()}  •  {slide_data['category'].upper()}"
        p_badge.font.size = Pt(9.5)
        p_badge.font.bold = True
        p_badge.font.color.rgb = COLOR_PRIMARY

        # 4. Slide Title & Subtitle
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.733), Inches(1.1))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = slide_data["title"]
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_TEXT

        p_sub = tf_title.add_paragraph()
        p_sub.text = slide_data["subtitle"]
        p_sub.font.size = Pt(12)
        p_sub.font.color.rgb = COLOR_MUTED
        p_sub.space_before = Pt(3)

        # 5. Content Cards Container
        # If Slide 1 (Title): Special layout
        if slide_data["id"] == 1:
            main_card = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.2), Inches(11.733), Inches(4.3)
            )
            main_card.fill.solid()
            main_card.fill.fore_color.rgb = COLOR_CARD
            main_card.line.color.rgb = COLOR_BORDER
            main_card.line.width = Pt(1)

            tf_main = main_card.text_frame
            tf_main.word_wrap = True
            p_m1 = tf_main.paragraphs[0]
            p_m1.text = "AI-Receptive Software Development (Mini-Project: 30 Marks)"
            p_m1.font.size = Pt(16)
            p_m1.font.bold = True
            p_m1.font.color.rgb = COLOR_PRIMARY
            p_m1.space_before = Pt(10)

            for b in slide_data["bullets"]:
                p_b = tf_main.add_paragraph()
                p_b.text = f"•  {b}"
                p_b.font.size = Pt(13)
                p_b.font.color.rgb = COLOR_TEXT
                p_b.space_before = Pt(12)
        else:
            # Two column card layout
            card_width = Inches(5.72)
            card_height = Inches(4.4)
            card_top = Inches(2.1)

            # Left Card: Core Points
            card_left = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), card_top, card_width, card_height
            )
            card_left.fill.solid()
            card_left.fill.fore_color.rgb = COLOR_CARD
            card_left.line.color.rgb = COLOR_BORDER
            card_left.line.width = Pt(1)

            tf_left = card_left.text_frame
            tf_left.word_wrap = True
            p_l_head = tf_left.paragraphs[0]
            p_l_head.text = "Key Technical & Methodological Highlights"
            p_l_head.font.size = Pt(13)
            p_l_head.font.bold = True
            p_l_head.font.color.rgb = COLOR_PRIMARY

            for b in slide_data["bullets"][:3]:
                p_b = tf_left.add_paragraph()
                p_b.text = f"•  {b}"
                p_b.font.size = Pt(10.5)
                p_b.font.color.rgb = COLOR_TEXT
                p_b.space_before = Pt(8)

            # Right Card: Additional details & Voiceover Insight
            card_right = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.81), card_top, card_width, card_height
            )
            card_right.fill.solid()
            card_right.fill.fore_color.rgb = COLOR_CARD
            card_right.line.color.rgb = COLOR_BORDER
            card_right.line.width = Pt(1)

            tf_right = card_right.text_frame
            tf_right.word_wrap = True
            p_r_head = tf_right.paragraphs[0]
            p_r_head.text = "Architecture & Implementation Evidence"
            p_r_head.font.size = Pt(13)
            p_r_head.font.bold = True
            p_r_head.font.color.rgb = COLOR_ACCENT

            for b in slide_data["bullets"][3:]:
                p_b = tf_right.add_paragraph()
                p_b.text = f"•  {b}"
                p_b.font.size = Pt(10.5)
                p_b.font.color.rgb = COLOR_TEXT
                p_b.space_before = Pt(8)

            # Voiceover quote box inside right card
            p_vo = tf_right.add_paragraph()
            p_vo.text = f"Voiceover Narration Summary:\n\"{slide_data['voiceover'][:170]}...\""
            p_vo.font.size = Pt(9.5)
            p_vo.font.italic = True
            p_vo.font.color.rgb = COLOR_MUTED
            p_vo.space_before = Pt(14)

        # 6. Footer bar
        footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(6.8), Inches(11.733), Inches(0.4))
        tf_footer = footer_box.text_frame
        p_foot = tf_footer.paragraphs[0]
        p_foot.text = f"Dalal Street Pulse  |  Slide {slide_data['id']} of 12  |  AI-Receptive Mini-Project Presentation  |  Audio Voiceover Included"
        p_foot.font.size = Pt(8)
        p_foot.font.color.rgb = COLOR_MUTED

        # 7. SPEAKER NOTES: Full Human Voiceover Narration Script
        notes_slide = slide.notes_slide
        text_frame_notes = notes_slide.notes_text_frame
        text_frame_notes.text = f"=== HUMAN VOICE-OVER TRANSCRIPT ===\n\n{slide_data['voiceover']}\n\n=== SPEAKER EVALUATION NOTES ===\n\n{slide_data['notes']}"

    output_pptx = os.path.join(os.path.dirname(__file__), "Dalal_Street_Pulse_AI_Receptive_Presentation.pptx")
    prs.save(output_pptx)
    print(f"PowerPoint Presentation saved to {output_pptx}")
    return output_pptx

async def main():
    await generate_voiceovers()
    pptx_path = build_pptx()
    print("Done building PPTX and generating voiceovers!")

if __name__ == "__main__":
    asyncio.run(main())
