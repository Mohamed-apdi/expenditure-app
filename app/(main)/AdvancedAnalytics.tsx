"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/Feather"
import { LineChart, PieChart } from "react-native-chart-kit"
import { ExpenseAnalytics } from "../(analytics)/ExpenseAnalytics"
import { PredictionsAnalytics } from "../(analytics)/PredictionsAnalytics"
import { AnalyticsHeader } from "../(analytics)/Header"
import { DataTypeSelector } from "../(analytics)/DataTypeSelector"
import { TabNavigation } from "../(analytics)/TabNavigation"

const { width } = Dimensions.get("window")

export default function AdvancedAnalyticsScreen({ navigation }) {
  const [selectedDataType, setSelectedDataType] = useState("expenses") // "expenses" or "predictions"
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM format
  const [selectedTab, setSelectedTab] = useState("overview")



  // Simplified periods - only month and year
  const periods = [
    { key: new Date().toISOString().slice(0, 7), label: "This Month" },
    { key: new Date().getFullYear().toString(), label: "This Year" },
  ]

  // Simplified tabs - removed insights
  const tabs = [
    { key: "overview", label: "Overview", icon: "bar-chart-2" },
    { key: "categories", label: "Categories", icon: "pie-chart" },
    { key: "trends", label: "Trends", icon: "trending-up" },
  ]

  const chartConfig = {
    backgroundColor: "#1e293b",
    backgroundGradientFrom: "#1e293b",
    backgroundGradientTo: "#1e293b",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(248, 250, 252, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#10b981",
    },
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <AnalyticsHeader navigation={navigation} />
      
      <DataTypeSelector
        selectedDataType={selectedDataType}
        setSelectedDataType={setSelectedDataType}
      />

      <View className="flex-row px-6 py-2 gap-2">
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            className={`flex-1 py-2 px-3 rounded-lg border ${
              selectedPeriod === period.key ? "bg-emerald-500 border-emerald-500" : "bg-slate-800 border-slate-700"
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

      <TabNavigation
        tabs={tabs}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-5">
          {selectedDataType === "expenses" ? (
            <ExpenseAnalytics 
              chartConfig={chartConfig} 
              width={width} 
              selectedTab={selectedTab}
              selectedPeriod={selectedPeriod}
            />
          ) : (
            <PredictionsAnalytics
              chartConfig={chartConfig} 
              width={width} 
              selectedTab={selectedTab}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
