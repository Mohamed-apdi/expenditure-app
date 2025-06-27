import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { 
  Zap, Info, TrendingUp, Shield, AlertTriangle, 
  Lightbulb, TrendingDown, Minus, CheckCircle 
} from "lucide-react-native";
import { PieChart } from "react-native-chart-kit";

type Insight = {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: string;
  color: string;
};

export default function InsightsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const [prediction] = useState(1200);
  const [confidence] = useState(85);
  const [breakdown] = useState({
    food: 500,
    nonFood: 300,
    rent: 400,
  });

  const chartData = [
    {
      name: "Food",
      population: breakdown.food,
      color: "#10b981",
      legendFontColor: "#f8fafc",
      legendFontSize: 14,
    },
    {
      name: "Non-Food",
      population: breakdown.nonFood,
      color: "#3b82f6",
      legendFontColor: "#f8fafc",
      legendFontSize: 14,
    },
    {
      name: "Rent",
      population: breakdown.rent,
      color: "#8b5cf6",
      legendFontColor: "#f8fafc",
      legendFontSize: 14,
    },
  ];

  const insights: Insight[] = [
    {
      icon: <TrendingUp size={20} color="#f59e0b" />,
      title: "High Food Expenditure",
      description: "Food spending is 42% of total budget",
      type: "warning",
      color: "#f59e0b",
    },
    {
      icon: <Shield size={20} color="#10b981" />,
      title: "Stable Housing",
      description: "Rent is within recommended 30% range",
      type: "positive",
      color: "#10b981",
    },
    {
      icon: <AlertTriangle size={20} color="#3b82f6" />,
      title: "Budget Optimization",
      description: "Consider reducing non-essential spending",
      type: "suggestion",
      color: "#3b82f6",
    },
  ];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "#10b981";
    if (confidence >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const inputData = params.inputData ? JSON.parse(params.inputData as string) : {};

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="px-6 py-5">
          <Text className="text-white text-2xl font-bold mb-2">Expenditure Insights</Text>
          <Text className="text-slate-400 text-base leading-6">
            AI-powered analysis of your household spending
          </Text>
        </View>

        {/* Prediction Card */}
        <View className="mx-6 mb-5 bg-slate-800 p-6 rounded-xl border border-emerald-500">
          <View className="flex-row items-center mb-4">
            <Zap size={24} color="#10b981" />
            <Text className="text-white text-lg font-bold ml-3">Next Month Prediction</Text>
          </View>

          <View className="items-center mb-5">
            <Text className="text-emerald-500 text-4xl font-bold">${prediction}</Text>
            <Text className="text-slate-400 text-base mt-1">± $150</Text>
          </View>

          <View className="mb-4">
            <View className="h-2 bg-slate-700 rounded-full mb-2">
              <View 
                className="h-full rounded-full" 
                style={{ 
                  width: `${confidence}%`,
                  backgroundColor: getConfidenceColor(confidence)
                }}
              />
            </View>
            <Text className="text-slate-400 text-sm text-center font-medium">
              {confidence}% Confidence
            </Text>
          </View>

          <View className="flex-row items-center bg-slate-700 p-3 rounded-lg">
            <Info size={16} color="#3b82f6" />
            <Text className="text-white text-sm ml-2 flex-1">
              Key Factor: High food expenditure relative to income
            </Text>
          </View>
        </View>

        {/* Spending Breakdown Chart */}
        <View className="mx-6 mb-5 bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4 text-center">Spending Breakdown</Text>

          <PieChart
            data={chartData}
            width={width - 48}
            height={220}
            chartConfig={{
              backgroundColor: "#1e293b",
              backgroundGradientFrom: "#1e293b",
              backgroundGradientTo: "#1e293b",
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />

          <View className="mt-4 gap-2">
            {chartData.map((item, index) => (
              <View key={index} className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: item.color }} />
                  <Text className="text-white text-sm font-medium">{item.name}</Text>
                </View>
                <Text className="text-slate-400 text-sm font-bold">${item.population}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Insights Cards */}
        <View className="px-6 mb-5">
          <Text className="text-white text-lg font-bold mb-4">Smart Insights</Text>

          <View className="gap-3">
            {insights.map((insight, index) => (
              <View key={index} className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
                <View 
                  className="w-10 h-10 rounded-full justify-center items-center mr-4" 
                  style={{ backgroundColor: `${insight.color}20` }}
                >
                  {insight.icon}
                </View>

                <View className="flex-1">
                  <Text className="text-white text-base font-semibold">{insight.title}</Text>
                  <Text className="text-slate-400 text-sm">{insight.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recommendations */}
        <View className="mx-6 mb-5 bg-slate-800 p-5 rounded-xl border border-slate-700">
          <View className="flex-row items-center mb-4">
            <Lightbulb size={24} color="#f59e0b" />
            <Text className="text-white text-lg font-bold ml-3">Recommendations</Text>
          </View>

          <View className="gap-3">
            <View className="flex-row">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 mr-3" />
              <Text className="text-white text-sm flex-1">
                Consider meal planning to reduce food costs by 15-20%
              </Text>
            </View>

            <View className="flex-row">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 mr-3" />
              <Text className="text-white text-sm flex-1">
                Set up an emergency fund for unexpected expenses
              </Text>
            </View>

            <View className="flex-row">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 mr-3" />
              <Text className="text-white text-sm flex-1">
                Track daily expenses to identify spending patterns
              </Text>
            </View>
          </View>
        </View>

        {/* Historical Trends */}
        <View className="mx-6 mb-5 bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Spending Trends</Text>

          <View className="gap-4">
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white text-sm font-medium">Food Expenses</Text>
                <View className="flex-row items-center">
                  <TrendingUp size={14} color="#ef4444" />
                  <Text className="text-slate-400 text-xs ml-1">+12%</Text>
                </View>
              </View>
              <View className="h-1.5 bg-slate-700 rounded-full">
                <View className="h-full rounded-full bg-emerald-500" style={{ width: "75%" }} />
              </View>
            </View>

            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white text-sm font-medium">Non-Food</Text>
                <View className="flex-row items-center">
                  <TrendingDown size={14} color="#10b981" />
                  <Text className="text-slate-400 text-xs ml-1">-5%</Text>
                </View>
              </View>
              <View className="h-1.5 bg-slate-700 rounded-full">
                <View className="h-full rounded-full bg-blue-500" style={{ width: "45%" }} />
              </View>
            </View>

            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white text-sm font-medium">Housing</Text>
                <View className="flex-row items-center">
                  <Minus size={14} color="#64748b" />
                  <Text className="text-slate-400 text-xs ml-1">0%</Text>
                </View>
              </View>
              <View className="h-1.5 bg-slate-700 rounded-full">
                <View className="h-full rounded-full bg-violet-500" style={{ width: "60%" }} />
              </View>
            </View>
          </View>
        </View>

        {/* Model Inputs Summary */}
        <View className="mx-6 mb-6 bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-1">Model Inputs Summary</Text>
          <Text className="text-slate-400 text-sm mb-4">All 30 variables captured for prediction</Text>

          <View className="gap-4 mb-4">
            <View className="bg-slate-700 p-3 rounded-lg">
              <Text className="text-emerald-500 text-sm font-bold mb-2">Basic Expenditures</Text>
              <Text className="text-white text-xs">Food: ${inputData.exp_food || 0}</Text>
              <Text className="text-white text-xs">Non-Food: ${inputData.exp_nfnd || 0}</Text>
              <Text className="text-white text-xs">Rent: ${inputData.exp_rent || 0}</Text>
              <Text className="text-white text-xs">Per Capita: ${inputData.pce || 0}</Text>
              <Text className="text-white text-xs">PCE Rate: {inputData.pcer || 0}%</Text>
            </View>

            <View className="bg-slate-700 p-3 rounded-lg">
              <Text className="text-emerald-500 text-sm font-bold mb-2">Household Profile</Text>
              <Text className="text-white text-xs">Size: {inputData.hhsize || 0} people</Text>
              <Text className="text-white text-xs">Region: {inputData.region_n === 2 ? "Urban" : "Rural"}</Text>
              <Text className="text-white text-xs">Poverty: {inputData.poor === 1 ? "Poor" : "Not Poor"}</Text>
              <Text className="text-white text-xs">Electricity: {inputData.hh_electricity === 1 ? "Yes" : "No"}</Text>
              <Text className="text-white text-xs">Water: {inputData.hh_water_type === 1 ? "Clean" : "Basic"}</Text>
            </View>

            <View className="bg-slate-700 p-3 rounded-lg">
              <Text className="text-emerald-500 text-sm font-bold mb-2">Financial</Text>
              <Text className="text-white text-xs">Remittances: ${inputData.remt9_11 || 0}</Text>
              <Text className="text-white text-xs">Loan 1: ${inputData.cr15_04quantity || 0}</Text>
              <Text className="text-white text-xs">Loan 2: ${inputData.cr15_05quantity || 0}</Text>
              <Text className="text-white text-xs">Credit Access: {inputData.cr15_06 === 1 ? "Yes" : "No"}</Text>
              <Text className="text-white text-xs">Financial Services: {inputData.cr15_10 === 1 ? "Yes" : "No"}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-center bg-emerald-500/20 py-3 px-4 rounded-lg">
            <CheckCircle size={16} color="#10b981" />
            <Text className="text-emerald-500 text-sm font-bold ml-2">
              100% Model Coverage (30/30 variables)
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}