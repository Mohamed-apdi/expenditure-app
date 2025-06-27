import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LineChart, PieChart } from "react-native-chart-kit";
import {
  ArrowLeft,
  Settings,
  TrendingUp,
  PieChart as PieChartIcon,
  Target,
  FileText,
  Sun,
  CloudSnow,
  AlertTriangle,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Download,
  Share,
  Calendar,
  ChevronRight,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

type Period = "week" | "month" | "quarter" | "year";
type Tab = "patterns" | "categories" | "accuracy" | "reports";

export default function AdvancedAnalyticsScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [selectedTab, setSelectedTab] = useState<Tab>("patterns");

  const periods = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "quarter", label: "Quarter" },
    { key: "year", label: "Year" },
  ];

  const tabs = [
    { key: "patterns", label: "Patterns", icon: TrendingUp },
    { key: "categories", label: "Categories", icon: PieChartIcon },
    { key: "accuracy", label: "Accuracy", icon: Target },
    { key: "reports", label: "Reports", icon: FileText },
  ];

  // Chart data (same as original)
  const spendingTrendData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [{ data: [320, 450, 280, 390], color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, strokeWidth: 3 }],
  };

  const categoryData = [
    { name: "Food", amount: 850, color: "#10b981", percentage: 42 },
    { name: "Transport", amount: 320, color: "#3b82f6", percentage: 16 },
    { name: "Utilities", amount: 280, color: "#f59e0b", percentage: 14 },
    { name: "Entertainment", amount: 240, color: "#8b5cf6", percentage: 12 },
    { name: "Healthcare", amount: 180, color: "#ef4444", percentage: 9 },
    { name: "Other", amount: 130, color: "#64748b", percentage: 7 },
  ];

  const categoryChartData = categoryData.map((item) => ({
    name: item.name,
    population: item.amount,
    color: item.color,
    legendFontColor: "#f8fafc",
    legendFontSize: 12,
  }));

  const predictionAccuracyData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [{ data: [85, 88, 82, 90, 87, 92], color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, strokeWidth: 2 }],
  };

  const chartConfig = {
    backgroundColor: "#1e293b",
    backgroundGradientFrom: "#1e293b",
    backgroundGradientTo: "#1e293b",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(248, 250, 252, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#10b981" },
  };

  const renderPatternsTab = () => (
    <View className="px-6 py-5">
      {/* Spending Trends */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Spending Trends</Text>
        <LineChart
          data={spendingTrendData}
          width={width - 48}
          height={220}
          chartConfig={chartConfig}
          bezier
        />

        <View className="mt-4 gap-2">
          <View className="flex-row items-center">
            <TrendingUp size={16} color="#10b981" />
            <Text className="text-slate-200 ml-2">22% increase from last month</Text>
          </View>
          <View className="flex-row items-center">
            <Calendar size={16} color="#3b82f6" />
            <Text className="text-slate-200 ml-2">Highest spending on weekends</Text>
          </View>
        </View>
      </View>

      {/* Seasonal Analysis */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Seasonal Patterns</Text>
        <View className="flex-row gap-3">
          <View className="bg-slate-700 p-4 rounded-lg items-center flex-1">
            <Sun size={24} color="#f59e0b" />
            <Text className="text-slate-400 mt-2 mb-1">Summer</Text>
            <Text className="text-white text-lg font-bold">$2,450</Text>
            <Text className="text-emerald-500 text-sm font-medium">+15%</Text>
          </View>
          <View className="bg-slate-700 p-4 rounded-lg items-center flex-1">
            <CloudSnow size={24} color="#3b82f6" />
            <Text className="text-slate-400 mt-2 mb-1">Winter</Text>
            <Text className="text-white text-lg font-bold">$2,180</Text>
            <Text className="text-rose-500 text-sm font-medium">-8%</Text>
          </View>
        </View>
      </View>

      {/* Weekly Patterns */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Weekly Spending Pattern</Text>
        <View className="flex-row justify-between items-end h-24">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
            const amounts = [45, 32, 28, 38, 65, 120, 95];
            const height = (amounts[index] / Math.max(...amounts)) * 60;
            return (
              <View key={day} className="items-center flex-1">
                <View
                  className={`w-5 rounded-md ${index >= 5 ? "bg-emerald-500" : "bg-blue-500"}`}
                  style={{ height }}
                />
                <Text className="text-slate-400 text-xs mt-2">{day}</Text>
                <Text className="text-slate-500 text-xs">${amounts[index]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderCategoriesTab = () => (
    <View className="px-6 py-5">
      {/* Category Breakdown */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Category Breakdown</Text>
        <PieChart
          data={categoryChartData}
          width={width - 48}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Category Details */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Category Analysis</Text>
        {categoryData.map((category) => (
          <View key={category.name} className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                <Text className="text-white font-medium">{category.name}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-white font-bold">${category.amount}</Text>
                <Text className="text-slate-400">{category.percentage}%</Text>
              </View>
            </View>
            <View className="h-1.5 bg-slate-700 rounded-full">
              <View
                className="h-full rounded-full"
                style={{ width: `${category.percentage}%`, backgroundColor: category.color }}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Category Insights */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Category Insights</Text>
        <View className="gap-3">
          <View className="flex-row items-center bg-slate-700 p-3 rounded-lg">
            <AlertTriangle size={20} color="#f59e0b" />
            <View className="ml-3">
              <Text className="text-white font-semibold">Food spending above average</Text>
              <Text className="text-slate-400 text-sm">42% vs 35% recommended</Text>
            </View>
          </View>
          <View className="flex-row items-center bg-slate-700 p-3 rounded-lg">
            <TrendingDown size={20} color="#10b981" />
            <View className="ml-3">
              <Text className="text-white font-semibold">Transport costs optimized</Text>
              <Text className="text-slate-400 text-sm">16% vs 20% typical</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderAccuracyTab = () => (
    <View className="px-6 py-5">
      {/* Prediction Accuracy */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Prediction Accuracy Over Time</Text>
        <LineChart
          data={predictionAccuracyData}
          width={width - 48}
          height={220}
          chartConfig={chartConfig}
        />
        <View className="flex-row justify-around mt-4">
          <View className="items-center">
            <Text className="text-emerald-500 text-xl font-bold">87%</Text>
            <Text className="text-slate-400 text-xs">Average Accuracy</Text>
          </View>
          <View className="items-center">
            <Text className="text-emerald-500 text-xl font-bold">92%</Text>
            <Text className="text-slate-400 text-xs">Best Month</Text>
          </View>
          <View className="items-center">
            <Text className="text-emerald-500 text-xl font-bold">+5%</Text>
            <Text className="text-slate-400 text-xs">Improvement</Text>
          </View>
        </View>
      </View>

      {/* Model Performance */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Model Performance</Text>
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <Text className="text-slate-400 w-28">Prediction Confidence</Text>
            <View className="flex-1 h-2 bg-slate-700 rounded-full">
              <View className="h-full rounded-full bg-emerald-500 w-[85%]" />
            </View>
            <Text className="text-white font-bold w-10 text-right">85%</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Text className="text-slate-400 w-28">Data Quality Score</Text>
            <View className="flex-1 h-2 bg-slate-700 rounded-full">
              <View className="h-full rounded-full bg-blue-500 w-[92%]" />
            </View>
            <Text className="text-white font-bold w-10 text-right">92%</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Text className="text-slate-400 w-28">Model Stability</Text>
            <View className="flex-1 h-2 bg-slate-700 rounded-full">
              <View className="h-full rounded-full bg-violet-500 w-[78%]" />
            </View>
            <Text className="text-white font-bold w-10 text-right">78%</Text>
          </View>
        </View>
      </View>

      {/* Accuracy Factors */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Factors Affecting Accuracy</Text>
        <View className="gap-3">
          <View className="flex-row items-center">
            <CheckCircle size={16} color="#10b981" />
            <Text className="text-slate-200 ml-2 flex-1">Regular expense tracking improves accuracy</Text>
          </View>
          <View className="flex-row items-center">
            <CheckCircle size={16} color="#10b981" />
            <Text className="text-slate-200 ml-2 flex-1">Complete household data captured</Text>
          </View>
          <View className="flex-row items-center">
            <AlertCircle size={16} color="#f59e0b" />
            <Text className="text-slate-200 ml-2 flex-1">Seasonal variations may affect predictions</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderReportsTab = () => (
    <View className="px-6 py-5">
      {/* Export Options */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Export Reports</Text>
        <View className="gap-3">
          <TouchableOpacity className="bg-slate-700 p-4 rounded-lg items-center">
            <FileText size={24} color="#ef4444" />
            <Text className="text-white font-semibold mt-2 mb-1">PDF Report</Text>
            <Text className="text-slate-400 text-sm text-center">Comprehensive spending analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-slate-700 p-4 rounded-lg items-center">
            <Download size={24} color="#10b981" />
            <Text className="text-white font-semibold mt-2 mb-1">CSV Export</Text>
            <Text className="text-slate-400 text-sm text-center">Raw data for external analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-slate-700 p-4 rounded-lg items-center">
            <Share size={24} color="#3b82f6" />
            <Text className="text-white font-semibold mt-2 mb-1">Share Summary</Text>
            <Text className="text-slate-400 text-sm text-center">Quick insights for sharing</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Report Templates */}
      <View className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-5">
        <Text className="text-white text-lg font-bold mb-4">Report Templates</Text>
        <View className="gap-2">
          {[
            { icon: Calendar, title: "Monthly Summary", description: "Complete monthly spending breakdown", color: "#10b981" },
            { icon: PieChartIcon, title: "Category Analysis", description: "Detailed category spending report", color: "#3b82f6" },
            { icon: TrendingUp, title: "Trend Analysis", description: "Spending patterns and forecasts", color: "#8b5cf6" },
            { icon: Target, title: "Budget vs Actual", description: "Compare planned vs actual spending", color: "#f59e0b" },
          ].map((report) => (
            <TouchableOpacity key={report.title} className="flex-row items-center bg-slate-700 p-4 rounded-lg">
              <View className="w-10 h-10 rounded-full bg-slate-800 justify-center items-center mr-3">
                <report.icon size={20} color={report.color} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">{report.title}</Text>
                <Text className="text-slate-400 text-sm">{report.description}</Text>
              </View>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case "patterns": return renderPatternsTab();
      case "categories": return renderCategoriesTab();
      case "accuracy": return renderAccuracyTab();
      case "reports": return renderReportsTab();
      default: return renderPatternsTab();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Advanced Analytics</Text>
        <TouchableOpacity>
          <Settings size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View className="flex-row px-6 py-4 gap-2">
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            className={`flex-1 py-2 px-3 rounded-lg border ${
              selectedPeriod === period.key
                ? "bg-emerald-500 border-emerald-500"
                : "bg-slate-800 border-slate-700"
            }`}
            onPress={() => setSelectedPeriod(period.key as Period)}
          >
            <Text
              className={`text-center font-medium ${
                selectedPeriod === period.key ? "text-white font-semibold" : "text-slate-400"
              }`}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-slate-700 h-0 "
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 10, gap: 8, height: 74 }}
      >
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              className={`flex-row items-center py-2 px-4 rounded-full border ${
                selectedTab === tab.key
                  ? "bg-emerald-500 border-emerald-500"
                  : "bg-slate-800 border-slate-700"
              }`}
              onPress={() => setSelectedTab(tab.key as Tab)}
            >
              <IconComponent size={16} color={selectedTab === tab.key ? "#ffffff" : "#94a3b8"} />
              <Text
                className={`ml-2 font-medium ${
                  selectedTab === tab.key ? "text-white font-semibold" : "text-slate-400"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab Content */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}