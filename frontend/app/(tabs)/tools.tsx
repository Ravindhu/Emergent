import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";

interface ToolItem { id: string; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; route: string; testID: string; }

const TOOLS: ToolItem[] = [
  { id: "analyzer", title: "Strategy Analyzer", sub: "Expectancy · Profit Factor · Recovery · Grade", icon: "stats-chart-outline", route: "/strategy-analyzer", testID: "tool-analyzer" },
  { id: "optimizer", title: "Strategy Optimizer", sub: "Recommends Safe / Balanced / Aggressive profiles", icon: "sparkles-outline", route: "/optimizer", testID: "tool-optimizer" },
  { id: "accounts", title: "Account Comparison", sub: "$5K → $200K · fees · expected payout · ROI", icon: "wallet-outline", route: "/account-comparison", testID: "tool-accounts" },
  { id: "variance", title: "Variance Comparison", sub: "High variance vs low variance strategies", icon: "git-compare-outline", route: "/variance", testID: "tool-variance" },
  { id: "recovery", title: "Drawdown Recovery", sub: "Math of climbing out of a hole", icon: "trending-up-outline", route: "/drawdown-recovery", testID: "tool-recovery" },
  { id: "settings", title: "Settings", sub: "App preferences and disclaimers", icon: "settings-outline", route: "/settings", testID: "tool-settings" },
];

export default function ToolsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.eyebrow}>WORKBENCH</Text>
        <Text style={s.title}>Tools</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {TOOLS.map(t => (
          <Pressable
            key={t.id}
            testID={t.testID}
            onPress={() => router.push(t.route as any)}
            style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}>
            <View style={s.iconWrap}>
              <Ionicons name={t.icon} size={22} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{t.title}</Text>
              <Text style={s.cardSub} numberOfLines={1}>{t.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" color={colors.textMuted} size={20} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, borderBottomColor: colors.border, borderBottomWidth: 1 },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.panel, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  cardSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
