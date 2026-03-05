# BowlGuard

> **AI-powered workload management for cricket fast bowlers** — tracks bowling load, calculates injury risk using ACWR sports science, and delivers Claude AI recommendations.

[![Claude](https://img.shields.io/badge/Anthropic_Claude-AI_Recommendations-8B5CF6)](https://anthropic.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla_JS-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML](https://img.shields.io/badge/HTML5-CSS3-E34F26?logo=html5&logoColor=white)](https://html.spec.whatwg.org)

---

## What It Does

BowlGuard helps cricket coaches and physiotherapists manage fast bowler workloads scientifically. It implements the **ACWR (Acute:Chronic Workload Ratio)** — a validated sports science model from the British Journal of Sports Medicine — and layers Claude AI on top to give personalized, context-aware training recommendations.

No backend required. Runs entirely in the browser with `localStorage` persistence.

---

## Features

| Feature | Details |
|---|---|
| **ACWR Engine** | Calculates Acute:Chronic Workload Ratio from session history |
| **Injury Risk Zones** | Color-coded dashboard: Undertrained / Sweet Spot / Caution / High Risk |
| **Claude AI Recommendations** | AI analysis of workload trend with actionable coaching advice |
| **Rule-Based Fallback** | Works fully offline without an API key |
| **Session Logging** | Log bowling sessions with balls bowled, intensity, date |
| **History View** | Full session history with ACWR trend |
| **Rate Limiting** | Backend proxy with per-IP rate limiting (10 req/min) |
| **Zero Dependencies** | Pure HTML/CSS/JavaScript — no npm, no build step |

---

## ACWR Sports Science

```
ACWR = This week's balls bowled / 4-week rolling average

< 0.8   → Undertrained   (yellow) — increase load gradually
0.8–1.3 → Sweet Spot     (green)  — optimal training zone
1.3–1.5 → Caution        (yellow) — monitor closely
> 1.5   → High Risk      (red)    — injury risk, reduce load
```

Based on: **Hulin et al. (2014)**, British Journal of Sports Medicine — the gold standard for cricket fast bowler workload management.

---

## Architecture

```
Browser (Vanilla JS)
├── store.js      → localStorage data layer
├── acwr.js       → ACWR sports science calculation engine
├── ai.js         → Claude API client + rule-based fallback
├── dashboard.js  → Risk zone rendering + trend charts
├── log.js        → Session logging form
├── history.js    → Session history list
└── app.js        → Main controller

Optional: Python server.py → Proxies Claude API calls (CORS + rate limiting)
```

---

## Quick Start

### Option 1: Direct (no server needed)
```bash
# Just open in browser
open index.html
# Or: right-click index.html → Open with Live Server (VS Code)
```

### Option 2: With Claude AI (full features)

```bash
# Start the proxy server
export ANTHROPIC_API_KEY=your_key_here
python server.py
# Open http://localhost:8000
```

---

## Enable Claude AI Recommendations

By default, BowlGuard uses rule-based recommendations (works offline).

To enable Claude AI:
1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Set env var: `export ANTHROPIC_API_KEY=your_key`
3. Run `python server.py` — it proxies requests with rate limiting

> Never hardcode API keys in frontend JavaScript. The server.py proxy keeps your key server-side.

---

## Project Structure

```
bowlguard-app/
├── index.html          # Main app (3 screens: Dashboard, Log, History)
├── server.py           # Python CORS proxy with rate limiting
├── css/
│   ├── styles.css      # Base styles, CSS variables, nav
│   ├── dashboard.css   # ACWR risk zone dashboard
│   ├── log.css         # Session logging form
│   ├── history.css     # History view
│   └── ai.css          # AI recommendation card
├── js/
│   ├── store.js        # localStorage data layer
│   ├── acwr.js         # ACWR calculation engine
│   ├── ai.js           # Claude API + rule-based fallback
│   ├── dashboard.js    # Dashboard rendering
│   ├── log.js          # Session logging
│   ├── history.js      # History list
│   └── app.js          # Main controller
└── assets/
```

---

## Built By

**Apuroop Yarabarla** — AI/ML Engineer & AI Product Owner

[![LinkedIn](https://img.shields.io/badge/LinkedIn-apuroopyarabarla-0077B5?logo=linkedin)](https://linkedin.com/in/apuroopyarabarla)
[![GitHub](https://img.shields.io/badge/GitHub-apuroopy1--prog-181717?logo=github)](https://github.com/apuroopy1-prog)
