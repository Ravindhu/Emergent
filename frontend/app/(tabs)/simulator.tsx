import React, { useMemo, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { colors, spacing, radius } from "@/src/theme";
import { ControlPanelSheet } from "@/src/components/ControlPanelSheet";
import { useStrategy } from "@/src/state/strategy-context";
import { recoveryNeeded } from "@/src/engine/calculator";

const SCREEN_W = Dimensions.get("window").width;

export default function SimulatorScreen() {
  const sheet = useRef<BottomSheet>(null);
  const { result, running, runSim, inputs } = useStrategy();

  // Build equity curves
  const curves = useMemo(() => {
    if (!result) return null;
    const paths = result.paths;
    if (paths.length === 0) return null;

    // Best / Median / Worst by final equity
    const sorted = [...paths].sort((a, b) => a.finalEquity - b.finalEquity);
    const best = sorted[sorted.length - 1];
    const worst = sorted[0];
    const median = sorted[Math.floor(sorted.length / 2)];

    const toData = (p: typeof paths[number]) =>
      p.equity.map((v) => ({ value: v }));

    return {
      best: toData(best),
      median: toData(median),
      worst: toData(worst),
      all: paths.map(toData),
    };
  }, [result]);

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

  const ddByRisk = useMemo(() => {
    if (!result) return null;
    // Show p50/p95/worst for current risk only — single bar group display
    return [
      { label: "Median", value: result.medianMaxDrawdownPct, frontColor: colors.success },
      { label: "95th", value: result.p95MaxDrawdownPct, frontColor: colors.warning },
      { label: "Worst", value: result.worstMaxDrawdownPct, frontColor: colors.danger },
    ];
  }, [result]);

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

        {!result ? (
          <View style={styles.empty} testID="simulator-empty">
            <Ionicons name="analytics-outline" size={48} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No simulation yet</Text>
            <Text style={styles.emptyTxt}>Run a Monte Carlo simulation to see equity curves, drawdown profiles and confidence intervals.</Text>
          </View>
        ) : (
          <>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statL}>Pass Probability</Text>
                <Text style={[styles.statV, { color: colors.success }]}>{result.passProbability.toFixed(1)}%</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statL}>Risk of Ruin</Text>
                <Text style={[styles.statV, { color: colors.danger }]}>{(result.riskOfRuinSim * 100).toFixed(2)}%</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statL}>Median Return</Text>
                <Text style={[styles.statV, { color: result.medianReturn >= 0 ? colors.success : colors.danger }]}>
                  {result.medianReturn >= 0 ? "+" : ""}{result.medianReturn.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statL}>95% Range</Text>
                <Text style={styles.statV}>{result.ci95[0].toFixed(0)}% / {result.ci95[1].toFixed(0)}%</Text>
              </View>
            </View>

            <View style={styles.chartCard} testID="equity-chart-card">
              <Text style={styles.chartTitle}>Equity Curves · {curves?.all.length ?? 0} Paths</Text>
              <Text style={styles.chartSub}>Best (green) · Median (white) · Worst (red)</Text>
              {curves ? (
                <LineChart
                  data={curves.median}
                  data2={curves.best}
                  data3={curves.worst}
                  color1={colors.text}
                  color2={colors.success}
                  color3={colors.danger}
                  thickness1={2}
                  thickness2={2}
                  thickness3={2}
                  hideDataPoints
                  curved
                  isAnimated
                  animationDuration={600}
                  height={200}
                  width={SCREEN_W - 80}
                  noOfSections={4}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  rulesColor={colors.border}
                  rulesType="dashed"
                  initialSpacing={0}
                  spacing={(SCREEN_W - 80) / Math.max(1, (curves.median.length - 1))}
                  formatYLabel={(v) => `${(parseFloat(v) / 1000).toFixed(0)}k`}
                />
              ) : null}
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Max Drawdown Distribution</Text>
              <Text style={styles.chartSub}>At {inputs.riskPerTradePct}% risk per trade</Text>
              {ddByRisk ? (
                <BarChart
                  data={ddByRisk}
                  height={180}
                  width={SCREEN_W - 100}
                  barWidth={60}
                  spacing={28}
                  noOfSections={4}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11 }}
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  rulesColor={colors.border}
                  rulesType="dashed"
                  formatYLabel={(v) => `${parseFloat(v).toFixed(0)}%`}
                />
              ) : null}
            </View>
          </>
        )}

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Drawdown Recovery</Text>
          <Text style={styles.chartSub}>Gain required to recover from loss</Text>
          <BarChart
            data={ddBarData}
            height={180}
            width={SCREEN_W - 100}
            barWidth={28}
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
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.md },
  emptyTxt: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  statRow: { flexDirection: "row", gap: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderColor: colors.border, borderWidth: 1 },
  statL: { color: colors.textMuted, fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
  statV: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 4 },
  chartCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderColor: colors.border, borderWidth: 1 },
  chartTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  chartSub: { color: colors.textMuted, fontSize: 11, marginTop: 2, marginBottom: spacing.md },
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
