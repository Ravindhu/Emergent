// ============================================================
// PROP FIRM RISK CALCULATION ENGINE
// All math is local. Pure functions.
// ============================================================

export type DDMode = "trailing" | "static";

export interface StrategyInputs {
  accountSize: number;          // $
  profitTargetPct: number;      // % of account
  maxDrawdownPct: number;       // % of account
  dailyDrawdownPct: number;     // % of account
  profitSplitPct: number;       // % paid to trader
  challengeFee: number;         // $
  winRate: number;              // 0..100
  rr: number;                   // risk reward (reward / risk)
  riskPerTradePct: number;      // % of account risked per trade
  tradesPerDay: number;
  consistencyRulePct: number;   // 0 = off, else max % of total profit any single day can contribute
  simulationPaths: number;
  tradesPerSimulation: number;
  ddMode: DDMode;
}

export const defaultInputs: StrategyInputs = {
  accountSize: 100000,
  profitTargetPct: 10,
  maxDrawdownPct: 10,
  dailyDrawdownPct: 5,
  profitSplitPct: 80,
  challengeFee: 500,
  winRate: 50,
  rr: 2,
  riskPerTradePct: 1,
  tradesPerDay: 5,
  consistencyRulePct: 0,
  simulationPaths: 500,
  tradesPerSimulation: 500,
  ddMode: "trailing",
};

// ---------- Closed-form metrics ----------

export const expectancyR = (winRatePct: number, rr: number): number => {
  const p = winRatePct / 100;
  return p * rr - (1 - p) * 1; // in units of R
};

export const profitFactor = (winRatePct: number, rr: number): number => {
  const p = winRatePct / 100;
  const grossWin = p * rr;
  const grossLoss = (1 - p) * 1;
  if (grossLoss === 0) return 99;
  return grossWin / grossLoss;
};

export const avgStreak = (probEvent: number): number => {
  // expected longest streak ~ -log(N)/log(1-p) but here approx avg streak length = 1/(1-p)
  if (probEvent <= 0) return 0;
  if (probEvent >= 1) return 99;
  return 1 / (1 - probEvent);
};

// Risk of Ruin (Kelly approximation):
// RoR = ((1-edge)/(1+edge))^units  where edge = (p*rr - (1-p))/rr ratio simplified
// Use the standard formula: RoR = ((1 - A)/(1 + A))^U
// A = win% - loss% (advantage in R units normalized)
export const riskOfRuin = (
  winRatePct: number,
  rr: number,
  riskPerTradePct: number,
  maxDrawdownPct: number
): number => {
  const p = winRatePct / 100;
  const q = 1 - p;
  // Edge per R risked, normalized by mean abs payoff
  const mean = p * rr - q * 1;
  const meanAbs = p * rr + q * 1;
  if (meanAbs === 0) return 1;
  const A = mean / meanAbs; // edge
  if (A <= 0) return 1;
  // Units of risk available before ruin
  const units = riskPerTradePct > 0 ? maxDrawdownPct / riskPerTradePct : 1000;
  const base = (1 - A) / (1 + A);
  return Math.max(0, Math.min(1, Math.pow(base, units)));
};

// Strategy grade
export const gradeStrategy = (
  passProb: number,
  ror: number,
  pf: number,
  expectancy: number
): string => {
  // Score 0..100
  let score = 0;
  score += Math.max(0, Math.min(40, passProb * 0.4)); // up to 40
  score += Math.max(0, Math.min(25, (1 - ror) * 25));  // up to 25
  score += Math.max(0, Math.min(20, (pf - 1) * 10));   // up to 20
  score += Math.max(0, Math.min(15, expectancy * 30)); // up to 15
  if (score >= 88) return "A+";
  if (score >= 75) return "A";
  if (score >= 62) return "B";
  if (score >= 48) return "C";
  if (score >= 32) return "D";
  return "F";
};

// Drawdown recovery math
export const recoveryNeeded = (lossPct: number): number => {
  // loss% -> required % gain
  if (lossPct >= 100) return Infinity;
  return (lossPct / (100 - lossPct)) * 100;
};

// ---------- Monte Carlo simulation ----------

export interface PathResult {
  equity: number[];        // sampled equity curve (downsampled to ~50 points)
  peak: number;
  finalEquity: number;
  maxDrawdownPct: number;
  reachedTarget: boolean;
  failed: boolean;
}

export interface SimResult {
  paths: PathResult[];
  passProbability: number;  // 0..100
  riskOfRuinSim: number;    // 0..1
  avgReturn: number;
  medianReturn: number;
  bestReturn: number;
  worstReturn: number;
  ci95: [number, number];
  avgMaxDrawdownPct: number;
  medianMaxDrawdownPct: number;
  p95MaxDrawdownPct: number;
  worstMaxDrawdownPct: number;
  avgWinStreak: number;
  avgLossStreak: number;
  expectedPayout: number;
  expectedROI: number;
  recoveryFactor: number;
  sharpeLike: number;
  varianceScore: number;
}

