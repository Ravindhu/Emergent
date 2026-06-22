import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "@/src/theme";
import { HeatmapMatrix } from "@/src/components/HeatmapMatrix";
import { CellDetailModal } from "@/src/components/CellDetailModal";
import { ControlPanelSheet } from "@/src/components/ControlPanelSheet";
import { useStrategy } from "@/src/state/strategy-context";
import {
  RISK_LEVELS, RR_LEVELS, passProbabilityClosedForm,
  riskOfRuin, profitFactor, expectancyR,
} from "@/src/engine/calculator";

export default function MatricesScreen() {
  const sheet = useRef<BottomSheet>(null);
  const { inputs } = useStrategy();
  const [mode, setMode] = useState<"pass" | "roi">("pass");
  const [selected, setSelected] = useState<{ ri: number; ci: number } | null>(null);

  const cells = useMemo(() => {
    const targetDollar = inputs.accountSize * (inputs.profitTargetPct / 100);
    return RISK_LEVELS.map((risk) => {
      return RR_LEVELS.map((rr) => {
        const pass = passProbabilityClosedForm(inputs.winRate, rr, risk, inputs.profitTargetPct, inputs.maxDrawdownPct);
        // EV per challenge = pass% * (profit * split) - (1 - pass%) * fee
        const profit = targetDollar * (inputs.profitSplitPct / 100);
        const ev = (pass / 100) * profit - (1 - pass / 100) * inputs.challengeFee;
        return { pass, ev };
      });
    });
  }, [inputs]);

  const handleCellPress = (ri: number, ci: number) => setSelected({ ri, ci });

  const sel = selected
    ? {
        risk: RISK_LEVELS[selected.ri],
        rr: RR_LEVELS[selected.ci],
        ...cells[selected.ri][selected.ci],
        ror: riskOfRuin(inputs.winRate, RR_LEVELS[selected.ci], RISK_LEVELS[selected.ri], inputs.maxDrawdownPct),
        expectancy: expectancyR(inputs.winRate, RR_LEVELS[selected.ci]),
        pf: profitFactor(inputs.winRate, RR_LEVELS[selected.ci]),
        drawdown: RISK_LEVELS[selected.ri] * 3,
      }
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>HEATMAP</Text>
          <Text style={styles.title}>Risk × Reward Matrix</Text>
        </View>
      </View>

      <View style={styles.segment}>
        <Pressable
          testID="seg-pass"
          onPress={() => setMode("pass")}
          style={[styles.segBtn, mode === "pass" && styles.segActive]}>
          <Text style={[styles.segTxt, mode === "pass" && styles.segTxtActive]}>Pass Probability</Text>
        </Pressable>
        <Pressable
          testID="seg-roi"
          onPress={() => setMode("roi")}
          style={[styles.segBtn, mode === "roi" && styles.segActive]}>
          <Text style={[styles.segTxt, mode === "roi" && styles.segTxtActive]}>ROI Matrix</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.caption}>
          Tap any cell for detailed analytics. {`Risk: ${RISK_LEVELS[0]}%–${RISK_LEVELS[RISK_LEVELS.length-1]}% · RR: ${RR_LEVELS[0]}–${RR_LEVELS[RR_LEVELS.length-1]}`}
        </Text>

        <View style={styles.matrixWrap}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <HeatmapMatrix cells={cells} mode={mode} onCellPress={handleCellPress} />
          </ScrollView>
        </View>

        <View style={styles.legend} testID="heatmap-legend">
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.danger }]} /><Text style={styles.legendTxt}>0–35%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.warning }]} /><Text style={styles.legendTxt}>36–64%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.success }]} /><Text style={styles.legendTxt}>65–100%</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable
        testID="open-control-panel-matrices"
        onPress={() => sheet.current?.snapToIndex(0)}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
        <Ionicons name="options-outline" color={colors.bg} size={20} />
        <Text style={styles.fabTxt}>Control Panel</Text>
      </Pressable>

      <ControlPanelSheet ref={sheet} />

      {sel ? (
        <CellDetailModal
          visible={!!selected}
          onClose={() => setSelected(null)}
          risk={sel.risk} rr={sel.rr} pass={sel.pass} ev={sel.ev}
          ror={sel.ror} expectancy={sel.expectancy} pf={sel.pf} drawdown={sel.drawdown}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  segment: {
    flexDirection: "row", margin: spacing.lg, marginBottom: 0,
    backgroundColor: colors.panel, borderRadius: radius.md, padding: 4, borderColor: colors.border, borderWidth: 1,
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.sm },
  segActive: { backgroundColor: colors.success },
  segTxt: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  segTxtActive: { color: colors.bg },
  scroll: { padding: spacing.lg, gap: spacing.md },
  caption: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  matrixWrap: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm,
    borderColor: colors.border, borderWidth: 1, maxHeight: 460,
  },
  legend: { flexDirection: "row", gap: spacing.lg, justifyContent: "center", marginTop: spacing.sm },
  legendItem: { flexDirection: "row", gap: 6, alignItems: "center" },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  legendTxt: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  fab: {
    position: "absolute", bottom: 92, right: spacing.lg,
    backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: radius.pill, flexDirection: "row", gap: 8, alignItems: "center",
    shadowColor: colors.success, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabTxt: { color: colors.bg, fontWeight: "800", fontSize: 13 },
});
