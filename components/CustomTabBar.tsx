import { useRouter } from "expo-router";
import { Banknote, BarChart2, Home, Plus, Wallet } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useLanguage, useTheme } from "~/lib";

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();

  const tabs = [
    {
      route: "/(main)/Dashboard",
      icon: Home,
      label: t.home || "Home",
      index: 0,
    },
    {
      route: "/(main)/ReportsScreen",
      icon: BarChart2,
      label: t.reports || "Reports",
      index: 1,
    },
    null, // Placeholder for middle add button
    {
      route: "/(main)/BudgetScreen",
      icon: Wallet,
      label: t.budgets || "Budget",
      index: 2,
    },
    {
      route: "/(main)/Accounts",
      icon: Banknote,
      label: t.accounts || "Accounts",
      index: 3,
    },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        height: 75,
        backgroundColor: theme.cardBackground,
        borderTopWidth: 1,
        borderTopColor: theme.isDark ? "#475569" : "#e2e8f0",
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      {tabs.map((tab, idx) => {
        // Middle Add Button
        if (tab === null) {
          return (
            <View
              key="add-button"
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TouchableOpacity
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: theme.tabActive,
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

        const activeColor = "#40A5E7";
        return (
          <TouchableOpacity
            key={tab.route}
            activeOpacity={1}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 6,
              opacity: 1,
            }}
            onPress={() => router.push(tab.route as any)}
          >
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 6,
                paddingHorizontal: 16,
                opacity: 1,
              }}
            >
              <Icon
                size={22}
                color={isActive ? activeColor : theme.textMuted}
                strokeWidth={isActive ? 2.5 : 2}
                opacity={1}
              />
              <Text
                style={{
                  fontSize: 11,
                  marginTop: 4,
                  fontWeight: isActive ? "600" : "400",
                  color: isActive ? activeColor : theme.textMuted,
                  opacity: 1,
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
