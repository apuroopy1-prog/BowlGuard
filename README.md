# BowlGuard — Fast Bowler Workload Management

AI-powered workload management for state-level cricket fast bowlers.
Tracks bowling load, calculates injury risk (ACWR), and gives AI recommendations.

## Quick Start

1. Open `index.html` in your browser — that's it
2. Or use VS Code Live Server: right-click index.html → Open with Live Server

## Project Structure

```
bowlguard-app/
├── index.html              # Main app (3 screens)
├── css/
│   ├── styles.css          # Base styles, variables, nav
│   ├── dashboard.css       # Dashboard screen
│   ├── log.css             # Log session screen
│   ├── history.css         # History screen
│   └── ai.css              # AI recommendation card
├── js/
│   ├── store.js            # localStorage data layer
│   ├── acwr.js             # ACWR sports science engine
│   ├── ai.js               # AI engine (Claude API + rule-based fallback)
│   ├── dashboard.js        # Dashboard rendering
│   ├── log.js              # Session logging form
│   ├── history.js          # History list
│   └── app.js              # Main controller
└── assets/
```

## Enable Claude AI Recommendations

Default: Rule-based recommendations (works offline, no key needed)

To enable Claude AI:
1. Get API key at https://console.anthropic.com/
2. Open js/ai.js line 13
3. Replace YOUR_API_KEY_HERE with your key

Warning: For production, use a backend proxy. Never expose keys in frontend.

## ACWR Algorithm

ACWR = This week's balls / 4-week average balls per week
- Below 0.8 = Undertrained (yellow)
- 0.8 to 1.3 = Sweet spot (green)
- 1.3 to 1.5 = Caution (yellow)
- Above 1.5 = High risk (red)

Based on: Hulin et al. (2014), British Journal of Sports Medicine
