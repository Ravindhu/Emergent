import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "@/src/theme";
import { useStrategy } from "@/src/state/strategy-context";
import {
  RISK_LEVELS, simulateMatrixCell, MatrixCell,
} from "@/src/engine/calculator";
import { passColor } from "@/src/components/passColor";

// Survival Matrix spec: 6 RR columns, 16 risk rows (0.25%..4.00% step 0.25%)
const RR_SET = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0];

const CELL_W = 60;
const CELL_H = 60;
const ROW_LABEL_W = 78;
const HEADER_H = 50;

const fmt$ = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

interface NumProps {
  label: string;
  value: number;
  onCommit: (n: number) => void;
  step?: number;
  suffix?: string;
  testID?: string;
  width?: number;
}

const NumInput: React.FC<NumProps> = ({ label, value, onCommit, suffix, testID, width }) => {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt(String(value)); }, [value]);
  const commit = () => {
    const n = parseFloat(txt);
    if (!isNaN(n)) onCommit(n);
    else setTxt(String(value));
  };
  return (
    <View style={[s.field, width ? { width } : { flex: 1 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput
          testID={testID}
          style={s.input}
          value={txt}
          keyboardType="numeric"
          onChangeText={setTxt}
          onBlur={commit}
          onSubmitEditing={commit}
          placeholder="0"
          placeholderTextColor={colors.textDim}
          selectionColor={colors.success}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
};

export default function SurvivalMatrix() {
  const { inputs, setInputs } = useStrategy();
  const [cells, setCells] = useState<(MatrixCell | null)[][]>(() =>
    RISK_LEVELS.map(() => RR_SET.map(() => null))
  );
  const [progress, setProgress] = useState<number>(0);
  const [computing, setComputing] = useState(false);
  const cancelRef = useRef<{ cancelled: boolean } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-column WR via Edge formula
  const colWRs = useMemo(() => RR_SET.map(rr => (1 + inputs.edge) / (1 + rr)), [inputs.edge]);

  // Schedule recompute (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Cancel any prior run
      if (cancelRef.current) cancelRef.current.cancelled = true;
      const myToken = { cancelled: false };
      cancelRef.current = myToken;
      setComputing(true);
      setProgress(0);

      const totalTrades = Math.max(1, Math.floor(inputs.tradesPerDay * inputs.evaluationDays));
      const numSims = Math.max(50, Math.floor(inputs.matrixSimulations));

      const grid: (MatrixCell | null)[][] = RISK_LEVELS.map(() => RR_SET.map(() => null));

      let ri = 0;
      const computeNextRow = () => {
        if (myToken.cancelled) return;
        if (ri >= RISK_LEVELS.length) {
          setComputing(false);
          setProgress(1);
          return;
        }
        const risk = RISK_LEVELS[ri];
        const rowCells: MatrixCell[] = RR_SET.map((rr, ci) => {
          const wr = (1 + inputs.edge) / (1 + rr);
          return simulateMatrixCell({
            winRate: Math.max(0.0001, Math.min(0.9999, wr)),
            rrRatio: rr,
            riskPct: risk,
            totalTrades,
            tradesPerDay: inputs.tradesPerDay,
            profitTargetPct: inputs.profitTargetPct,
            maxDailyLossPct: inputs.dailyDrawdownPct,
            maxOverallDDPct: inputs.maxDrawdownPct,
            consistencyRuleOn: inputs.consistencyRuleOn,
            consistencyThresholdPct: inputs.consistencyThresholdPct,
            numSimulations: numSims,
            seed: 0x9E37_79B1 ^ (ri * 1000 + ci),
          });
        });
        grid[ri] = rowCells;
        ri += 1;
        // Update progress every few rows to reduce re-renders
        setProgress(ri / RISK_LEVELS.length);
        // Only commit grid every 4 rows OR on completion
        if (ri % 4 === 0 || ri === RISK_LEVELS.length) {
          setCells(grid.map(row => row.slice()));
        }
        setTimeout(computeNextRow, 0); // yield to UI
      };
      setTimeout(computeNextRow, 0);
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    inputs.tradesPerDay, inputs.evaluationDays, inputs.matrixSimulations,
    inputs.edge, inputs.accountSize, inputs.profitTargetPct,
    inputs.dailyDrawdownPct, inputs.maxDrawdownPct,
    inputs.consistencyRuleOn, inputs.consistencyThresholdPct,
  ]);

  const scenarioLabel = useMemo(() => {
    if (inputs.consistencyRuleOn) return `Consistency Rule · ${inputs.tradesPerDay} Trade${inputs.tradesPerDay > 1 ? "s" : ""} Per Day`;
    if (inputs.tradesPerDay > 1) return `${inputs.tradesPerDay} Trades Per Day`;
    return inputs.edge > 0 ? "Positive Edge" : "Zero Edge";
  }, [inputs.consistencyRuleOn, inputs.tradesPerDay, inputs.edge]);

  const ddCaption = useMemo(() => {
    // Heuristic: tight when tradesPerDay × evaluationDays × riskPct is high (more chances to trail)
    const exposure = inputs.tradesPerDay * inputs.evaluationDays;
    if (exposure >= 60) return "Max DD trails tight with every trade.";
    if (exposure >= 20) return "Max DD trails moderately as equity grows.";
    return "Max DD trails looser with sparse trading.";
  }, [inputs.tradesPerDay, inputs.evaluationDays]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.eyebrow}>PROBABILITY DASHBOARD</Text>
          <Text style={s.title}>Risk / Reward Survival Matrix</Text>
          <Text style={s.scenario}>{scenarioLabel}</Text>
        </View>

        {/* Controls panel */}
        <View style={s.controls}>
          {/* Trades per day button group */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Trades Per Day</Text>
            <View style={s.btnGroup}>
              {[1, 2, 3, 5, 10].map(n => {
                const active = inputs.tradesPerDay === n;
                return (
                  <Pressable
                    key={n}
                    testID={`tpd-${n}`}
                    onPress={() => setInputs({ tradesPerDay: n })}
                    style={[s.tpdBtn, active && s.tpdBtnActive]}>
                    <Text style={[s.tpdTxt, active && s.tpdTxtActive]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Consistency rule */}
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Consistency Rule</Text>
              <Text style={s.toggleSub}>Fail sims where any single day &gt; threshold of total profit</Text>
            </View>
            <Switch
              testID="toggle-consistency"
              value={inputs.consistencyRuleOn}
              onValueChange={(v) => setInputs({ consistencyRuleOn: v })}
              trackColor={{ false: colors.surface3, true: colors.warning }}
              thumbColor={"#fff"}
            />
          </View>
          {inputs.consistencyRuleOn ? (
            <View style={s.row2}>
              <NumInput label="Threshold" value={inputs.consistencyThresholdPct}
                onCommit={(n) => setInputs({ consistencyThresholdPct: Math.max(1, Math.min(100, n)) })}
                suffix="%" testID="input-consist-threshold" />
              <View style={{ flex: 1 }} />
            </View>
          ) : null}

          {/* Account & challenge spec */}
          <View style={s.row2}>
            <NumInput label="Account Size" value={inputs.accountSize}
              onCommit={(n) => setInputs({ accountSize: Math.max(1, n) })}
              suffix="$" testID="input-account-size" />
            <NumInput label="Evaluation Days" value={inputs.evaluationDays}
              onCommit={(n) => setInputs({ evaluationDays: Math.max(1, Math.floor(n)) })}
              testID="input-eval-days" />
          </View>
          <View style={s.row2}>
            <NumInput label="Profit Target" value={inputs.profitTargetPct}
              onCommit={(n) => setInputs({ profitTargetPct: Math.max(0.1, n) })}
              suffix="%" testID="input-target" />
            <NumInput label="Max Daily Loss" value={inputs.dailyDrawdownPct}
              onCommit={(n) => setInputs({ dailyDrawdownPct: Math.max(0.1, n) })}
              suffix="%" testID="input-daily" />
          </View>
          <View style={s.row2}>
            <NumInput label="Max Overall DD" value={inputs.maxDrawdownPct}
              onCommit={(n) => setInputs({ maxDrawdownPct: Math.max(0.1, n) })}
              suffix="%" testID="input-max-dd" />
            <NumInput label="Edge (R)" value={inputs.edge}
              onCommit={(n) => setInputs({ edge: Math.max(-1, Math.min(2, n)) })}
              testID="input-edge" />
          </View>
          <View style={s.row2}>
            <NumInput label="Number of Simulations" value={inputs.matrixSimulations}
              onCommit={(n) => setInputs({ matrixSimulations: Math.max(50, Math.min(20000, Math.floor(n))) })}
              testID="input-sims" />
            <View style={{ flex: 1 }} />
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressWrap}>
          <View style={[s.progressBar, { width: `${Math.round(progress * 100)}%` }]} />
          {computing ? (
            <View style={s.progressOverlay}>
              <ActivityIndicator size="small" color={colors.success} />
              <Text style={s.progressTxt}>Simulating · {Math.round(progress * 100)}%</Text>
            </View>
          ) : null}
        </View>

        {/* Heatmap */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
          <View>
            {/* Header row */}
            <View style={s.headerRow}>
              <View style={[s.cornerCell, { width: ROW_LABEL_W, height: HEADER_H }]}>
                <Text style={s.axisLabel}>Risk / Trade</Text>
              </View>
              {RR_SET.map((rr, ci) => (
                <View key={ci} style={[s.headerCell, { width: CELL_W, height: HEADER_H }]} testID={`col-header-${ci}`}>
                  <Text style={s.headerRR}>{rr.toFixed(2)} RR</Text>
                  <Text style={s.headerWR}>{(colWRs[ci] * 100).toFixed(1)}% WR</Text>
                </View>
              ))}
            </View>
            {/* Cells */}
            {RISK_LEVELS.map((risk, ri) => {
              const dollarPerTrade = inputs.accountSize * (risk / 100);
              return (
                <View key={ri} style={s.row}>
                  <View style={[s.rowLabelCell, { width: ROW_LABEL_W }]}>
                    <Text style={s.rowRisk}>{risk.toFixed(2)}%</Text>
                    <Text style={s.rowDollar}>{fmt$(dollarPerTrade)}/trade</Text>
                  </View>
                  {RR_SET.map((_, ci) => {
                    const c = cells[ri]?.[ci];
                    if (!c) {
                      return <View key={ci} style={[s.cell, { backgroundColor: colors.panel }]} testID={`cell-${ri}-${ci}`}>
                        <Text style={s.cellPending}>·</Text>
                      </View>;
                    }
                    const col = passColor(c.passPct);
                    const retSign = c.avgReturnPct >= 0 ? "+" : "−";
                    const retVal = `${retSign}${Math.abs(c.avgReturnPct).toFixed(1)}%`;
                    return (
                      <View key={ci} style={[s.cell, { backgroundColor: col.fill }]} testID={`cell-${ri}-${ci}`}>
                        <Text style={[s.cellMain, { color: col.text }]}>{c.passPct.toFixed(1)}%</Text>
                        <Text style={[s.cellSub, { color: c.avgReturnPct >= 0 ? "#0BD37B" : "#FF6E6E" }]}>{retVal}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Caption */}
        <Text style={s.ddCaption} testID="dd-caption">{ddCaption}</Text>

        {/* Legend */}
        <View style={s.legend}>
          <View style={s.legendBar}>
            {[0, 25, 50, 75, 100].map(p => {
              const col = passColor(p);
              return <View key={p} style={[s.legendStop, { backgroundColor: col.fill }]} />;
            })}
          </View>
          <View style={s.legendLabels}>
            <Text style={s.legendTxt}>0%</Text>
            <Text style={s.legendTxt}>50%</Text>
            <Text style={s.legendTxt}>100%</Text>
          </View>
          <Text style={s.legendCaption}>Top number = % of {inputs.matrixSimulations.toLocaleString()} sims that PASSED · Bottom = average ending return %</Text>
        </View>
      </ScrollView>
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
  scenario: { color: colors.success, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: 6, textTransform: "uppercase" },
  controls: { padding: spacing.lg, gap: spacing.md },
  section: { gap: spacing.sm },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  btnGroup: { flexDirection: "row", gap: spacing.sm },
  tpdBtn: { flex: 1, paddingVertical: 12, backgroundColor: colors.panel, borderRadius: radius.sm, borderColor: colors.border, borderWidth: 1, alignItems: "center" },
  tpdBtnActive: { backgroundColor: colors.success, borderColor: colors.success },
  tpdTxt: { color: colors.textMuted, fontSize: 14, fontWeight: "800" },
  tpdTxtActive: { color: colors.bg },
  toggleRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderColor: colors.border, borderWidth: 1,
  },
  toggleLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
  toggleSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  row2: { flexDirection: "row", gap: spacing.md },
  field: { },
  fieldLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.panel, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  input: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 15, fontWeight: "700" },
  suffix: { color: colors.textMuted, fontSize: 13, marginLeft: 6 },
  progressWrap: { height: 4, backgroundColor: colors.panel, marginHorizontal: spacing.lg, borderRadius: 2, overflow: "hidden", position: "relative" },
  progressBar: { height: 4, backgroundColor: colors.success },
  progressOverlay: { position: "absolute", right: 8, top: -22, flexDirection: "row", gap: 6, alignItems: "center" },
  progressTxt: { color: colors.success, fontSize: 10, fontWeight: "700" },
  headerRow: { flexDirection: "row", marginTop: spacing.md },
  row: { flexDirection: "row" },
  cornerCell: { alignItems: "center", justifyContent: "center", backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 0.5 },
  headerCell: { alignItems: "center", justifyContent: "center", backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 0.5, padding: 2 },
  rowLabelCell: { height: CELL_H, alignItems: "center", justifyContent: "center", backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 0.5, padding: 2 },
  cell: { width: CELL_W, height: CELL_H, alignItems: "center", justifyContent: "center", borderColor: "#000", borderWidth: 0.3 },
  axisLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "700", textAlign: "center" },
  headerRR: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" },
  headerWR: { color: colors.textMuted, fontSize: 10, fontWeight: "600", marginTop: 2, textAlign: "center" },
  rowRisk: { color: colors.text, fontSize: 13, fontWeight: "800" },
  rowDollar: { color: colors.textMuted, fontSize: 10, fontWeight: "500", marginTop: 2 },
  cellMain: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  cellSub: { fontSize: 10, fontWeight: "700", marginTop: 2, textAlign: "center" },
  cellPending: { color: colors.textDim, fontSize: 18, fontWeight: "800" },
  ddCaption: {
    color: colors.textMuted, fontSize: 12, fontStyle: "italic",
    textAlign: "center", paddingHorizontal: spacing.lg, marginTop: spacing.md,
  },
  legend: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: 6 },
  legendBar: { flexDirection: "row", height: 12, borderRadius: 4, overflow: "hidden" },
  legendStop: { flex: 1, height: 12 },
  legendLabels: { flexDirection: "row", justifyContent: "space-between" },
  legendTxt: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
  legendCaption: { color: colors.textDim, fontSize: 10, textAlign: "center", marginTop: 4, fontStyle: "italic" },
});
