import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { useStrategy } from "@/src/state/strategy-context";
import {
  RISK_LEVELS, RR_LEVELS, passProbabilityClosedForm,
  riskOfRuin, gradeStrategy, expectancyR, profitFactor,
} from "@/src/engine/calculator";

type Profile = "safe" | "balanced" | "aggressive";

interface Reco {
  risk: number; rr: number; pass: number; roi: number; ror: number; dd: number; grade: string; positionSize: number;
}

export default function Optimizer() {
  const router = useRouter();
  const { inputs } = useStrategy();

  const recos = useMemo<Record<Profile, Reco>>(() => {
    // For each (risk, rr) compute pass + ROI + RoR. Pick best per profile.
    const target = inputs.accountSize * (inputs.profitTargetPct / 100);
    const candidates: any[] = [];
    RISK_LEVELS.forEach(risk => {
      RR_LEVELS.forEach(rr => {
        const pass = passProbabilityClosedForm(inputs.winRate, rr, risk, inputs.profitTargetPct, inputs.maxDrawdownPct);
        const ror = riskOfRuin(inputs.winRate, rr, risk, inputs.maxDrawdownPct);
        const profit = target * (inputs.profitSplitPct / 100);
        const expected = (pass / 100) * profit;
        const roi = inputs.challengeFee > 0 ? ((expected - inputs.challengeFee) / inputs.challengeFee) * 100 : 0;
        const dd = Math.min(95, risk * 4 + (1 / Math.max(0.2, inputs.winRate / 100)) * risk);
        const exp = expectancyR(inputs.winRate, rr);
        const pf = profitFactor(inputs.winRate, rr);
        const grade = gradeStrategy(pass, ror, pf, exp);
        candidates.push({ risk, rr, pass, ror, roi, dd, grade });
      });
    });
    const safe = [...candidates].filter(c => c.ror <= 0.05).sort((a, b) => b.pass - a.pass)[0] ?? candidates[0];
    const balanced = [...candidates].filter(c => c.ror <= 0.15 && c.pass >= 50).sort((a, b) => b.roi - a.roi)[0] ?? candidates[0];
    const aggressive = [...candidates].sort((a, b) => b.roi - a.roi)[0] ?? candidates[0];
    const toReco = (c: any): Reco => ({ ...c, positionSize: inputs.accountSize * (c.risk / 100) });
    return { safe: toReco(safe), balanced: toReco(balanced), aggressive: toReco(aggressive) };
  }, [inputs]);

  const Card: React.FC<{ profile: Profile; data: Reco }> = ({ profile, data }) => {
    const meta = {
      safe: { title: "SAFE", icon: "shield-checkmark-outline", color: colors.success, sub: "Lowest risk of ruin" },
      balanced: { title: "BALANCED", icon: "scale-outline", color: colors.warning, sub: "Best risk-adjusted ROI" },
      aggressive: { title: "AGGRESSIVE", icon: "flame-outline", color: colors.danger, sub: "Maximum expected ROI" },
    }[profile];
    return (
      <View style={[s.card, { borderColor: meta.color }]} testID={`reco-${profile}`}>
        <View style={s.cardHeader}>
          <View style={[s.iconBox, { backgroundColor: meta.color + "22", borderColor: meta.color }]}>
            <Ionicons name={meta.icon as any} size={20} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { color: meta.color }]}>{meta.title}</Text>
            <Text style={s.cardSub}>{meta.sub}</Text>
          </View>
          <View style={[s.gradePill, { backgroundColor: colors.grade[data.grade] + "22", borderColor: colors.grade[data.grade] }]}>
            <Text style={{ color: colors.grade[data.grade], fontWeight: "900" }}>{data.grade}</Text>
          </View>
        </View>
        <View style={s.metrics}>
          <View style={s.metricBox}>
            <Text style={s.ml}>Risk</Text><Text style={s.mv}>{data.risk.toFixed(2)}%</Text>
          </View>
          <View style={s.metricBox}>
            <Text style={s.ml}>RR</Text><Text style={s.mv}>{data.rr.toFixed(2)}</Text>
          </View>
          <View style={s.metricBox}>
            <Text style={s.ml}>Pass</Text><Text style={[s.mv, { color: colors.success }]}>{data.pass.toFixed(0)}%</Text>
          </View>
          <View style={s.metricBox}>
            <Text style={s.ml}>ROI</Text><Text style={[s.mv, { color: data.roi >= 0 ? colors.success : colors.danger }]}>{data.roi.toFixed(0)}%</Text>
          </View>
          <View style={s.metricBox}>
            <Text style={s.ml}>RoR</Text><Text style={[s.mv, { color: colors.danger }]}>{(data.ror * 100).toFixed(1)}%</Text>
          </View>
          <View style={s.metricBox}>
            <Text style={s.ml}>DD</Text><Text style={[s.mv, { color: colors.warning }]}>{data.dd.toFixed(0)}%</Text>
          </View>
        </View>
        <View style={s.posBox}>
          <Text style={s.posLabel}>Position Size per Trade</Text>
          <Text style={s.posValue}>${data.positionSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View>
          <Text style={s.eyebrow}>RECOMMENDER</Text>
          <Text style={s.title}>Strategy Optimizer</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.intro}>Based on a {inputs.winRate}% win rate over a {inputs.profitTargetPct}% profit target with {inputs.maxDrawdownPct}% max DD — these are the optimal Risk × RR combos:</Text>
        <Card profile="safe" data={recos.safe} />
        <Card profile="balanced" data={recos.balanced} />
        <Card profile="aggressive" data={recos.aggressive} />
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
  scroll: { padding: spacing.lg, gap: spacing.md },
  intro: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "900", letterSpacing: 1.5 },
  cardSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  gradePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricBox: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm, width: "31%", alignItems: "center" },
  ml: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
  mv: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: 2 },
  posBox: { backgroundColor: colors.panel, borderRadius: radius.sm, padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  posLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  posValue: { color: colors.text, fontSize: 16, fontWeight: "800" },
});
