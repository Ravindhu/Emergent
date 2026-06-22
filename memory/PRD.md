# Prop Firm Risk Matrix & Strategy Simulator — PRD

## Vision
A premium, fully-offline mobile app that helps prop-firm traders pick optimal risk per trade, evaluate their edge, and gauge pass probability before paying for a challenge.

## Stack
- React Native Expo (SDK 54) + expo-router file-based routing
- react-native-gifted-charts (line + bar charts)
- @gorhom/bottom-sheet (Control Panel)
- All math is local (no backend, no auth, ephemeral state via React Context)

## Navigation
Bottom tabs: **Dashboard · Matrices · Simulator · Tools**
Pushed routes: strategy-analyzer · optimizer · account-comparison · variance · drawdown-recovery · settings

## Engine (`src/engine/calculator.ts`)
- `expectancyR`, `profitFactor`, `riskOfRuin` (Kelly approximation)
- `passProbabilityClosedForm` — gambler's-ruin × daily-DD survival hazard
- `runSimulation` — Monte Carlo: up to 5,000 paths × 500 trades, trailing/static DD, daily-DD failure, consistency cap, downsampled equity curves, percentile returns + drawdowns
- `gradeStrategy` — A+/A/B/C/D/F composite scoring
- `recoveryNeeded` — drawdown recovery math

## Key Features Implemented
- KPI Dashboard with strategy grade badge (12 KPIs)
- Control Panel bottom sheet (account, strategy, simulation, consistency chips, DD toggles)
- 16×8 interactive heatmap (Pass Probability + ROI modes) with cell detail modal
- Monte Carlo simulator: equity curves (best/median/worst) + drawdown distribution
- Drawdown Recovery bar chart (10% → 75% loss curves)
- Strategy Optimizer (Safe / Balanced / Aggressive recommendations targeting distinct zones)
- Account Comparison ($5K → $200K) with recommended badge
- Variance Comparison with grouped bar chart + side-by-side cards
- Strategy Analyzer with full edge/risk/drawdown breakdown
- Settings + Reset

## Theme
Dark hedge-fund aesthetic: #121212 background, #1E1E24 cards, neon #00FF88 / #FFD54F / #FF5252 accents.
