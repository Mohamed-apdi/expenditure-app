// components/analytics/ExpenseAnalytics.tsx
import { View, Text, ActivityIndicator } from "react-native"
import { LineChart, PieChart } from "react-native-chart-kit"
import Icon from "react-native-vector-icons/Feather"
import { useEffect, useState } from "react"
import { fetchExpenseCategories, fetchExpenseOverview, fetchExpenseTrends } from "~/lib/api";

export const ExpenseAnalytics = ({ 
  chartConfig, 
  width, 
  selectedTab,
  selectedPeriod 
}) => {
  const [overviewData, setOverviewData] = useState(null);
  const [categoriesData, setCategoriesData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (selectedTab === "overview") {
        const data = await fetchExpenseOverview(selectedPeriod);
        setOverviewData(data);
      } else if (selectedTab === "categories") {
        const data = await fetchExpenseCategories(selectedPeriod);
        setCategoriesData(data);
      } else if (selectedTab === "trends") {
        const data = await fetchExpenseTrends(selectedPeriod);
        setTrendsData(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTab, selectedPeriod]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-red-500">{error}</Text>
      </View>
    );
  }

  const renderOverviewTab = () => {
    if (!overviewData) return null;

    return (
      <View className="gap-5">
        <View className="flex-row gap-3">
          <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <Text className="text-slate-400 text-sm mb-1">Total Spent</Text>
            <Text className="text-white text-2xl font-bold">
              ${overviewData.total_amount.toFixed(2)}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">
              {overviewData.transaction_count} transactions
            </Text>
          </View>

          <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <Text className="text-slate-400 text-sm mb-1">Daily Average</Text>
            <Text className="text-white text-2xl font-bold">
              ${overviewData.avg_daily_spending.toFixed(2)}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">
              {selectedPeriod.includes("-") ? "This month" : "This year"}
            </Text>
          </View>
        </View>

        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Expense Breakdown</Text>
          <View className="gap-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-300">Recurring Expenses</Text>
              <Text className="text-emerald-400 font-bold">
                ${overviewData.recurring_vs_one_time.recurring.toFixed(2)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-300">One-time Expenses</Text>
              <Text className="text-blue-400 font-bold">
                ${overviewData.recurring_vs_one_time.one_time.toFixed(2)}
              </Text>
            </View>

            <View className="h-px bg-slate-700 my-2" />

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-300">Essential</Text>
              <Text className="text-emerald-400 font-bold">
                ${overviewData.essential_vs_non_essential.essential.toFixed(2)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-300">Non-Essential</Text>
              <Text className="text-amber-400 font-bold">
                ${overviewData.essential_vs_non_essential.non_essential.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderCategoriesTab = () => {
    if (!categoriesData) return null;

    return (
      <View className="gap-5">
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Spending by Category</Text>
          <PieChart
            data={categoriesData.categories.map((cat, index) => ({
              name: cat.category,
              population: cat.amount,
              color: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"][index % 6],
              legendFontColor: "#f8fafc",
              legendFontSize: 12,
            }))}
            width={width - 68}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Category Breakdown</Text>
          <View className="gap-3">
            {categoriesData.categories.map((category, index) => {
              const percentage = category.percentage;
              const colors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

              return (
                <View key={category.category} className="gap-2">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <View
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      <Text className="text-slate-300 font-medium">{category.category}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-white font-bold">${category.amount.toFixed(2)}</Text>
                      <Text className="text-slate-400 text-xs">{percentage}%</Text>
                    </View>
                  </View>

                  <View className="h-2 bg-slate-700 rounded-full">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: colors[index % colors.length],
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderTrendsTab = () => {
    if (!trendsData) return null;

    return (
      <View className="gap-5">
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Spending Trend</Text>
          <LineChart
            data={{
              labels: trendsData.trends.map(t => 
                selectedPeriod.length === 7 ? // If monthly
                  new Date(t.date.split(" to ")[0]).toLocaleDateString("en-US", { day: "numeric" }) :
                  new Date(t.date.split(" to ")[0]).toLocaleDateString("en-US", { month: "short" })
              ),
              datasets: [{
                data: trendsData.trends.map(t => t.amount),
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                strokeWidth: 3,
              }]
            }}
            width={width - 68}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 16 }}
          />
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case "overview":
        return renderOverviewTab();
      case "categories":
        return renderCategoriesTab();
      case "trends":
        return renderTrendsTab();
      default:
        return renderOverviewTab();
    }
  };

  return renderTabContent();
};