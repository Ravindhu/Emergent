import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { useStrategy } from "@/src/state/strategy-context";
import {
  expectancyR, profitFactor, riskOfRuin, avgStreak,
  passProbabilityClosedForm, gradeStrategy,
} from "@/src/engine/calculator";

const Row: React.FC<{ l: string; v: string; color?: string; testID?: string }> = ({ l, v, color, testID }) => (
  <View style={s.row} testID={testID}>
    <Text style={s.l}>{l}</Text>
    <Text style={[s.v, color ? { color } : null]}>{v}</Text>
  </View>
);

export default function StrategyAnalyzer() {
  const router = useRouter();
  const { inputs, result } = useStrategy();

  const stats = useMemo(() => {
    const exp = expectancyR(inputs.winRate, inputs.rr);
    const pf = profitFactor(inputs.winRate, inputs.rr);
    const ror = result?.riskOfRuinSim ?? riskOfRuin(inputs.winRate, inputs.rr, inputs.riskPerTradePct, inputs.maxDrawdownPct);
    const pass = result?.passProbability ?? passProbabilityClosedForm(inputs.winRate, inputs.rr, inputs.riskPerTradePct, inputs.profitTargetPct, inputs.maxDrawdownPct);
    const avgWin = result?.avgWinStreak ?? avgStreak(inputs.winRate / 100);
    const avgLoss = result?.avgLossStreak ?? avgStreak(1 - inputs.winRate / 100);
    const avgDD = result?.avgMaxDrawdownPct ?? (inputs.riskPerTradePct * avgLoss * 1.5);
    const maxDD = result?.worstMaxDrawdownPct ?? (inputs.riskPerTradePct * avgLoss * 3);
    const rf = result?.recoveryFactor ?? (avgDD > 0 ? (exp * 100) / avgDD : 0);
    const sh = result?.sharpeLike ?? exp;
    const vs = result?.varianceScore ?? Math.sqrt((1 - inputs.winRate / 100) * (inputs.winRate / 100)) * inputs.rr * 100;
    const grade = gradeStrategy(pass, ror, pf, exp);
    return { exp, pf, ror, pass, avgWin, avgLoss, avgDD, maxDD, rf, sh, vs, grade };
  }, [inputs, result]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable testID="back-button" onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View>
          <Text style={s.eyebrow}>ANALYTICS</Text>
          <Text style={s.title}>Strategy Analyzer</Text>
        </View>
        <View style={[s.gradeBadge, { borderColor: colors.grade[stats.grade], backgroundColor: colors.grade[stats.grade] + "22" }]}>
          <Text style={[s.gradeTxt, { color: colors.grade[stats.grade] }]}>{stats.grade}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card} testID="analyzer-card">
          <Text style={s.section}>Edge Metrics</Text>
          <Row l="Expectancy (R)" v={`${stats.exp.toFixed(3)}`} color={stats.exp > 0 ? colors.success : colors.danger} testID="row-expectancy" />
          <Row l="Profit Factor" v={stats.pf.toFixed(2)} color={stats.pf > 1.5 ? colors.success : stats.pf > 1 ? colors.warning : colors.danger} testID="row-pf" />
          <Row l="Sharpe-like Score" v={stats.sh.toFixed(2)} testID="row-sharpe" />
          <Row l="Variance Score" v={stats.vs.toFixed(1)} color={colors.warning} testID="row-variance" />
        </View>

        <View style={s.card}>
          <Text style={s.section}>Risk Profile</Text>
          <Row l="Risk of Ruin" v={`${(stats.ror * 100).toFixed(2)}%`} color={stats.ror > 0.2 ? colors.danger : colors.warning} testID="row-ror" />
          <Row l="Pass Probability" v={`${stats.pass.toFixed(1)}%`} color={stats.pass >= 65 ? colors.success : colors.warning} testID="row-pass" />
          <Row l="Avg Win Streak" v={stats.avgWin.toFixed(1)} color={colors.success} />
          <Row l="Avg Loss Streak" v={stats.avgLoss.toFixed(1)} color={colors.warning} />
        </View>

        <View style={s.card}>
          <Text style={s.section}>Drawdown</Text>
          <Row l="Average Drawdown" v={`${stats.avgDD.toFixed(1)}%`} color={colors.warning} />
          <Row l="Maximum Drawdown" v={`${stats.maxDD.toFixed(1)}%`} color={colors.danger} />
          <Row l="Recovery Factor" v={stats.rf.toFixed(2)} color={stats.rf > 1 ? colors.success : colors.warning} />
        </View>

        <View style={s.card}>
          <Text style={s.section}>Verdict</Text>
          <Text style={s.verdict}>
            {stats.grade === "F" || stats.grade === "D"
              ? "Strategy has insufficient edge to pass a prop-firm challenge reliably. Increase win rate or RR, lower risk per trade."
              : stats.grade === "C"
              ? "Marginal edge. Adjustments recommended before live capital allocation."
              : stats.grade === "B"
              ? "Solid statistical edge with manageable risk. Consider tightening risk."
              : "Excellent risk-adjusted profile. Strategy is funded-trader grade."}
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.panel },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  gradeBadge: { marginLeft: "auto", width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  gradeTxt: { fontSize: 20, fontWeight: "900" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  section: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: 0.5 },
  l: { color: colors.textMuted, fontSize: 13 },
  v: { color: colors.text, fontSize: 14, fontWeight: "700" },
  verdict: { color: colors.text, fontSize: 13, lineHeight: 19 },
});
