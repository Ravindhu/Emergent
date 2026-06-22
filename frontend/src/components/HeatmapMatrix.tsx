import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { colors, spacing, radius, heatBg, heatColor } from "@/src/theme";
import { RISK_LEVELS, RR_LEVELS } from "@/src/engine/calculator";

interface Cell { pass: number; ev: number; }
interface Props {
  cells: Cell[][]; // [risk][rr]
  mode: "pass" | "roi";
  onCellPress?: (riskIdx: number, rrIdx: number) => void;
}

const CELL_W = 72;
const CELL_H = 56;
const ROW_LABEL_W = 56;

export const HeatmapMatrix: React.FC<Props> = ({ cells, mode, onCellPress }) => {
  return (
    <View testID="heatmap-matrix">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Column headers */}
          <View style={s.headerRow}>
            <View style={[s.cornerCell]}>
              <Text style={s.axisLabel}>R% \\ RR</Text>
            </View>
            {RR_LEVELS.map((rr, i) => (
              <View key={i} style={s.headerCell}>
                <Text style={s.headerTxt}>{rr.toFixed(2)}</Text>
              </View>
            ))}
          </View>
          {/* Rows */}
          {RISK_LEVELS.map((risk, ri) => (
            <View key={ri} style={s.row}>
              <View style={s.rowLabelCell}>
                <Text style={s.headerTxt}>{risk.toFixed(2)}%</Text>
              </View>
              {RR_LEVELS.map((_, ci) => {
                const c = cells[ri]?.[ci];
                if (!c) return <View key={ci} style={s.cell} />;
                const bg = heatBg(c.pass);
                const stroke = heatColor(c.pass);
                const main = mode === "pass"
                  ? `${c.pass.toFixed(1)}%`
                  : `${c.ev >= 0 ? "+" : "−"}$${Math.abs(c.ev).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                const sub = mode === "pass"
                  ? `${c.ev >= 0 ? "+" : "−"}$${Math.abs(c.ev).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : `${c.pass.toFixed(0)}%`;
                return (
                  <Pressable
                    key={ci}
                    testID={`heat-cell-${ri}-${ci}`}
                    onPress={() => onCellPress?.(ri, ci)}
                    style={({ pressed }) => [s.cell, { backgroundColor: bg, borderColor: stroke }, pressed && { opacity: 0.6 }]}>
                    <Text style={s.cellMain} numberOfLines={1}>{main}</Text>
                    <Text style={s.cellSub} numberOfLines={1}>{sub}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  headerRow: { flexDirection: "row" },
  row: { flexDirection: "row" },
  cornerCell: {
    width: ROW_LABEL_W, height: CELL_H, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 0.5,
  },
  headerCell: {
    width: CELL_W, height: CELL_H, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 0.5,
  },
  rowLabelCell: {
    width: ROW_LABEL_W, height: CELL_H, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 0.5,
  },
  cell: {
    width: CELL_W, height: CELL_H, alignItems: "center", justifyContent: "center",
    borderWidth: 0.5, padding: 4,
  },
  axisLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  headerTxt: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  cellMain: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" },
  cellSub: { color: colors.text, fontSize: 10, fontWeight: "500", textAlign: "center", marginTop: 2, opacity: 0.85 },
});
