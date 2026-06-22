import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { useStrategy } from "@/src/state/strategy-context";

export default function Settings() {
  const router = useRouter();
  const { reset } = useStrategy();

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View>
          <Text style={s.eyebrow}>PREFERENCES</Text>
          <Text style={s.title}>Settings</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <Text style={s.label}>App</Text>
          <View style={s.row}><Text style={s.l}>Version</Text><Text style={s.v}>1.0.0</Text></View>
          <View style={s.row}><Text style={s.l}>Mode</Text><Text style={s.v}>Offline · Single User</Text></View>
          <View style={s.row}><Text style={s.l}>Persistence</Text><Text style={s.v}>Ephemeral</Text></View>
        </View>

        <Pressable testID="settings-reset" onPress={reset} style={s.resetBtn}>
          <Ionicons name="refresh" color={colors.danger} size={18} />
          <Text style={s.resetTxt}>Reset All Inputs</Text>
        </Pressable>

        <View style={s.card}>
          <Text style={s.label}>Disclaimer</Text>
          <Text style={s.disclaimer}>
            This tool provides statistical estimations only. Trading involves significant risk of loss. The simulator assumes constant
            edge and IID returns — real market behaviour exhibits regimes, fat tails, and serial correlation. Use these numbers as a
            sanity check, not a guarantee.
          </Text>
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
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: 0.5 },
  l: { color: colors.textMuted, fontSize: 13 },
  v: { color: colors.text, fontSize: 13, fontWeight: "700" },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderColor: colors.danger, borderWidth: 1, borderRadius: radius.md },
  resetTxt: { color: colors.danger, fontWeight: "700", fontSize: 14 },
  disclaimer: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
