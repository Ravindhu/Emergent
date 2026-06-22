import React, { useMemo } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, heatColor } from "@/src/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  risk: number;
  rr: number;
  pass: number;
  ev: number;
  ror: number;
  expectancy: number;
  pf: number;
  drawdown: number;
}

export const CellDetailModal: React.FC<Props> = ({ visible, onClose, risk, rr, pass, ev, ror, expectancy, pf, drawdown }) => {
  const tone = heatColor(pass);
  const rows = useMemo(() => ([
    { l: "Pass Probability", v: `${pass.toFixed(1)}%`, c: tone },
    { l: "Expected Value", v: `${ev >= 0 ? "+" : "−"}$${Math.abs(ev).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, c: ev >= 0 ? colors.success : colors.danger },
    { l: "Expectancy (R)", v: `${expectancy.toFixed(3)}R`, c: colors.text },
    { l: "Profit Factor", v: pf.toFixed(2), c: colors.text },
    { l: "Risk of Ruin", v: `${(ror * 100).toFixed(2)}%`, c: ror > 0.2 ? colors.danger : colors.warning },
    { l: "Expected Drawdown", v: `${drawdown.toFixed(1)}%`, c: colors.warning },
  ]), [pass, ev, expectancy, pf, ror, drawdown, tone]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.eyebrow}>CELL ANALYTICS</Text>
              <Text style={s.title}>{risk.toFixed(2)}% Risk · {rr.toFixed(2)} RR</Text>
            </View>
            <Pressable onPress={onClose} testID="cell-detail-close" style={s.closeBtn}>
              <Text style={s.closeTxt}>×</Text>
            </Pressable>
          </View>
          <ScrollView>
            {rows.map((r, i) => (
              <View key={i} style={s.row}>
                <Text style={s.l}>{r.l}</Text>
                <Text style={[s.v, { color: r.c }]}>{r.v}</Text>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderColor: colors.border, borderWidth: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.panel },
  closeTxt: { color: colors.text, fontSize: 22, lineHeight: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  l: { color: colors.textMuted, fontSize: 13 },
  v: { fontSize: 15, fontWeight: "800" },
});