interface SimOptions {
  winRate: number;          // 0..1
  rr: number;
  riskPerTradePct: number;  // 0..100 (% of account)
  accountSize: number;
  profitTargetPct: number;
  maxDrawdownPct: number;
  dailyDrawdownPct: number;
  consistencyRulePct: number;
  tradesPerDay: number;
  tradesPerSimulation: number;
  ddMode: DDMode;
  paths: number;
  profitSplitPct: number;
  challengeFee: number;
  collectPaths?: number; // how many curves to store for display
}

// Mulberry32 PRNG for reproducible-ish runs
const rng = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const downsample = (arr: number[], n: number): number[] => {
  if (arr.length <= n) return arr.slice();
  const out: number[] = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  out.push(arr[arr.length - 1]);
  return out;
};

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
};

const stdev = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length;
  return Math.sqrt(v);
};

export const runSimulation = (opts: SimOptions): SimResult => {
  const {
    winRate, rr, riskPerTradePct, accountSize,
    profitTargetPct, maxDrawdownPct, dailyDrawdownPct,
    consistencyRulePct, tradesPerDay, tradesPerSimulation,
    ddMode, paths, profitSplitPct, challengeFee,
  } = opts;

  const collect = opts.collectPaths ?? Math.min(20, paths);
  const random = rng(20260501);

  const riskAmt0 = accountSize * (riskPerTradePct / 100);
  const targetEquity = accountSize * (1 + profitTargetPct / 100);
  const maxDDDollar = accountSize * (maxDrawdownPct / 100);
  const dailyDDDollar = accountSize * (dailyDrawdownPct / 100);
  const profitGoalDollar = accountSize * (profitTargetPct / 100);
  const consistencyCapDollar = consistencyRulePct > 0
    ? profitGoalDollar * (consistencyRulePct / 100)
    : Infinity;

  const pathResults: PathResult[] = [];
  let passes = 0;
  let ruined = 0;
  const finalReturns: number[] = [];
  const maxDDs: number[] = [];
  const winStreaks: number[] = [];
  const lossStreaks: number[] = [];

  for (let s = 0; s < paths; s++) {
    let equity = accountSize;
    let peak = accountSize;
    let floor = ddMode === "trailing" ? accountSize - maxDDDollar : accountSize - maxDDDollar;
    const equityCurve: number[] = [equity];
    let maxDD = 0;
    let failed = false;
    let reachedTarget = false;
    let dayPnl = 0;
    let dayProfit = 0;
    let dayCount = 0;
    let tradeInDay = 0;
    let curWinStreak = 0;
    let curLossStreak = 0;
    let totalWinStreaks = 0;
    let totalLossStreaks = 0;
    let winStreakCount = 0;
    let lossStreakCount = 0;

    for (let t = 0; t < tradesPerSimulation; t++) {
      // Risk based on current equity (fixed fractional)
      const riskAmt = equity * (riskPerTradePct / 100);
      const win = random() < winRate;
      let pnl: number;
      if (win) {
        pnl = riskAmt * rr;
        curWinStreak += 1;
        if (curLossStreak > 0) {
          totalLossStreaks += curLossStreak;
          lossStreakCount += 1;
          curLossStreak = 0;
        }
      } else {
        pnl = -riskAmt;
        curLossStreak += 1;
        if (curWinStreak > 0) {
          totalWinStreaks += curWinStreak;
          winStreakCount += 1;
          curWinStreak = 0;
        }
      }

      // Consistency rule: cap daily profit contribution
      if (pnl > 0 && dayProfit + pnl > consistencyCapDollar) {
        pnl = Math.max(0, consistencyCapDollar - dayProfit);
      }

      equity += pnl;
      dayPnl += pnl;
      if (pnl > 0) dayProfit += pnl;

      if (equity > peak) {
        peak = equity;
        if (ddMode === "trailing") {
          // Trailing DD: floor follows peak up to initial+target (or unlimited)
          const newFloor = peak - maxDDDollar;
          if (newFloor > floor) floor = newFloor;
        }
      }
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;

      equityCurve.push(equity);

      // Daily DD check
      if (-dayPnl > dailyDDDollar) {
        failed = true;
        break;
      }

      // Max DD check (account floor)
      if (equity <= floor) {
        failed = true;
        break;
      }

      // Target reached?
      if (equity >= targetEquity) {
        reachedTarget = true;
        break;
      }

      tradeInDay += 1;
      if (tradeInDay >= tradesPerDay) {
        tradeInDay = 0;
        dayPnl = 0;
        dayProfit = 0;
        dayCount += 1;
      }
    }

    if (curWinStreak > 0) { totalWinStreaks += curWinStreak; winStreakCount += 1; }
    if (curLossStreak > 0) { totalLossStreaks += curLossStreak; lossStreakCount += 1; }

    if (reachedTarget) passes += 1;
    if (failed) ruined += 1;

    finalReturns.push(((equity - accountSize) / accountSize) * 100);
    maxDDs.push(maxDD);
    if (winStreakCount > 0) winStreaks.push(totalWinStreaks / winStreakCount);
    if (lossStreakCount > 0) lossStreaks.push(totalLossStreaks / lossStreakCount);

    if (pathResults.length < collect) {
      pathResults.push({
        equity: downsample(equityCurve, 50),
        peak,
        finalEquity: equity,
        maxDrawdownPct: maxDD,
        reachedTarget,
        failed,
      });
    }
  }

  finalReturns.sort((a, b) => a - b);
  maxDDs.sort((a, b) => a - b);

  const passProb = (passes / paths) * 100;
  const ror = ruined / paths;
  const avgReturn = finalReturns.reduce((a, b) => a + b, 0) / finalReturns.length;
  const medianReturn = percentile(finalReturns, 50);
  const bestReturn = finalReturns[finalReturns.length - 1];
  const worstReturn = finalReturns[0];
  const ci95: [number, number] = [percentile(finalReturns, 2.5), percentile(finalReturns, 97.5)];

  const avgMaxDD = maxDDs.reduce((a, b) => a + b, 0) / maxDDs.length;
  const medianMaxDD = percentile(maxDDs, 50);
  const p95MaxDD = percentile(maxDDs, 95);
  const worstMaxDD = maxDDs[maxDDs.length - 1];

  const avgWinStreak = winStreaks.length ? winStreaks.reduce((a, b) => a + b, 0) / winStreaks.length : 0;
  const avgLossStreak = lossStreaks.length ? lossStreaks.reduce((a, b) => a + b, 0) / lossStreaks.length : 0;

  // Expected payout: profit only paid when pass × split
  const expectedProfitDollar = (avgReturn / 100) * accountSize;
  const expectedPayout = (passProb / 100) * Math.max(0, expectedProfitDollar) * (profitSplitPct / 100);
  const expectedROI = challengeFee > 0 ? ((expectedPayout - challengeFee) / challengeFee) * 100 : 0;
  const recoveryFactor = avgMaxDD > 0 ? avgReturn / avgMaxDD : 0;
  const sd = stdev(finalReturns);
  const sharpeLike = sd > 0 ? avgReturn / sd : 0;
  const varianceScore = sd;

  return {
    paths: pathResults,
    passProbability: passProb,
    riskOfRuinSim: ror,
    avgReturn,
    medianReturn,
    bestReturn,
    worstReturn,
    ci95,
    avgMaxDrawdownPct: avgMaxDD,
    medianMaxDrawdownPct: medianMaxDD,
    p95MaxDrawdownPct: p95MaxDD,
    worstMaxDrawdownPct: worstMaxDD,
    avgWinStreak,
    avgLossStreak,
    expectedPayout,
    expectedROI,
    recoveryFactor,
    sharpeLike,
    varianceScore,
  };
};

