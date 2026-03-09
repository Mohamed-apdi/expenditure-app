/**
 * Bottom tab bar for main app navigation
 */
import { useRouter } from "expo-router";
import { Banknote, BarChart2, Home, Plus, Wallet } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useLanguage, useTheme } from "~/lib";
import { playTabClickSound } from "~/lib/utils/playTabSound";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();

  const tabs = [
    {
      route: "/(main)/Dashboard",
      icon: <Entypo name="home" size={24} color="black" />,
      label: t.home || "Home",
      index: 0,
    },
    {
      route: "/(main)/ReportsScreen",
      icon: <FontAwesome6 name="chart-simple" size={24} color="black" />,
      label: t.reports || "Reports",
      index: 1,
    },
    null, // Placeholder for middle add button
    {
      route: "/(main)/BudgetScreen",
      icon: <Entypo name="wallet" size={24} color="black" />,
      label: t.budgets || "Budget",
      index: 2,
    },
    {
      route: "/(main)/Accounts",
      icon: <MaterialIcons name="account-balance" size={24} color="black" />,
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
                  backgroundColor: "#00BFFF",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 8,
                  marginTop: -28,
                }}
                onPress={() => {
                  void playTabClickSound();
                  router.push("/(expense)/AddExpense");
                }}
              >
                <Plus size={28} color={theme.primaryText} />
              </TouchableOpacity>
            </View>
          );
        }

        const isActive = state.index === tab.index;
        const Icon = tab.icon;
        const activeColor = "#00BFFF";
        const iconColor = isActive ? activeColor : theme.textMuted;

        const iconContent = React.isValidElement(Icon) ? (
          React.cloneElement(Icon as React.ReactElement<{ size?: number; color?: string }>, {
            size: 22,
            color: iconColor,
          })
        ) : (
          React.createElement(
            Icon as unknown as React.ComponentType<{ size: number; color: string; strokeWidth?: number; opacity?: number }>,
            {
              size: 22,
              color: iconColor,
              strokeWidth: isActive ? 2.5 : 2,
              opacity: 1,
            }
          )
        );

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
            onPress={() => {
              void playTabClickSound();
              router.push(tab.route as any);
            }}
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
              {iconContent}
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
