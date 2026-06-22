import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { BarChart } from "react-native-gifted-charts";
import { colors, spacing, radius } from "@/src/theme";
import { recoveryNeeded } from "@/src/engine/calculator";

const SCREEN_W = Dimensions.get("window").width;

const LOSSES = [10, 20, 30, 40, 50, 60, 75];

export default function DrawdownRecovery() {
  const router = useRouter();

  const data = LOSSES.map(loss => {
    const rec = recoveryNeeded(loss);
    const tone = rec <= 25 ? colors.success : rec <= 67 ? colors.warning : colors.danger;
    return {
      value: rec,
      label: `${loss}%`,
      topLabelComponent: () => <Text style={[s.barLabel, { color: tone }]}>{rec.toFixed(0)}%</Text>,
      frontColor: tone,
    };
  });

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable testID="back-button" onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View>
          <Text style={s.eyebrow}>MATHEMATICS</Text>
          <Text style={s.title}>Drawdown Recovery</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.intro}>The asymmetry of losses. Recovery requires more than the loss — exponentially so as drawdown deepens.</Text>

        <View style={s.chartCard} testID="recovery-chart">
          <BarChart
            data={data}
            height={220}
            width={SCREEN_W - 80}
            barWidth={26}
            spacing={14}
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

        <View style={s.tableCard}>
          <Text style={s.tableTitle}>Recovery Table</Text>
          {LOSSES.map(l => {
            const r = recoveryNeeded(l);
            const tone = r <= 25 ? colors.success : r <= 67 ? colors.warning : colors.danger;
            return (
              <View key={l} style={s.row} testID={`recovery-row-${l}`}>
                <Text style={s.l}>{l}% loss</Text>
                <Text style={[s.v, { color: tone }]}>{r.toFixed(1)}% gain needed</Text>
              </View>
            );
          })}
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
  scroll: { padding: spacing.lg, gap: spacing.md },
  intro: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  chartCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderColor: colors.border, borderWidth: 1 },
  tableCard: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  tableTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomColor: colors.border, borderBottomWidth: 0.5 },
  l: { color: colors.textMuted, fontSize: 13 },
  v: { fontSize: 14, fontWeight: "800" },
  barLabel: { fontSize: 10, fontWeight: "800", marginBottom: 2 },
});
