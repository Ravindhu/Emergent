import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { useStrategy } from "@/src/state/strategy-context";
import { passProbabilityClosedForm, riskOfRuin, avgStreak } from "@/src/engine/calculator";

const sample = (wr: number, rr: number, risk: number, target: number, maxDD: number) => {
  const pass = passProbabilityClosedForm(wr, rr, risk, target, maxDD);
  const ror = riskOfRuin(wr, rr, risk, maxDD);
  const lossStreak = avgStreak(1 - wr / 100);
  const dd = risk * lossStreak * 1.5;
  return { pass, ror: ror * 100, lossStreak, dd };
};

export default function Variance() {
  const router = useRouter();
  const { inputs } = useStrategy();

  // High variance = lower WR, high RR. Low variance = higher WR, low RR.
  const high = useMemo(() => sample(35, 3, inputs.riskPerTradePct, inputs.profitTargetPct, inputs.maxDrawdownPct), [inputs]);
  const low = useMemo(() => sample(65, 1, inputs.riskPerTradePct, inputs.profitTargetPct, inputs.maxDrawdownPct), [inputs]);

  const Card: React.FC<{ kind: "high" | "low"; data: ReturnType<typeof sample> }> = ({ kind, data }) => {
    const isHigh = kind === "high";
    const accent = isHigh ? colors.danger : colors.success;
    return (
      <View style={[s.card, { borderColor: accent }]} testID={`variance-${kind}`}>
        <View style={s.head}>
          <Ionicons name={isHigh ? "trending-up" : "shield-outline"} size={18} color={accent} />
          <Text style={[s.title2, { color: accent }]}>{isHigh ? "HIGH VARIANCE" : "LOW VARIANCE"}</Text>
        </View>
        <Text style={s.sub}>{isHigh ? "35% WR · 3.0 RR · Big swings" : "65% WR · 1.0 RR · Steady"}</Text>
        <View style={s.row}><Text style={s.l}>Expected Loss Streak</Text><Text style={[s.v, { color: colors.warning }]}>{data.lossStreak.toFixed(1)}</Text></View>
        <View style={s.row}><Text style={s.l}>Pass Probability</Text><Text style={[s.v, { color: data.pass >= 65 ? colors.success : colors.warning }]}>{data.pass.toFixed(1)}%</Text></View>
        <View style={s.row}><Text style={s.l}>Drawdown</Text><Text style={[s.v, { color: colors.warning }]}>{data.dd.toFixed(1)}%</Text></View>
        <View style={s.row}><Text style={s.l}>Risk of Ruin</Text><Text style={[s.v, { color: colors.danger }]}>{data.ror.toFixed(2)}%</Text></View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View>
          <Text style={s.eyebrow}>COMPARISON</Text>
          <Text style={s.title}>Variance Profiles</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.intro}>Two opposite strategy archetypes — judged with your current risk per trade, profit target and max drawdown.</Text>
        <Card kind="high" data={high} />
        <Card kind="low" data={low} />
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
  card: { backgroundColor: colors.card, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title2: { fontSize: 14, fontWeight: "900", letterSpacing: 1.4 },
  sub: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: 0.5 },
  l: { color: colors.textMuted, fontSize: 12 },
  v: { color: colors.text, fontSize: 14, fontWeight: "800" },
});
