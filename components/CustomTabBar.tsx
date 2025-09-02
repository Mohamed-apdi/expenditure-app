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

  return (
    <View
      className="flex-row  h-[70px] justify-around items-center "
      style={{
        backgroundColor: theme.background,
      }}
    >
      {/* Home */}
      <TouchableOpacity
        className="items-center justify-center"
        onPress={() => router.push("/(main)/Dashboard")}
      >
        <Home size={24} color={state.index === 0 ? "#3b82f6" : "#64748b"} />
        <Text
          className={`text-xs mt-0.5 ${state.index === 0 ? "text-[#3b82f6] font-medium" : "text-slate-500"}`}
        >
          {t.home}
        </Text>
      </TouchableOpacity>

      {/* Reports */}
      <TouchableOpacity
        className="items-center justify-center"
        onPress={() => router.push("/(main)/ReportsScreen")}
      >
        <BarChart2
          size={24}
          color={state.index === 1 ? "#3b82f6" : "#64748b"}
        />
        <Text
          className={`text-xs mt-0.5 ${state.index === 1 ? "text-[#3b82f6] font-medium" : "text-slate-500"}`}
        >
          {t.reports}
        </Text>
      </TouchableOpacity>

      {/* Middle Add Button */}
      <TouchableOpacity
        className="w-16 h-16 rounded-full bg-blue-600 justify-center items-center mb-10 shadow-lg shadow-black/20"
        onPress={() => router.push("/(expense)/AddExpense")}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      {/* Budget */}
      <TouchableOpacity
        className="items-center justify-center"
        onPress={() => router.push("/(main)/BudgetScreen")}
      >
        <Wallet size={24} color={state.index === 2 ? "#3b82f6" : "#64748b"} />
        <Text
          className={`text-xs mt-0.5 ${state.index === 2 ? "text-[#3b82f6] font-medium" : "text-slate-500"}`}
        >
          {t.budgets}
        </Text>
      </TouchableOpacity>

      {/* Accounts */}
      <TouchableOpacity
        className="items-center justify-center"
        onPress={() => router.push("/(main)/Accounts")}
      >
        <Banknote size={24} color={state.index === 3 ? "#3b82f6" : "#64748b"} />
        <Text
          className={`text-xs mt-0.5 ${state.index === 3 ? "text-[#3b82f6] font-medium" : "text-slate-500"}`}
        >
          {t.accounts}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
