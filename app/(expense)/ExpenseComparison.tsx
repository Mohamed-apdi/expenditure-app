import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BarChart } from "react-native-chart-kit";
import {
  ArrowLeft,
  Settings,
  ChevronDown,
  ShoppingCart,
  Home,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  FileText,
  Save,
  Calendar,
  Target,
  Check,
  X,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

type Timeframe = "weekly" | "monthly" | "quarterly";

type ExpenseBreakdown = {
  food: number;
  nonFood: number;
  rent: number;
};

type Scenario = {
  id: string;
  name: string;
  total: number;
  breakdown: ExpenseBreakdown;
  confidence: number;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
};

export default function CompareExpensesScreen() {
  const router = useRouter();
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<Timeframe>("monthly");
  const [showTimeframeModal, setShowTimeframeModal] = useState(false);

  const timeframes = [
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "quarterly", label: "Quarterly" },
  ];

  // Sample data for two scenarios
  const scenarios: Scenario[] = [
    {
      id: "current",
      name: "Current",
      total: 2450.75,
      breakdown: {
        food: 850.25,
        nonFood: 680.5,
        rent: 920.0,
      },
      confidence: 92,
      trend: "up",
      trendPercentage: 8.5,
    },
    {
      id: "alternative",
      name: "Alternative",
      total: 2180.4,
      breakdown: {
        food: 720.15,
        nonFood: 540.25,
        rent: 920.0,
      },
      confidence: 87,
      trend: "down",
      trendPercentage: 11.2,
    },
  ];

  // Chart data
  const chartData = {
    labels: ["Food", "Non-food", "Rent"],
    datasets: [
      {
        data: [
          scenarios[0].breakdown.food,
          scenarios[0].breakdown.nonFood,
          scenarios[0].breakdown.rent,
        ],
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // emerald-500
      },
      {
        data: [
          scenarios[1].breakdown.food,
          scenarios[1].breakdown.nonFood,
          scenarios[1].breakdown.rent,
        ],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // blue-500
      },
    ],
    legend: ["Current", "Alternative"],
  };

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
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#334155",
      strokeWidth: 1,
    },
  };

  const getSelectedTimeframeLabel = () => {
    const timeframe = timeframes.find((t) => t.key === selectedTimeframe);
    return timeframe?.label || "Monthly";
  };

  const calculateSavings = () => {
    return scenarios[0].total - scenarios[1].total;
  };

  const calculateSavingsPercentage = () => {
    return ((calculateSavings() / scenarios[0].total) * 100).toFixed(1);
  };

  const renderScenarioCard = (scenario: Scenario, index: number) => {
    const isFirst = index === 0;
    const cardColor = isFirst ? "border-emerald-500" : "border-blue-500";
    const accentColor = isFirst ? "#10b981" : "#3b82f6";

    return (
      <View
        className={`flex-1 bg-slate-800 rounded-xl border ${cardColor} p-4 ${index === 0 ? "mr-2" : "ml-2"}`}
      >
        {/* Scenario Header */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white font-bold text-lg">{scenario.name}</Text>
          <View className="flex-row items-center">
            {scenario.trend === "up" ? (
              <TrendingUp size={16} color="#ef4444" />
            ) : scenario.trend === "down" ? (
              <TrendingDown size={16} color="#10b981" />
            ) : (
              <View className="w-4 h-4 rounded-full bg-slate-600" />
            )}
            <Text
              className={`ml-1 text-xs font-medium ${
                scenario.trend === "up"
                  ? "text-red-400"
                  : scenario.trend === "down"
                    ? "text-emerald-400"
                    : "text-slate-400"
              }`}
            >
              {scenario.trend === "up"
                ? "+"
                : scenario.trend === "down"
                  ? "-"
                  : ""}
              {scenario.trendPercentage}%
            </Text>
          </View>
        </View>

        {/* Total Amount */}
        <View className="mb-4">
          <Text className="text-slate-400 text-sm mb-1">Total Spent</Text>
          <Text className="text-white text-2xl font-bold">
            ${scenario.total.toFixed(2)}
          </Text>
        </View>

        {/* Breakdown */}
        <View className="gap-3 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-emerald-500/20 justify-center items-center mr-2">
                <ShoppingCart size={12} color="#10b981" />
              </View>
              <Text className="text-slate-300 text-sm">Food</Text>
            </View>
            <Text className="text-white font-semibold">
              ${scenario.breakdown.food.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-violet-500/20 justify-center items-center mr-2">
                <MoreHorizontal size={12} color="#8b5cf6" />
              </View>
              <Text className="text-slate-300 text-sm">Non-food</Text>
            </View>
            <Text className="text-white font-semibold">
              ${scenario.breakdown.nonFood.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-orange-500/20 justify-center items-center mr-2">
                <Home size={12} color="#f59e0b" />
              </View>
              <Text className="text-slate-300 text-sm">Rent</Text>
            </View>
            <Text className="text-white font-semibold">
              ${scenario.breakdown.rent.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Confidence Score */}
        <View className="pt-3 border-t border-slate-700">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-400 text-xs">Confidence</Text>
            <View className="flex-row items-center">
              <Target size={12} color={accentColor} />
              <Text className="text-white text-xs font-semibold ml-1">
                {scenario.confidence}%
              </Text>
            </View>
          </View>
          <View className="h-1.5 bg-slate-700 rounded-full mt-2">
            <View
              className="h-full rounded-full"
              style={{
                width: `${scenario.confidence}%`,
                backgroundColor: accentColor,
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Compare Expenses</Text>
        <TouchableOpacity>
          <Settings size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Timeframe Selector */}
        <View className="px-6 py-4">
          <TouchableOpacity
            className="flex-row items-center bg-slate-800 p-3 rounded-lg border border-slate-700"
            onPress={() => setShowTimeframeModal(true)}
          >
            <Calendar size={18} color="#10b981" />
            <Text className="text-white ml-2 flex-1">
              {getSelectedTimeframeLabel()} Comparison
            </Text>
            <ChevronDown size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Scenario Cards */}
        <View className="px-6 mb-6">
          <View className="flex-row">
            {scenarios.map((scenario, index) =>
              renderScenarioCard(scenario, index)
            )}
          </View>
        </View>

        {/* Savings Summary */}
        <View className="px-6 mb-6">
          <View className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-bold text-lg">
                Potential Savings
              </Text>
              <View className="bg-emerald-500/20 px-3 py-1 rounded-full">
                <Text className="text-emerald-500 font-semibold text-sm">
                  {calculateSavingsPercentage()}% less
                </Text>
              </View>
            </View>
            <Text className="text-emerald-500 text-3xl font-bold mb-2">
              ${calculateSavings().toFixed(2)}
            </Text>
            <Text className="text-slate-400 text-sm">
              By switching to the alternative scenario, you could save this
              amount per {selectedTimeframe.slice(0, -2)}.
            </Text>
          </View>
        </View>

        {/* Comparison Chart */}
        <View className="px-6 mb-6">
          <View className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <Text className="text-white font-bold text-lg mb-4">
              Category Comparison
            </Text>
            <BarChart
              data={chartData}
              width={width - 48}
              height={220}
              chartConfig={chartConfig}
              verticalLabelRotation={0}
              showValuesOnTopOfBars={true}
              fromZero={true}
            />
          </View>
        </View>

        {/* Key Insights */}
        <View className="px-6 mb-6">
          <View className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <Text className="text-white font-bold text-lg mb-4">
              Key Insights
            </Text>
            <View className="gap-3">
              <View className="flex-row items-start">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mt-2 mr-3" />
                <Text className="text-slate-300 flex-1">
                  Food expenses could be reduced by $
                  {(
                    scenarios[0].breakdown.food - scenarios[1].breakdown.food
                  ).toFixed(2)}{" "}
                  (
                  {(
                    ((scenarios[0].breakdown.food -
                      scenarios[1].breakdown.food) /
                      scenarios[0].breakdown.food) *
                    100
                  ).toFixed(1)}
                  %)
                </Text>
              </View>
              <View className="flex-row items-start">
                <View className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3" />
                <Text className="text-slate-300 flex-1">
                  Non-food spending shows potential savings of $
                  {(
                    scenarios[0].breakdown.nonFood -
                    scenarios[1].breakdown.nonFood
                  ).toFixed(2)}
                </Text>
              </View>
              <View className="flex-row items-start">
                <View className="w-2 h-2 rounded-full bg-slate-500 mt-2 mr-3" />
                <Text className="text-slate-300 flex-1">
                  Rent remains constant across both scenarios
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="px-6 pb-8">
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-slate-800 p-4 rounded-xl border border-slate-700">
              <Save size={18} color="#94a3b8" />
              <Text className="text-slate-300 font-semibold ml-2">
                Save Comparison
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-emerald-500 p-4 rounded-xl">
              <FileText size={18} color="#ffffff" />
              <Text className="text-white font-semibold ml-2">Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Timeframe Selection Modal */}
      {showTimeframeModal && (
        <View className="absolute inset-0 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-3xl border-t border-slate-700 p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">
                Select Timeframe
              </Text>
              <TouchableOpacity onPress={() => setShowTimeframeModal(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View className="gap-2">
              {timeframes.map((timeframe) => (
                <TouchableOpacity
                  key={timeframe.key}
                  className={`flex-row justify-between items-center p-4 rounded-xl border ${
                    selectedTimeframe === timeframe.key
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-slate-800 border-slate-700"
                  }`}
                  onPress={() => {
                    setSelectedTimeframe(timeframe.key as Timeframe);
                    setShowTimeframeModal(false);
                  }}
                >
                  <Text
                    className={`${selectedTimeframe === timeframe.key ? "text-white font-semibold" : "text-slate-200"}`}
                  >
                    {timeframe.label}
                  </Text>
                  {selectedTimeframe === timeframe.key && (
                    <Check size={16} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
