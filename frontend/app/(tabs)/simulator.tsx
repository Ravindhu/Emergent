import React, { useMemo, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { colors, spacing, radius } from "@/src/theme";
import { ControlPanelSheet } from "@/src/components/ControlPanelSheet";
import { useStrategy } from "@/src/state/strategy-context";
import {
  recoveryNeeded, runSimulation, expectancyR, profitFactor,
} from "@/src/engine/calculator";

const SCREEN_W = Dimensions.get("window").width;

// Risk levels to sweep for the Max-Drawdown-vs-Position-Size chart
const RISK_SWEEP = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];

export default function SimulatorScreen() {
  const sheet = useRef<BottomSheet>(null);
  const { result, running, runSim, inputs } = useStrategy();

  // Build equity curves (overlay multiple paths)
  const equity = useMemo(() => {
    if (!result || result.paths.length === 0) return null;
    const sorted = [...result.paths].sort((a, b) => a.finalEquity - b.finalEquity);
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    return { best, worst, median, all: result.paths };
  }, [result]);

  // Sweep Max Drawdown across position sizes (runs at button trigger separately)
  const ddSweep = useMemo(() => {
    if (!result) return null;
    // Quick sweep at reduced fidelity for visualization. Disable target & DD failure
    // so DD can accumulate over the full trade horizon.
    return RISK_SWEEP.map((risk) => {
      const r = runSimulation({
        winRate: inputs.winRate / 100,
        rr: inputs.rr,
        riskPerTradePct: risk,
        accountSize: inputs.accountSize,
        profitTargetPct: 10000, // effectively no target
        maxDrawdownPct: 100,    // no DD failure
        dailyDrawdownPct: 100,
        consistencyRulePct: 0,
        tradesPerDay: inputs.tradesPerDay,
        tradesPerSimulation: 200,
        ddMode: "static",
        paths: 80,
        profitSplitPct: inputs.profitSplitPct,
        challengeFee: inputs.challengeFee,
        collectPaths: 0,
      });
      return {
        risk,
        median: r.medianMaxDrawdownPct,
        p95: r.p95MaxDrawdownPct,
      };
    });
  }, [result, inputs.winRate, inputs.rr, inputs.accountSize, inputs.profitTargetPct, inputs.tradesPerDay, inputs.profitSplitPct, inputs.challengeFee]);

  const exp = expectancyR(inputs.winRate, inputs.rr);
  const pf = profitFactor(inputs.winRate, inputs.rr);
  const perfMultiple = result ? (result.bestReturn - result.worstReturn) / Math.max(1, Math.abs(result.medianReturn) || 1) : 0;

  const ddBarData = useMemo(() => {
    const losses = [10, 20, 30, 40, 50, 60, 75];
    return losses.map(l => {
      const rec = recoveryNeeded(l);
      const tone = rec <= 25 ? colors.success : rec <= 67 ? colors.warning : colors.danger;
      return {
        value: rec,
        label: `${l}%`,
        topLabelComponent: () => <Text style={[styles.barLabel, { color: tone }]}>{rec.toFixed(0)}%</Text>,
        frontColor: tone,
      };
    });
  }, []);

  // Build sweep line data
  const sweepMedian = ddSweep?.map(d => ({ value: d.median, label: `${d.risk}%` }));
  const sweepP95 = ddSweep?.map(d => ({ value: d.p95 }));
  const sweepMax = ddSweep ? Math.max(20, Math.ceil(Math.max(...ddSweep.map(d => d.p95)) / 10) * 10) : 100;

  // Equity curve lines (best + worst emphasized, median dashed)
  const W = SCREEN_W - 80;
  let bestLine: { value: number }[] | undefined;
  let worstLine: { value: number }[] | undefined;
  let medianLine: { value: number }[] | undefined;
  let spacingPx = 6;
  let yMin = 0;
  let yMax = 100;
  if (equity) {
    bestLine = equity.best.equity.map(v => ({ value: v }));
    worstLine = equity.worst.equity.map(v => ({ value: v }));
    medianLine = equity.median.equity.map(v => ({ value: v }));
    spacingPx = W / Math.max(1, bestLine.length - 1);
    const all = [...equity.best.equity, ...equity.worst.equity, ...equity.median.equity];
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    // Round y bounds to nearest 5k for cleaner axis
    yMin = Math.max(0, Math.floor(lo / 5000) * 5000);
    yMax = Math.ceil(hi / 5000) * 5000;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MONTE CARLO</Text>
          <Text style={styles.title}>Simulator</Text>
        </View>
        <Pressable
          testID="run-from-simulator"
          onPress={runSim}
          disabled={running}
          style={[styles.runBtn, running && { opacity: 0.5 }]}>
          <Ionicons name="play" size={14} color={colors.bg} />
          <Text style={styles.runTxt}>{running ? "Running" : "Run"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Top KPI strip — mirrors reference image */}
        <View style={styles.kpiStrip}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiL}>Win rate</Text>
            <Text style={styles.kpiV}>{inputs.winRate}%</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiL}>Risk : reward</Text>
            <Text style={styles.kpiV}>1 : {inputs.rr}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiL}>Trades sim</Text>
            <Text style={styles.kpiV}>{inputs.tradesPerSimulation}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiL}>Sim paths</Text>
            <Text style={styles.kpiV}>{inputs.simulationPaths}</Text>
          </View>
        </View>

        {!result ? (
          <View style={styles.empty} testID="simulator-empty">
            <Ionicons name="analytics-outline" size={48} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No simulation yet</Text>
            <Text style={styles.emptyTxt}>Run a Monte Carlo simulation to see equity curves, drawdown vs position size, and risk analytics.</Text>
          </View>
        ) : (
          <>
            {/* Equity curve card */}
            <View style={styles.chartCard} testID="equity-chart-card">
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chartTitle}>Equity Curve ({equity?.all.length ?? 0} sims)</Text>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.success }]} /><Text style={styles.legendTxt}>Best</Text></View>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.danger }]} /><Text style={styles.legendTxt}>Worst</Text></View>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.text }]} /><Text style={styles.legendTxt}>Median</Text></View>
                  </View>
                </View>
                <View style={styles.perfBox}>
                  <Text style={styles.kpiL}>Best / Worst</Text>
                  <Text style={[styles.kpiV, { color: colors.text }]} testID="performance-spread">
                    <Text style={{ color: colors.success }}>{result.bestReturn.toFixed(0)}%</Text>
                    {" / "}
                    <Text style={{ color: colors.danger }}>{result.worstReturn.toFixed(0)}%</Text>
                  </Text>
                </View>
              </View>
              {bestLine && worstLine && medianLine ? (
                <LineChart
                  data={medianLine}
                  data2={bestLine}
                  data3={worstLine}
                  color1={colors.text}
                  color2={colors.success}
                  color3={colors.danger}
                  thickness1={1.5}
                  thickness2={2.5}
                  thickness3={2.5}
                  hideDataPoints
                  curved
                  isAnimated
                  animationDuration={700}
                  height={210}
                  width={W}
                  noOfSections={4}
                  yAxisOffset={yMin}
                  maxValue={Math.max(1, yMax - yMin)}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  rulesColor={colors.border}
                  rulesType="dashed"
                  initialSpacing={0}
                  spacing={spacingPx}
                  formatYLabel={(v) => `$${(parseFloat(v) / 1000).toFixed(1)}k`}
                />
              ) : null}
            </View>

            {/* Max Drawdown vs Position Size — matches reference image */}
            {ddSweep ? (
              <View style={styles.chartCard} testID="dd-sweep-card">
                <Text style={styles.chartTitle}>Max Drawdown vs Position Size</Text>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.danger }]} /><Text style={styles.legendTxt}>95th percentile</Text></View>
                  <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.warning }]} /><Text style={styles.legendTxt}>Median</Text></View>
                </View>
                <LineChart
                  data={sweepP95!}
                  data2={sweepMedian!}
                  color1={colors.danger}
                  color2={colors.warning}
                  thickness1={2.5}
                  thickness2={2}
                  dataPointsColor1={colors.danger}
                  dataPointsColor2={colors.warning}
                  dataPointsRadius={3}
                  areaChart
                  startFillColor1={colors.danger}
                  endFillColor1={colors.danger}
                  startOpacity={0.25}
                  endOpacity={0.02}
                  curved
                  isAnimated
                  animationDuration={500}
                  height={200}
                  width={W}
                  noOfSections={5}
                  maxValue={sweepMax}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  rulesColor={colors.border}
                  rulesType="dashed"
                  formatYLabel={(v) => `${parseFloat(v).toFixed(0)}%`}
                  spacing={W / RISK_SWEEP.length}
                  initialSpacing={10}
                />
                <Text style={styles.axisLabel}>Position size (% of account risked per trade)</Text>
              </View>
            ) : null}

            {/* Risk Analysis grid — matches reference image right column */}
            <View style={styles.gridTitle}>
              <View style={styles.gridBar} />
              <Text style={styles.gridTitleTxt}>Risk Analysis</Text>
            </View>
            <View style={styles.row2}>
              <View style={styles.miniCard}>
                <Text style={styles.miniL}>Recommended Risk</Text>
                <Text style={[styles.miniV, { color: colors.info }]}>{Math.min(2, Math.max(0.25, inputs.maxDrawdownPct / (result.avgLossStreak * 4 || 4))).toFixed(2)}%</Text>
                <Text style={styles.miniHint}>per trade</Text>
              </View>
              <View style={styles.miniCard}>
                <Text style={styles.miniL}>Expectancy</Text>
                <Text style={[styles.miniV, { color: exp >= 0 ? colors.success : colors.danger }]}>{exp.toFixed(2)}R</Text>
                <Text style={styles.miniHint}>avg return/trade</Text>
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.miniCard}>
                <Text style={styles.miniL}>Profit Factor</Text>
                <Text style={[styles.miniV, { color: pf > 1.5 ? colors.success : colors.warning }]}>{pf.toFixed(2)}</Text>
                <Text style={styles.miniHint}>gross win / loss</Text>
              </View>
              <View style={styles.miniCard}>
                <Text style={styles.miniL}>Risk of Ruin</Text>
                <Text style={[styles.miniV, { color: result.riskOfRuinSim > 0.05 ? colors.danger : colors.warning }]}>
                  {result.riskOfRuinSim < 0.01 ? "< 1%" : `${(result.riskOfRuinSim * 100).toFixed(1)}%`}
                </Text>
                <Text style={styles.miniHint}>Monte Carlo</Text>
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.miniCard}>
                <Text style={styles.miniL}>Avg Win Streak</Text>
                <Text style={[styles.miniV, { color: colors.success }]}>{result.avgWinStreak.toFixed(1)}</Text>
                <Text style={styles.miniHint}>consecutive wins</Text>
              </View>
              <View style={styles.miniCard}>
                <Text style={styles.miniL}>Avg Loss Streak</Text>
                <Text style={[styles.miniV, { color: colors.warning }]}>{result.avgLossStreak.toFixed(1)}</Text>
                <Text style={styles.miniHint}>consecutive losses</Text>
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.miniCard}>
                <Text style={styles.miniL}>Median Return</Text>
                <Text style={[styles.miniV, { color: result.medianReturn >= 0 ? colors.success : colors.danger }]}>
                  {result.medianReturn >= 0 ? "+" : ""}{result.medianReturn.toFixed(1)}%
                </Text>
                <Text style={styles.miniHint}>50th percentile</Text>
              </View>
              <View style={styles.miniCard}>
                <Text style={styles.miniL}>Pass Probability</Text>
                <Text style={[styles.miniV, { color: result.passProbability >= 65 ? colors.success : result.passProbability >= 36 ? colors.warning : colors.danger }]}>
                  {result.passProbability.toFixed(1)}%
                </Text>
                <Text style={styles.miniHint}>reached target</Text>
              </View>
            </View>
            <Text style={styles.perfNote}>Performance spread {perfMultiple.toFixed(1)}× · 95% CI {result.ci95[0].toFixed(0)}% to {result.ci95[1].toFixed(0)}%</Text>
          </>
        )}

        {/* Drawdown Recovery — always shown (math is universal) */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Drawdown Recovery</Text>
          <Text style={styles.chartSub}>Gain required to recover from loss</Text>
          <BarChart
            data={ddBarData}
            height={180}
            width={W}
            barWidth={26}
            spacing={10}
            noOfSections={5}
            maxValue={320}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            rulesColor={colors.border}
            rulesType="dashed"
            formatYLabel={(v) => `${parseFloat(v).toFixed(0)}%`}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable
        testID="open-control-panel-sim"
        onPress={() => sheet.current?.snapToIndex(0)}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
        <Ionicons name="options-outline" color={colors.bg} size={20} />
        <Text style={styles.fabTxt}>Control Panel</Text>
      </Pressable>

      <ControlPanelSheet ref={sheet} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomColor: colors.border, borderBottomWidth: 1,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  runBtn: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: colors.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  runTxt: { color: colors.bg, fontWeight: "800", fontSize: 12 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  kpiStrip: { flexDirection: "row", gap: spacing.sm },
  kpiBox: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm, alignItems: "flex-start" },
  kpiL: { color: colors.textMuted, fontSize: 9, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  kpiV: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.md },
  emptyTxt: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  chartCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderColor: colors.border, borderWidth: 1 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.sm },
  chartTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  chartSub: { color: colors.textMuted, fontSize: 11, marginTop: 2, marginBottom: spacing.md },
  axisLabel: { color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: 6 },
  legendRow: { flexDirection: "row", gap: spacing.md, marginTop: 6, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
  perfBox: { backgroundColor: colors.panel, padding: spacing.sm, borderRadius: radius.sm, borderColor: colors.border, borderWidth: 1, minWidth: 110, alignItems: "flex-start" },
  gridTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  gridBar: { width: 3, height: 18, backgroundColor: colors.info, borderRadius: 2 },
  gridTitleTxt: { color: colors.text, fontSize: 15, fontWeight: "800" },
  row2: { flexDirection: "row", gap: spacing.md },
  miniCard: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, minHeight: 92, justifyContent: "space-between" },
  miniL: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  miniV: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  miniHint: { color: colors.textDim, fontSize: 10 },
  perfNote: { color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 4 },
  barLabel: { fontSize: 10, fontWeight: "800", marginBottom: 2 },
  fab: {
    position: "absolute", bottom: 92, right: spacing.lg,
    backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: radius.pill, flexDirection: "row", gap: 8, alignItems: "center",
    shadowColor: colors.success, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabTxt: { color: colors.bg, fontWeight: "800", fontSize: 13 },
});