// ---------- Heatmap helper: lightweight matrix computation ----------

export const RISK_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0];
export const RR_LEVELS = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0];

// Quick closed-form pass% approximation:
// Uses risk-of-ruin inverse + drift-based estimate.
// pass = 1 - RoR_target  where ruin threshold is the profit target (mirror)
export const passProbabilityClosedForm = (
  winRatePct: number,
  rr: number,
  riskPct: number,
  profitTargetPct: number,
  maxDDPct: number
): number => {
  const p = winRatePct / 100;
  const q = 1 - p;
  const mean = p * rr - q * 1;
  const meanAbs = p * rr + q * 1;
  if (meanAbs === 0) return 0;
  const A = mean / meanAbs;
  const unitsTarget = riskPct > 0 ? profitTargetPct / riskPct : 1000;
  const unitsRuin = riskPct > 0 ? maxDDPct / riskPct : 1000;
  // Gambler's ruin (asymmetric random walk): P(reach +T before -R)
  // Works for any non-zero A (positive or negative edge)
  if (A === 0) return (unitsRuin / (unitsRuin + unitsTarget)) * 100;
  const r = (1 - A) / (1 + A); // r<1 for +edge, r>1 for -edge
  // Use log form to avoid overflow for large unit counts (e.g. tiny risk %)
  // P = (1 - r^R) / (1 - r^(R+T)); when r>1 and R is large, both terms blow up.
  // Use the equivalent formulation: P = (r^-R - 1)/(r^-R - r^T) when r>1 (multiply num/den by r^-R)
  // Or clamp the exponent: cap units so the calc is well-conditioned.
  const cap = 200;
  const R = Math.min(unitsRuin, cap);
  const T = Math.min(unitsTarget, cap);
  const num = 1 - Math.pow(r, R);
  const den = 1 - Math.pow(r, R + T);
  if (!isFinite(num) || !isFinite(den) || den === 0) {
    // Asymptotic: positive edge → near 100%, negative edge → near 0%
    return A > 0 ? 100 : 0;
  }
  return Math.max(0, Math.min(100, (num / den) * 100));
};
