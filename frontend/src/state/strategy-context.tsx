import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { defaultInputs, runSimulation, StrategyInputs, SimResult } from "@/src/engine/calculator";

interface Ctx {
  inputs: StrategyInputs;
  setInputs: (updater: Partial<StrategyInputs>) => void;
  reset: () => void;
  result: SimResult | null;
  running: boolean;
  runSim: () => void;
}

const StrategyContext = createContext<Ctx | null>(null);

export const StrategyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inputs, setInputsState] = useState<StrategyInputs>(defaultInputs);
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);

  const setInputs = useCallback((updater: Partial<StrategyInputs>) => {
    setInputsState(prev => ({ ...prev, ...updater }));
  }, []);

  const reset = useCallback(() => {
    setInputsState(defaultInputs);
    setResult(null);
  }, []);

  const runSim = useCallback(() => {
    setRunning(true);
    // Defer to next tick so UI can show loading state
    setTimeout(() => {
      const r = runSimulation({
        winRate: inputs.winRate / 100,
        rr: inputs.rr,
        riskPerTradePct: inputs.riskPerTradePct,
        accountSize: inputs.accountSize,
        profitTargetPct: inputs.profitTargetPct,
        maxDrawdownPct: inputs.maxDrawdownPct,
        dailyDrawdownPct: inputs.dailyDrawdownPct,
        consistencyRulePct: inputs.consistencyRulePct,
        tradesPerDay: inputs.tradesPerDay,
        tradesPerSimulation: inputs.tradesPerSimulation,
        ddMode: inputs.ddMode,
        paths: inputs.simulationPaths,
        profitSplitPct: inputs.profitSplitPct,
        challengeFee: inputs.challengeFee,
      });
      setResult(r);
      setRunning(false);
    }, 50);
  }, [inputs]);

  const value = useMemo<Ctx>(() => ({
    inputs, setInputs, reset, result, running, runSim,
  }), [inputs, setInputs, reset, result, running, runSim]);

  return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>;
};

export const useStrategy = (): Ctx => {
  const ctx = useContext(StrategyContext);
  if (!ctx) throw new Error("useStrategy must be inside StrategyProvider");
  return ctx;
};
