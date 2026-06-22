import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, spacing, radius } from "@/src/theme";

interface Props {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  testID?: string;
  style?: ViewStyle;
}

export const KpiCard: React.FC<Props> = ({ label, value, hint, tone = "default", testID, style }) => {
  const valueColor =
    tone === "success" ? colors.success :
    tone === "warning" ? colors.warning :
    tone === "danger"  ? colors.danger :
    tone === "info"    ? colors.info : colors.text;
  return (
    <View style={[styles.card, style]} testID={testID}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text style={styles.hint} numberOfLines={1}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flex: 1,
    minHeight: 92,
    justifyContent: "space-between",
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  hint: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
});
