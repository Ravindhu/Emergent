import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { BarChart } from "react-native-gifted-charts";
import { colors, spacing, radius } from "@/src/theme";
import { useStrategy } from "@/src/state/strategy-context";
import { passProbabilityClosedForm, riskOfRuin, avgStreak } from "@/src/engine/calculator";

const SCREEN_W = Dimensions.get("window").width;

const sample = (wr: number, rr: number, risk: number, target: number, maxDD: number, dailyDD: number, tpd: number) => {
  const pass = passProbabilityClosedForm(wr, rr, risk, target, maxDD, dailyDD, tpd);
  const ror = riskOfRuin(wr, rr, risk, maxDD);
  const lossStreak = avgStreak(1 - wr / 100);
  const dd = risk * lossStreak * 1.5;
  return { pass, ror: ror * 100, lossStreak, dd };
};

export default function Variance() {
  const router = useRouter();
  const { inputs } = useStrategy();

  // High variance = lower WR, high RR. Low variance = higher WR, low RR.
  const high = useMemo(() => sample(35, 3, inputs.riskPerTradePct, inputs.profitTargetPct, inputs.maxDrawdownPct, inputs.dailyDrawdownPct, inputs.tradesPerDay), [inputs]);
  const low = useMemo(() => sample(65, 1, inputs.riskPerTradePct, inputs.profitTargetPct, inputs.maxDrawdownPct, inputs.dailyDrawdownPct, inputs.tradesPerDay), [inputs]);

  // Build grouped bar chart data: 4 metric groups × 2 bars each.
  // Metrics are scaled differently (some are %, some are streak count) so we normalize
  // each to a 0-100 visual scale and show the raw value as a label.
  const chartData = useMemo(() => {
    const metrics = [
      { key: "Pass %", h: high.pass, l: low.pass, max: 100, fmt: (v: number) => `${v.toFixed(0)}%` },
      { key: "Drawdown", h: high.dd, l: low.dd, max: Math.max(high.dd, low.dd, 30), fmt: (v: number) => `${v.toFixed(1)}%` },
      { key: "RoR", h: high.ror, l: low.ror, max: Math.max(high.ror, low.ror, 50), fmt: (v: number) => `${v.toFixed(1)}%` },
      { key: "Loss Streak", h: high.lossStreak, l: low.lossStreak, max: Math.max(high.lossStreak, low.lossStreak, 5), fmt: (v: number) => v.toFixed(1) },
    ];
    const data: any[] = [];
    metrics.forEach((m) => {
      const hVal = (m.h / m.max) * 100;
      const lVal = (m.l / m.max) * 100;
      // High variance bar (red), with label below; show raw value above
      data.push({
        value: hVal,
        label: m.key,
        labelTextStyle: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
        frontColor: colors.danger,
        spacing: 4,
        topLabelComponent: () => (
          <Text style={[styles.barTop, { color: colors.danger }]}>{m.fmt(m.h)}</Text>
        ),
      });
      data.push({
        value: lVal,
        frontColor: colors.success,
        spacing: 22,
        topLabelComponent: () => (
          <Text style={[styles.barTop, { color: colors.success }]}>{m.fmt(m.l)}</Text>
        ),
      });
    });
    return data;
  }, [high, low]);

  const Card: React.FC<{ kind: "high" | "low"; data: ReturnType<typeof sample> }> = ({ kind, data }) => {
    const isHigh = kind === "high";
    const accent = isHigh ? colors.danger : colors.success;
    return (
      <View style={[styles.card, { borderColor: accent }]} testID={`variance-${kind}`}>
        <View style={styles.head}>
          <Ionicons name={isHigh ? "trending-up" : "shield-outline"} size={18} color={accent} />
          <Text style={[styles.title2, { color: accent }]}>{isHigh ? "HIGH VARIANCE" : "LOW VARIANCE"}</Text>
        </View>
        <Text style={styles.sub}>{isHigh ? "35% WR · 3.0 RR · Big swings" : "65% WR · 1.0 RR · Steady"}</Text>
        <View style={styles.row}><Text style={styles.l}>Expected Loss Streak</Text><Text style={[styles.v, { color: colors.warning }]}>{data.lossStreak.toFixed(1)}</Text></View>
        <View style={styles.row}><Text style={styles.l}>Pass Probability</Text><Text style={[styles.v, { color: data.pass >= 65 ? colors.success : colors.warning }]}>{data.pass.toFixed(1)}%</Text></View>
        <View style={styles.row}><Text style={styles.l}>Drawdown</Text><Text style={[styles.v, { color: colors.warning }]}>{data.dd.toFixed(1)}%</Text></View>
        <View style={styles.row}><Text style={styles.l}>Risk of Ruin</Text><Text style={[styles.v, { color: colors.danger }]}>{data.ror.toFixed(2)}%</Text></View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View>
          <Text style={styles.eyebrow}>COMPARISON</Text>
          <Text style={styles.title}>Variance Profiles</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Two opposite strategy archetypes — judged with your current risk per trade, profit target and max drawdown.</Text>

        <View style={styles.chartCard} testID="variance-chart">
          <Text style={styles.chartTitle}>Side-by-Side Profile</Text>
          <Text style={styles.chartSub}>Each metric normalized 0-100 · raw value on top</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors.danger }]} />
              <Text style={styles.legendTxt}>High Variance</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors.success }]} />
              <Text style={styles.legendTxt}>Low Variance</Text>
            </View>
          </View>
          <BarChart
            data={chartData}
            height={180}
            width={SCREEN_W - 100}
            barWidth={20}
            initialSpacing={10}
            noOfSections={5}
            maxValue={120}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            rulesColor={colors.border}
            rulesType="dashed"
            hideYAxisText
          />
        </View>

        <Card kind="high" data={high} />
        <Card kind="low" data={low} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.panel },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  intro: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  chartCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderColor: colors.border, borderWidth: 1 },
  chartTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  chartSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  legendRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md },
  legendItem: { flexDirection: "row", gap: 6, alignItems: "center" },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendTxt: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  barTop: { fontSize: 9, fontWeight: "800", marginBottom: 2 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title2: { fontSize: 14, fontWeight: "900", letterSpacing: 1.4 },
  sub: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: 0.5 },
  l: { color: colors.textMuted, fontSize: 12 },
  v: { color: colors.text, fontSize: 14, fontWeight: "800" },
});
