import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, heatBg, heatColor } from "@/src/theme";
import { CellDetailModal } from "@/src/components/CellDetailModal";
import { ControlPanelSheet } from "@/src/components/ControlPanelSheet";
import { useStrategy } from "@/src/state/strategy-context";
import {
  RISK_LEVELS, RR_LEVELS, runSimulation,
  riskOfRuin, profitFactor, expectancyR,
} from "@/src/engine/calculator";

const CELL_W = 78;
const CELL_H = 56;
const ROW_LABEL_W = 64;
const HEADER_H = 56;

interface Cell { pass: number; ev: number; roi: number; wr: number; }

export default function MatricesScreen() {
  const sheet = useRef<BottomSheet>(null);
  const { inputs } = useStrategy();
  const [mode, setMode] = useState<"pass" | "roi">("pass");
  const [wrMode, setWrMode] = useState<"stepped" | "fixed">("stepped");
  const [selected, setSelected] = useState<{ ri: number; ci: number } | null>(null);

  // Derive per-column WR
  // - stepped: equally-divided WR from 90% down to 20% across the 8 RR columns
  // - fixed:   use user's input WR for all columns
  const colWRs = useMemo<number[]>(() => {
    if (wrMode === "fixed") return RR_LEVELS.map(() => inputs.winRate);
    const hi = 90;
    const lo = 20;
    const n = RR_LEVELS.length;
    return RR_LEVELS.map((_, i) => hi - ((hi - lo) * i) / (n - 1));
  }, [wrMode, inputs.winRate]);

  // Compute cells via mini-Monte-Carlo respecting user's DD mode (trailing/static).
  // 16 × 8 = 128 cells × 200 paths × 300 trades ≈ 7.7M iterations → <1s on modern devices.
  const cells = useMemo<Cell[][]>(() => {
    const target = inputs.accountSize * (inputs.profitTargetPct / 100);
    const profitDollar = target * (inputs.profitSplitPct / 100);
    return RISK_LEVELS.map((risk) =>
      RR_LEVELS.map((rr, ci) => {
        const wr = colWRs[ci];
        // Allow enough trade horizon: at 0.25% risk × 0.10R expectancy → ~400 trades to target.
        // Scale horizon to cell so slow-grinders don't time out before reaching target.
        const expR = (wr / 100) * rr - (1 - wr / 100);
        const unitsTarget = inputs.profitTargetPct / risk;
        const horizon = expR > 0
          ? Math.max(200, Math.min(2000, Math.ceil((unitsTarget / expR) * 4)))
          : 600;
        const r = runSimulation({
          winRate: wr / 100,
          rr,
          riskPerTradePct: risk,
          accountSize: inputs.accountSize,
          profitTargetPct: inputs.profitTargetPct,
          maxDrawdownPct: inputs.maxDrawdownPct,
          dailyDrawdownPct: inputs.dailyDrawdownPct,
          consistencyRulePct: inputs.consistencyRulePct,
          tradesPerDay: inputs.tradesPerDay,
          tradesPerSimulation: horizon,
          ddMode: inputs.ddMode,
          paths: 200,
          profitSplitPct: inputs.profitSplitPct,
          challengeFee: inputs.challengeFee,
          collectPaths: 0,
        });
        const pass = r.passProbability;
        const ev = (pass / 100) * profitDollar - (1 - pass / 100) * inputs.challengeFee;
        const roi = inputs.challengeFee > 0 ? (ev / inputs.challengeFee) * 100 : 0;
        return { pass, ev, roi, wr };
      })
    );
  }, [inputs, colWRs]);

  const handleCellPress = (ri: number, ci: number) => setSelected({ ri, ci });

  const sel = selected
    ? {
        risk: RISK_LEVELS[selected.ri],
        rr: RR_LEVELS[selected.ci],
        wr: colWRs[selected.ci],
        ...cells[selected.ri][selected.ci],
        ror: riskOfRuin(colWRs[selected.ci], RR_LEVELS[selected.ci], RISK_LEVELS[selected.ri], inputs.maxDrawdownPct),
        expectancy: expectancyR(colWRs[selected.ci], RR_LEVELS[selected.ci]),
        pf: profitFactor(colWRs[selected.ci], RR_LEVELS[selected.ci]),
        drawdown: RISK_LEVELS[selected.ri] * 3,
      }
    : null;

  const renderCell = (ri: number, ci: number) => {
    const c = cells[ri]?.[ci];
    if (!c) return <View key={ci} style={s.cell} />;
    const bg = heatBg(c.pass);
    const stroke = heatColor(c.pass);
    const main = mode === "pass" ? `${c.pass.toFixed(1)}%` : `${c.roi >= 0 ? "+" : ""}${c.roi.toFixed(0)}%`;
    const sub = mode === "pass"
      ? `${c.ev >= 0 ? "+" : "−"}$${Math.abs(c.ev).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : `${c.pass.toFixed(0)}%`;
    return (
      <Pressable
        key={ci}
        testID={`heat-cell-${ri}-${ci}`}
        onPress={() => handleCellPress(ri, ci)}
        style={({ pressed }) => [s.cell, { backgroundColor: bg, borderColor: stroke }, pressed && { opacity: 0.6 }]}>
        <Text style={s.cellMain} numberOfLines={1}>{main}</Text>
        <Text style={s.cellSub} numberOfLines={1}>{sub}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>HEATMAP</Text>
          <Text style={s.title}>Risk × Reward Matrix</Text>
        </View>
      </View>

      <View style={s.controls}>
        <View style={s.segment}>
          <Pressable testID="seg-pass" onPress={() => setMode("pass")} style={[s.segBtn, mode === "pass" && s.segActive]}>
            <Text style={[s.segTxt, mode === "pass" && s.segTxtActive]}>Pass %</Text>
          </Pressable>
          <Pressable testID="seg-roi" onPress={() => setMode("roi")} style={[s.segBtn, mode === "roi" && s.segActive]}>
            <Text style={[s.segTxt, mode === "roi" && s.segTxtActive]}>ROI</Text>
          </Pressable>
        </View>
        <View style={s.segmentSmall}>
          <Pressable testID="seg-stepped" onPress={() => setWrMode("stepped")} style={[s.segBtnSm, wrMode === "stepped" && s.segActiveAlt]}>
            <Text style={[s.segTxtSm, wrMode === "stepped" && s.segTxtActiveAlt]}>Stepped</Text>
          </Pressable>
          <Pressable testID="seg-fixed" onPress={() => setWrMode("fixed")} style={[s.segBtnSm, wrMode === "fixed" && s.segActiveAlt]}>
            <Text style={[s.segTxtSm, wrMode === "fixed" && s.segTxtActiveAlt]}>Fixed WR</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.caption}>
          {wrMode === "stepped"
            ? `Each column's WR is stepped equally from 90% down to 20% across the 8 RR levels.`
            : `All columns use your input win rate of ${inputs.winRate}% — varying RR only.`}
          {`  ·  DD mode: ${inputs.ddMode}`}
        </Text>

        <View style={s.matrixWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Header row with WR under each RR */}
              <View style={s.headerRow}>
                <View style={[s.cornerCell, { width: ROW_LABEL_W, height: HEADER_H }]}>
                  <Text style={s.axisLabel}>Risk / RR</Text>
                </View>
                {RR_LEVELS.map((rr, ci) => (
                  <View key={ci} style={[s.headerCell, { width: CELL_W, height: HEADER_H }]}>
                    <Text style={s.headerTxt}>{rr.toFixed(2)} RR</Text>
                    <Text style={s.headerSub}>{colWRs[ci].toFixed(1)}% WR</Text>
                  </View>
                ))}
              </View>
              {/* Rows scroll vertically */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }} nestedScrollEnabled>
                {RISK_LEVELS.map((risk, ri) => (
                  <View key={ri} style={s.row}>
                    <View style={[s.rowLabelCell, { width: ROW_LABEL_W }]}>
                      <Text style={s.headerTxt}>{risk.toFixed(2)}%</Text>
                      <Text style={s.headerSub}>${(inputs.accountSize * risk / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}/trade</Text>
                    </View>
                    {RR_LEVELS.map((_, ci) => renderCell(ri, ci))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>

        <View style={s.legend} testID="heatmap-legend">
          <View style={s.legendItem}><View style={[s.swatch, { backgroundColor: colors.danger }]} /><Text style={s.legendTxt}>0–35%</Text></View>
          <View style={s.legendItem}><View style={[s.swatch, { backgroundColor: colors.warning }]} /><Text style={s.legendTxt}>36–64%</Text></View>
          <View style={s.legendItem}><View style={[s.swatch, { backgroundColor: colors.success }]} /><Text style={s.legendTxt}>65–100%</Text></View>
        </View>
        <Text style={s.footnote}>Cells computed via Monte Carlo (200 paths × 300 trades) honouring your {inputs.ddMode} drawdown mode. Tap any cell for details.</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable
        testID="open-control-panel-matrices"
        onPress={() => sheet.current?.snapToIndex(0)}
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]}>
        <Ionicons name="options-outline" color={colors.bg} size={20} />
        <Text style={s.fabTxt}>Control Panel</Text>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  controls: {
    flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  segment: {
    flex: 1, flexDirection: "row",
    backgroundColor: colors.panel, borderRadius: radius.md, padding: 4, borderColor: colors.border, borderWidth: 1,
  },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: radius.sm },
  segActive: { backgroundColor: colors.success },
  segTxt: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  segTxtActive: { color: colors.bg },
  segmentSmall: {
    flexDirection: "row", backgroundColor: colors.panel, borderRadius: radius.md, padding: 4, borderColor: colors.border, borderWidth: 1,
  },
  segBtnSm: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  segActiveAlt: { backgroundColor: colors.info },
  segTxtSm: { color: colors.textMuted, fontWeight: "700", fontSize: 11 },
  segTxtActiveAlt: { color: colors.bg },
  scroll: { padding: spacing.lg, gap: spacing.md },
  caption: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  matrixWrap: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm,
    borderColor: colors.border, borderWidth: 1,
  },
  headerRow: { flexDirection: "row" },
  row: { flexDirection: "row" },
  cornerCell: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 0.5,
  },
  headerCell: {
    alignItems: "center", justifyContent: "center", padding: 2,
    backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 0.5,
  },
  rowLabelCell: {
    height: CELL_H, alignItems: "center", justifyContent: "center", padding: 2,
    backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 0.5,
  },
  cell: {
    width: CELL_W, height: CELL_H, alignItems: "center", justifyContent: "center",
    borderWidth: 0.5, padding: 4,
  },
  axisLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "700", textAlign: "center" },
  headerTxt: { color: colors.text, fontSize: 12, fontWeight: "700", textAlign: "center" },
  headerSub: { color: colors.textMuted, fontSize: 9, fontWeight: "600", marginTop: 2, textAlign: "center" },
  cellMain: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" },
  cellSub: { color: colors.text, fontSize: 10, fontWeight: "500", textAlign: "center", marginTop: 2, opacity: 0.9 },
  legend: { flexDirection: "row", gap: spacing.lg, justifyContent: "center", marginTop: spacing.sm },
  legendItem: { flexDirection: "row", gap: 6, alignItems: "center" },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  legendTxt: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  footnote: { color: colors.textDim, fontSize: 10, fontStyle: "italic", textAlign: "center" },
  fab: {
    position: "absolute", bottom: 92, right: spacing.lg,
    backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: radius.pill, flexDirection: "row", gap: 8, alignItems: "center",
    shadowColor: colors.success, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabTxt: { color: colors.bg, fontWeight: "800", fontSize: 13 },
});
