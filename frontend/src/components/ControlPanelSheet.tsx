import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Switch } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { colors, spacing, radius } from "@/src/theme";
import { useStrategy } from "@/src/state/strategy-context";
import { StrategyInputs } from "@/src/engine/calculator";

interface NumProps {
  label: string;
  field: keyof StrategyInputs;
  suffix?: string;
  testID?: string;
  step?: number;
}

const NumField: React.FC<NumProps> = ({ label, field, suffix, testID, step }) => {
  const { inputs, setInputs } = useStrategy();
  const [txt, setTxt] = useState(String(inputs[field]));
  React.useEffect(() => { setTxt(String(inputs[field])); }, [inputs, field]);
  const commit = () => {
    const n = parseFloat(txt);
    if (!isNaN(n)) setInputs({ [field]: n } as Partial<StrategyInputs>);
    else setTxt(String(inputs[field]));
  };
  return (
    <View style={s.field}>
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

export const ControlPanelSheet = forwardRef<BottomSheet>((_, ref) => {
  const { inputs, setInputs, reset, runSim, running } = useStrategy();
  const snapPoints = useMemo(() => ["90%"], []);
  const renderBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.7} />
  ), []);

  const consistencyOptions = [0, 20, 30, 40, 50];

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.textMuted, width: 48 }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <View style={s.header}>
          <Text style={s.title}>Control Panel</Text>
          <Pressable
            testID="reset-button"
            onPress={reset}
            style={({ pressed }) => [s.resetBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.resetTxt}>Reset</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.section}>Account</Text>
          <View style={s.row2}>
            <NumField label="Account Size" field="accountSize" suffix="$" testID="input-account-size" />
            <NumField label="Challenge Fee" field="challengeFee" suffix="$" testID="input-challenge-fee" />
          </View>
          <View style={s.row2}>
            <NumField label="Profit Target" field="profitTargetPct" suffix="%" testID="input-profit-target" />
            <NumField label="Profit Split" field="profitSplitPct" suffix="%" testID="input-profit-split" />
          </View>
          <View style={s.row2}>
            <NumField label="Max Drawdown" field="maxDrawdownPct" suffix="%" testID="input-max-dd" />
            <NumField label="Daily Drawdown" field="dailyDrawdownPct" suffix="%" testID="input-daily-dd" />
          </View>

          <Text style={s.section}>Strategy</Text>
          <View style={s.row2}>
            <NumField label="Win Rate" field="winRate" suffix="%" testID="input-win-rate" />
            <NumField label="Risk : Reward" field="rr" testID="input-rr" />
          </View>
          <View style={s.row2}>
            <NumField label="Risk / Trade" field="riskPerTradePct" suffix="%" testID="input-risk-per-trade" />
            <NumField label="Trades / Day" field="tradesPerDay" testID="input-trades-per-day" />
          </View>

          <Text style={s.section}>Consistency Rule</Text>
          <View style={s.chipRow}>
            {consistencyOptions.map(opt => {
              const active = inputs.consistencyRulePct === opt;
              return (
                <Pressable
                  key={opt}
                  testID={`consistency-${opt}`}
                  onPress={() => setInputs({ consistencyRulePct: opt })}
                  style={[s.chip, active && s.chipActive]}>
                  <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                    {opt === 0 ? "OFF" : `${opt}%`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.section}>Simulation</Text>
          <View style={s.row2}>
            <NumField label="Sim Paths" field="simulationPaths" testID="input-sim-paths" />
            <NumField label="Trades / Sim" field="tradesPerSimulation" testID="input-trades-per-sim" />
          </View>

          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Trailing Drawdown</Text>
            <Switch
              testID="toggle-trailing-dd"
              value={inputs.ddMode === "trailing"}
              onValueChange={(v) => setInputs({ ddMode: v ? "trailing" : "static" })}
              trackColor={{ false: colors.surface3, true: colors.success }}
              thumbColor={"#fff"}
            />
          </View>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Static Drawdown</Text>
            <Switch
              testID="toggle-static-dd"
              value={inputs.ddMode === "static"}
              onValueChange={(v) => setInputs({ ddMode: v ? "static" : "trailing" })}
              trackColor={{ false: colors.surface3, true: colors.warning }}
              thumbColor={"#fff"}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={s.cta}>
          <Pressable
            testID="run-simulation-button"
            disabled={running}
            onPress={runSim}
            style={({ pressed }) => [s.runBtn, pressed && { opacity: 0.7 }, running && { opacity: 0.5 }]}>
            <Text style={s.runTxt}>{running ? "Simulating…" : "Run Simulation"}</Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

ControlPanelSheet.displayName = "ControlPanelSheet";

const s = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  resetBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.panel },
  resetTxt: { color: colors.textMuted, fontWeight: "600", fontSize: 12 },
  content: { padding: spacing.lg, gap: spacing.md },
  section: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: spacing.sm },
  row2: { flexDirection: "row", gap: spacing.md },
  field: { flex: 1 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 15, fontWeight: "600" },
  suffix: { color: colors.textMuted, fontSize: 13, marginLeft: 6 },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.panel, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.success, borderColor: colors.success },
  chipTxt: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  chipTxtActive: { color: colors.bg },
  toggleRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.panel, borderRadius: radius.sm, borderColor: colors.border, borderWidth: 1,
  },
  toggleLabel: { color: colors.text, fontSize: 14, fontWeight: "500" },
  cta: {
    padding: spacing.lg, borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.card,
  },
  runBtn: {
    backgroundColor: colors.success, paddingVertical: 14, borderRadius: radius.md, alignItems: "center",
  },
  runTxt: { color: colors.bg, fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },
});
