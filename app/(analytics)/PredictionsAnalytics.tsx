import { View, Text, ActivityIndicator } from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/Feather";
import { useEffect, useState } from "react";
import { fetchPredictionCategories, fetchPredictionOverview, fetchPredictionTrends } from "~/lib/api";

export const PredictionsAnalytics = ({ 
  chartConfig, 
  width, 
  selectedTab
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
        const data = await fetchPredictionOverview();
        setOverviewData(data);
      } else if (selectedTab === "categories") {
        const data = await fetchPredictionCategories();
        setCategoriesData(data);
      } else if (selectedTab === "trends") {
        const data = await fetchPredictionTrends();
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
  }, [selectedTab]);

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
    if (!overviewData || !overviewData.input_category_totals) return null;

    // Convert the object to an array for mapping
    const categoryEntries = Object.entries(overviewData.input_category_totals);

    return (
      <View className="gap-5">
        <View className="flex-row gap-3">
          <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <Text className="text-slate-400 text-sm mb-1">Avg Prediction</Text>
            <Text className="text-white text-2xl font-bold">
              ${overviewData.average_prediction.toFixed(2)}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">
              Monthly: ${overviewData.average_monthly.toFixed(2)}
            </Text>
          </View>

          <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <Text className="text-slate-400 text-sm mb-1">Total Predictions</Text>
            <Text className="text-white text-2xl font-bold">
              {overviewData.total_predictions}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">
              {Object.keys(overviewData.model_distribution).length} models used
            </Text>
          </View>
        </View>

        {overviewData.latest_prediction && (
          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <Text className="text-white text-lg font-bold mb-4">Latest Prediction</Text>
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-300">Predicted Amount</Text>
                <Text className="text-emerald-400 font-bold">
                  ${overviewData.latest_prediction.predicted_amount.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-300">Monthly Equivalent</Text>
                <Text className="text-blue-400 font-bold">
                  ${overviewData.latest_prediction.monthly_equivalent.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-300">Model Used</Text>
                <Text className="text-amber-400 font-bold">
                  {overviewData.latest_prediction.model_used}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Input Categories</Text>
          <PieChart
            data={categoryEntries.map(([name, value], index) => ({
              name,
              population: value,
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
      </View>
    );
  };

  const renderCategoriesTab = () => {
    if (!categoriesData || !categoriesData.categories) return null;

    const totalAmount = categoriesData.categories.reduce((sum, cat) => sum + cat.total_amount, 0);

    return (
      <View className="gap-5">
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Input Categories</Text>
          <PieChart
            data={categoriesData.categories.slice(0, 6).map((cat, index) => ({
              name: cat.category,
              population: cat.total_amount,
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
              const percentage = (category.total_amount / 
                categoriesData.categories.reduce((sum, cat) => sum + cat.total_amount, 0) * 100).toFixed(1);
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
                      <Text className="text-white font-bold">${category.total_amount.toFixed(2)}</Text>
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
    if (!trendsData || !trendsData.trends) return null;

    return (
      <View className="gap-5">
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Prediction Trends</Text>
          <LineChart
            data={{
              labels: trendsData.trends.map((_, i) => `P${i+1}`),
              datasets: [{
                data: trendsData.trends.map(t => t.predicted_amount),
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

        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Prediction Stats</Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-slate-400 text-sm">Min</Text>
              <Text className="text-white font-bold">${trendsData.min_amount.toFixed(2)}</Text>
            </View>
            <View className="items-center">
              <Text className="text-slate-400 text-sm">Average</Text>
              <Text className="text-white font-bold">${trendsData.average_amount.toFixed(2)}</Text>
            </View>
            <View className="items-center">
              <Text className="text-slate-400 text-sm">Max</Text>
              <Text className="text-white font-bold">${trendsData.max_amount.toFixed(2)}</Text>
            </View>
          </View>
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