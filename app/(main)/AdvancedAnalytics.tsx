"use client";

import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExpenseAnalytics } from "../(analytics)/ExpenseAnalytics";
import { AnalyticsHeader } from "../(analytics)/Header";
import { TabNavigation } from "../(analytics)/TabNavigation";

const { width } = Dimensions.get("window");

export default function AdvancedAnalyticsScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [selectedTab, setSelectedTab] = useState("overview");

  // Simplified periods - only month and year
  const periods = [
    { key: new Date().toISOString().slice(0, 7), label: "This Month" },
    { key: new Date().getFullYear().toString(), label: "This Year" },
  ];

  // Simplified tabs
  const tabs = [
    { key: "overview", label: "Overview", icon: "bar-chart-2" },
    { key: "categories", label: "Categories", icon: "pie-chart" },
    { key: "trends", label: "Trends", icon: "trending-up" },
  ];

  const chartConfig = {
    backgroundColor: "#1e293b",
    backgroundGradientFrom: "#1e293b",
    backgroundGradientTo: "#1e293b",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(248, 250, 252, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#10b981" },
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <AnalyticsHeader navigation={navigation} />

      {/* Period picker */}
      <View className="flex-row px-6 py-2 gap-2">
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            className={`flex-1 py-2 px-3 rounded-lg border ${
              selectedPeriod === period.key
                ? "bg-emerald-500 border-emerald-500"
                : "bg-slate-800 border-slate-700"
            }`}
            onPress={() => setSelectedPeriod(period.key)}
          >
            <Text
              className={`text-center text-sm font-medium ${
                selectedPeriod === period.key ? "text-white" : "text-slate-400"
              }`}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tabs */}
      <TabNavigation
        tabs={tabs}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
      />

      {/* Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-5">
          <ExpenseAnalytics
            chartConfig={chartConfig}
            width={width}
            selectedTab={selectedTab}
            selectedPeriod={selectedPeriod}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
