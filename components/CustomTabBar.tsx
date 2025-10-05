import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Home, BarChart2, Wallet, Plus, Banknote } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();

  const tabs = [
    { route: "/(main)/Dashboard", icon: Home, label: t.home || "Home", index: 0 },
    { route: "/(main)/ReportsScreen", icon: BarChart2, label: t.reports || "Reports", index: 1 },
    null, // Placeholder for middle add button
    { route: "/(main)/BudgetScreen", icon: Wallet, label: t.budgets || "Budget", index: 2 },
    { route: "/(main)/Accounts", icon: Banknote, label: t.accounts || "Accounts", index: 3 },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        height: 75,
        backgroundColor: theme.cardBackground,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      {tabs.map((tab, idx) => {
        // Middle Add Button
        if (tab === null) {
          return (
            <View key="add-button" style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <TouchableOpacity
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: theme.primary,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 8,
                  marginTop: -28,
                }}
                onPress={() => router.push("/(expense)/AddExpense")}
              >
                <Plus size={28} color={theme.primaryText} />
              </TouchableOpacity>
            </View>
          );
        }

        const isActive = state.index === tab.index;
        const Icon = tab.icon;

        return (
          <TouchableOpacity
            key={tab.route}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 6,
            }}
            onPress={() => router.push(tab.route as any)}
          >
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: 16,
                backgroundColor: isActive ? `${theme.primary}15` : "transparent",
              }}
            >
              <Icon
                size={22}
                color={isActive ? theme.primary : theme.textMuted}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={{
                  fontSize: 11,
                  marginTop: 4,
                  fontWeight: isActive ? "600" : "400",
                  color: isActive ? theme.primary : theme.textMuted,
                }}
              >
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
