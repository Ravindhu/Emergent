import React, { useMemo, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { colors, spacing, radius } from "@/src/theme";
import { KpiCard } from "@/src/components/KpiCard";
import { ControlPanelSheet } from "@/src/components/ControlPanelSheet";
import { useStrategy } from "@/src/state/strategy-context";
import {
  expectancyR, profitFactor, riskOfRuin, avgStreak,
  passProbabilityClosedForm, gradeStrategy,
} from "@/src/engine/calculator";

const fmt$ = (n: number) =>
  (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

const accountTiers = [5000, 10000, 25000, 50000, 100000, 200000];

export default function Dashboard() {
  const sheet = useRef<BottomSheet>(null);
  const { inputs, result } = useStrategy();

  const closed = useMemo(() => {
    const exp = expectancyR(inputs.winRate, inputs.rr);
    const pf = profitFactor(inputs.winRate, inputs.rr);
    const ror = riskOfRuin(inputs.winRate, inputs.rr, inputs.riskPerTradePct, inputs.maxDrawdownPct);
    const pass = passProbabilityClosedForm(
      inputs.winRate, inputs.rr, inputs.riskPerTradePct,
      inputs.profitTargetPct, inputs.maxDrawdownPct,
      inputs.dailyDrawdownPct, inputs.tradesPerDay
    );
    const avgWin = avgStreak(inputs.winRate / 100);
    const avgLoss = avgStreak(1 - inputs.winRate / 100);
    return { exp, pf, ror, pass, avgWin, avgLoss };
  }, [inputs]);

  // Use sim result if available, else closed-form approximations
  const passProb = result?.passProbability ?? closed.pass;
  const ror = result?.riskOfRuinSim ?? closed.ror;
  const avgWin = result?.avgWinStreak ?? closed.avgWin;
  const avgLoss = result?.avgLossStreak ?? closed.avgLoss;
  const expectedDD = result?.medianMaxDrawdownPct ?? (inputs.riskPerTradePct * Math.max(2, closed.avgLoss));
  const expectedPayout = result?.expectedPayout ?? (passProb / 100) * (inputs.accountSize * (inputs.profitTargetPct / 100)) * (inputs.profitSplitPct / 100);
  const expectedROI = result?.expectedROI ?? (inputs.challengeFee > 0 ? ((expectedPayout - inputs.challengeFee) / inputs.challengeFee) * 100 : 0);

  const grade = gradeStrategy(passProb, ror, closed.pf, closed.exp);

  // Recommended position
  const optimalRisk = Math.max(0.25, Math.min(2, closed.exp > 0 ? Math.min(2, 100 * (closed.exp / (inputs.rr + 1)) * 0.5) : 0.5));
  const positionSize = inputs.accountSize * (optimalRisk / 100);

  // Recommended account: closest match to passProb >= 60% with best ROI
  const recommendedAccount = useMemo(() => {
    let best = accountTiers[0];
    let bestScore = -Infinity;
    accountTiers.forEach(a => {
      const fee = a * 0.005 + 50;
      const proj = (passProb / 100) * (a * (inputs.profitTargetPct / 100)) * (inputs.profitSplitPct / 100);
      const roi = ((proj - fee) / fee) * 100;
      if (roi > bestScore) { bestScore = roi; best = a; }
    });
    return best;
  }, [passProb, inputs.profitTargetPct, inputs.profitSplitPct]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PROP FIRM</Text>
          <Text style={styles.title}>Strategy Dashboard</Text>
        </View>
        <View style={[styles.gradeBadge, { borderColor: colors.grade[grade], backgroundColor: colors.grade[grade] + "22" }]} testID="strategy-grade">
          <Text style={[styles.gradeTxt, { color: colors.grade[grade] }]}>{grade}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!result ? (
          <View style={styles.emptyHint} testID="dashboard-empty-hint">
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={styles.emptyTxt}>Showing closed-form estimates. Run a Monte Carlo simulation for higher precision.</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <KpiCard testID="kpi-pass-prob" label="Pass Probability" value={`${passProb.toFixed(1)}%`}
            tone={passProb >= 65 ? "success" : passProb >= 36 ? "warning" : "danger"} />
          <KpiCard testID="kpi-expected-payout" label="Expected Payout" value={fmt$(expectedPayout)} tone="success" />
        </View>
        <View style={styles.row}>
          <KpiCard testID="kpi-expected-roi" label="Expected ROI" value={`${expectedROI >= 0 ? "+" : ""}${expectedROI.toFixed(0)}%`}
            tone={expectedROI > 0 ? "success" : "danger"} hint={`Fee: ${fmt$(inputs.challengeFee)}`} />
          <KpiCard testID="kpi-risk-of-ruin" label="Risk of Ruin" value={`${(ror * 100).toFixed(2)}%`}
            tone={ror > 0.2 ? "danger" : ror > 0.05 ? "warning" : "success"} />
        </View>
        <View style={styles.row}>
          <KpiCard testID="kpi-expected-dd" label="Expected DD" value={`${expectedDD.toFixed(1)}%`} tone="warning" />
          <KpiCard testID="kpi-optimal-risk" label="Optimal Risk" value={`${optimalRisk.toFixed(2)}%`} tone="info" />
        </View>
        <View style={styles.row}>
          <KpiCard testID="kpi-profit-factor" label="Profit Factor" value={closed.pf.toFixed(2)}
            tone={closed.pf > 1.5 ? "success" : closed.pf > 1 ? "warning" : "danger"} />
          <KpiCard testID="kpi-expectancy" label="Expectancy" value={`${closed.exp.toFixed(3)}R`}
            tone={closed.exp > 0 ? "success" : "danger"} />
        </View>
        <View style={styles.row}>
          <KpiCard testID="kpi-avg-loss-streak" label="Avg Loss Streak" value={avgLoss.toFixed(1)} tone="warning" />
          <KpiCard testID="kpi-avg-win-streak" label="Avg Win Streak" value={avgWin.toFixed(1)} tone="success" />
        </View>
        <View style={styles.row}>
          <KpiCard testID="kpi-recommended-account" label="Recommended Acct" value={`$${(recommendedAccount/1000).toFixed(0)}K`} tone="info" />
          <KpiCard testID="kpi-position-size" label="Position Size" value={fmt$(positionSize)} />
        </View>

        <View style={styles.snapshot}>
          <Text style={styles.snapTitle}>Strategy Snapshot</Text>
          <View style={styles.snapRow}>
            <Text style={styles.snapL}>Account · Target · DD</Text>
            <Text style={styles.snapV}>{fmt$(inputs.accountSize)} · {inputs.profitTargetPct}% · {inputs.maxDrawdownPct}%</Text>
          </View>
          <View style={styles.snapRow}>
            <Text style={styles.snapL}>Win Rate / RR / Risk</Text>
            <Text style={styles.snapV}>{inputs.winRate}% · {inputs.rr}R · {inputs.riskPerTradePct}%</Text>
          </View>
          <View style={styles.snapRow}>
            <Text style={styles.snapL}>DD Mode</Text>
            <Text style={styles.snapV}>{inputs.ddMode === "trailing" ? "Trailing" : "Static"}</Text>
          </View>
          <View style={styles.snapRow}>
            <Text style={styles.snapL}>Consistency Rule</Text>
            <Text style={styles.snapV}>{inputs.consistencyRulePct === 0 ? "OFF" : `${inputs.consistencyRulePct}%`}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable
        testID="open-control-panel"
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
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  gradeBadge: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  gradeTxt: { fontSize: 22, fontWeight: "900" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  emptyHint: {
    flexDirection: "row", gap: spacing.sm, alignItems: "flex-start",
    backgroundColor: colors.info + "1A", borderColor: colors.info, borderWidth: 1,
    borderRadius: radius.md, padding: spacing.md,
  },
  emptyTxt: { color: colors.text, fontSize: 12, flex: 1, lineHeight: 17 },
  row: { flexDirection: "row", gap: spacing.md },
  snapshot: {
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.sm,
  },
  snapTitle: { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: spacing.md },
  snapRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomColor: colors.border, borderBottomWidth: 1 },
  snapL: { color: colors.textMuted, fontSize: 12 },
  snapV: { color: colors.text, fontSize: 12, fontWeight: "700" },
  fab: {
    position: "absolute", bottom: 92, right: spacing.lg,
    backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: radius.pill, flexDirection: "row", gap: 8, alignItems: "center",
    shadowColor: colors.success, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabTxt: { color: colors.bg, fontWeight: "800", fontSize: 13, letterSpacing: 0.3 },
});
