import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { useStrategy } from "@/src/state/strategy-context";
import { passProbabilityClosedForm } from "@/src/engine/calculator";

const ACCOUNTS = [5000, 10000, 20000, 50000, 100000, 200000];

// Typical prop-firm fee schedule (synthetic but realistic)
const feeFor = (size: number): number => {
  const map: Record<number, number> = {
    5000: 49,
    10000: 99,
    20000: 199,
    50000: 349,
    100000: 549,
    200000: 1049,
  };
  return map[size] ?? Math.round(size * 0.005);
};

export default function AccountComparison() {
  const router = useRouter();
  const { inputs } = useStrategy();

  const rows = useMemo(() => {
    return ACCOUNTS.map(size => {
      const fee = feeFor(size);
      const target = size * (inputs.profitTargetPct / 100);
      const maxDD = size * (inputs.maxDrawdownPct / 100);
      const pass = passProbabilityClosedForm(inputs.winRate, inputs.rr, inputs.riskPerTradePct, inputs.profitTargetPct, inputs.maxDrawdownPct);
      const expectedPayout = (pass / 100) * target * (inputs.profitSplitPct / 100);
      const roi = fee > 0 ? ((expectedPayout - fee) / fee) * 100 : 0;
      // Difficulty: bigger accounts demand more $ but pct stays same → score the value (smaller = harder funding wise but lower fee)
      const difficulty = Math.min(100, Math.max(0, (100 - pass) + (fee / size) * 1000));
      return { size, fee, target, maxDD, pass, expectedPayout, roi, difficulty };
    });
  }, [inputs]);

  const recommendedIdx = useMemo(() => {
    let best = 0; let bestScore = -Infinity;
    rows.forEach((r, i) => {
      const score = r.roi - r.difficulty * 0.5;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    return best;
  }, [rows]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View>
          <Text style={s.eyebrow}>SELECTION</Text>
          <Text style={s.title}>Account Comparison</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.note}>Comparison uses your current strategy ({inputs.winRate}% WR, {inputs.rr} RR, {inputs.riskPerTradePct}% risk).</Text>
        {rows.map((r, i) => {
          const isRec = i === recommendedIdx;
          return (
            <View key={r.size} style={[s.card, isRec && { borderColor: colors.success, borderWidth: 2 }]} testID={`account-${r.size}`}>
              <View style={s.rowTop}>
                <View>
                  <Text style={s.size}>${(r.size/1000).toFixed(0)}K</Text>
                  <Text style={s.fee}>Fee ${r.fee}</Text>
                </View>
                {isRec ? (
                  <View style={s.recoBadge} testID="recommended-badge">
                    <Ionicons name="star" size={12} color={colors.bg} />
                    <Text style={s.recoTxt}>RECOMMENDED</Text>
                  </View>
                ) : null}
              </View>
              <View style={s.grid}>
                <View style={s.gridCell}><Text style={s.gl}>Profit Target</Text><Text style={s.gv}>${r.target.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text></View>
                <View style={s.gridCell}><Text style={s.gl}>Max DD</Text><Text style={[s.gv, { color: colors.warning }]}>${r.maxDD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text></View>
                <View style={s.gridCell}><Text style={s.gl}>Pass Prob</Text><Text style={[s.gv, { color: r.pass >= 65 ? colors.success : r.pass >= 36 ? colors.warning : colors.danger }]}>{r.pass.toFixed(0)}%</Text></View>
                <View style={s.gridCell}><Text style={s.gl}>Expected Payout</Text><Text style={[s.gv, { color: colors.success }]}>${r.expectedPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text></View>
                <View style={s.gridCell}><Text style={s.gl}>Expected ROI</Text><Text style={[s.gv, { color: r.roi >= 0 ? colors.success : colors.danger }]}>{r.roi.toFixed(0)}%</Text></View>
                <View style={s.gridCell}><Text style={s.gl}>Difficulty</Text><Text style={[s.gv, { color: r.difficulty > 60 ? colors.danger : r.difficulty > 35 ? colors.warning : colors.success }]}>{r.difficulty.toFixed(0)}/100</Text></View>
              </View>
            </View>
          );
        })}
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
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  size: { color: colors.text, fontSize: 22, fontWeight: "900" },
  fee: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  recoBadge: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  recoTxt: { color: colors.bg, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  gridCell: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm, width: "31%" },
  gl: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
  gv: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 2 },
});
