import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import {
  Calendar,
  BarChart2,
  PieChart,
  Filter,
  Download,
  FileText,
  TrendingUp,
  X,
  Wallet,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  BarChart,
  PieChart as ChartKitPieChart,
  LineChart,
} from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAccount } from "~/lib";
import {
  getTransactionReports,
  downloadReport,
  generateLocalPDFReport,
  generateLocalCSVReport,
  formatCurrency,
  formatPercentage,
  formatDate,
  testAPIConnectivity,
  type TransactionReport,
} from "~/lib";
import { getCategoryColor, getColorByIndex } from "~/lib";
// import { sharePDF } from "~/lib/pdfGenerator";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

const { width: screenWidth } = Dimensions.get("window");

export default function ReportsScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const { selectedAccount, accounts } = useAccount();

  // Set default date range to today for both dates
  const getDefaultDateRange = () => {
    const today = new Date();
    return {
      startDate: today,
      endDate: today,
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [pendingDateRange, setPendingDateRange] = useState(
    getDefaultDateRange()
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">(
    "start"
  );
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Report data states
  const [transactionData, setTransactionData] =
    useState<TransactionReport | null>(null);

  // Pie chart interaction states
  const [selectedSegment, setSelectedSegment] = useState<{
    name: string;
    value: number;
    color: string;
    percentage: number;
  } | null>(null);
  const [segmentModalVisible, setSegmentModalVisible] = useState(false);

  // Helper functions for data aggregation (moved before useMemo to prevent hoisting issues)
  const aggregateByWeek = (dailyData: any[]) => {
    const weeklyMap = new Map();

    dailyData.forEach((item) => {
      const date = new Date(item.date);
      // Get start of week (Monday)
      const startOfWeek = new Date(date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const weekKey = startOfWeek.toISOString().split("T")[0];

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { date: weekKey, amount: 0 });
      }

      weeklyMap.get(weekKey).amount += item.amount;
    });

    return Array.from(weeklyMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const aggregateByMonth = (dailyData: any[]) => {
    const monthlyMap = new Map();

    dailyData.forEach((item) => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { date: monthKey, amount: 0 });
      }

      monthlyMap.get(monthKey).amount += item.amount;
    });

    return Array.from(monthlyMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Memoized data processing functions
  const processedChartData = useMemo(() => {
    if (!transactionData) return null;

    const daysDiff = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let chartData = transactionData.daily_trends;
    let dateFormatter: Intl.DateTimeFormatOptions;
    let chartTitle = t.dailySpendingTrends;

    if (daysDiff <= 14) {
      chartData = transactionData.daily_trends;
      dateFormatter = { month: "short", day: "numeric" };
      chartTitle = t.dailySpendingTrends;
    } else if (daysDiff <= 60) {
      const weeklyData = aggregateByWeek(transactionData.daily_trends);
      chartData = weeklyData;
      dateFormatter = { month: "short", day: "numeric" };
      chartTitle = t.weeklySpendingTrends;
    } else {
      const monthlyData = aggregateByMonth(transactionData.daily_trends);
      chartData = monthlyData;
      dateFormatter = { month: "short", year: "2-digit" };
      chartTitle = t.monthlySpendingTrends;
    }

    // Limit chart data for better readability (max 30 data points)
    const maxDataPoints = 30;
    let displayData = chartData;
    let showingLimited = false;

    if (chartData.length > maxDataPoints) {
      displayData = chartData.slice(-maxDataPoints);
      showingLimited = true;
    }

    return {
      chartData,
      displayData,
      dateFormatter,
      chartTitle,
      showingLimited,
      maxDataPoints,
    };
  }, [transactionData, dateRange, t]);

  // Memoized pie chart data
  const pieChartData = useMemo(() => {
    if (!transactionData) return [];

    return Object.entries(transactionData.category_breakdown).map(
      ([category, data]) => ({
        name: category,
        population: Math.abs(data.amount),
        color: getCategoryColor(category),
        legendFontColor: "#64748b",
        legendFontSize: 12,
      })
    );
  }, [transactionData]);

  // Memoized bar chart data
  const barChartData = useMemo(() => {
    if (!processedChartData) return null;

    return {
      labels: processedChartData.displayData.map((item) =>
        new Date(item.date).toLocaleDateString(
          "en-US",
          processedChartData.dateFormatter
        )
      ),
      datasets: [
        {
          data: processedChartData.displayData.map((item) =>
            Math.abs(item.amount)
          ),
          colors: processedChartData.displayData.map(
            (_, index) => () => getColorByIndex(index)
          ),
        },
      ],
    };
  }, [processedChartData]);

  const fetchTransactionReports = useCallback(async () => {
    if (!selectedAccount) {
      console.log("No selected account, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      console.log(
        "Fetching transaction reports for account:",
        selectedAccount?.id,
        "Date range:",
        dateRange.startDate.toISOString().split("T")[0],
        "to",
        dateRange.endDate.toISOString().split("T")[0]
      );

      const data = await getTransactionReports(
        selectedAccount?.id,
        dateRange.startDate.toISOString().split("T")[0],
        dateRange.endDate.toISOString().split("T")[0]
      );

      console.log("Transaction reports data received:", data);
      setTransactionData(data);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error fetching transaction reports:", error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace("{errorMessage}", errorMessage)
      );
      setTransactionData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, dateRange.startDate, dateRange.endDate]);

  // Optimized initial data loading - only test API once per session
  useEffect(() => {
    if (selectedAccount && isInitialLoad) {
      console.log("Loading initial data with default dates...");
      fetchTransactionReports();
    }
  }, [selectedAccount, isInitialLoad, fetchTransactionReports]);

  // Refresh transaction data only when date range changes (triggered by submit)
  useEffect(() => {
    if (selectedAccount && dateRange && !isInitialLoad) {
      console.log("Date range changed via submit, refreshing data...");
      fetchTransactionReports();
    }
  }, [dateRange, selectedAccount, fetchTransactionReports, isInitialLoad]);

  const handleDownload = async (format: "csv" | "pdf") => {
    try {
      setLoading(true);
      const startDate = dateRange.startDate.toISOString().split("T")[0];
      const endDate = dateRange.endDate.toISOString().split("T")[0];

      if (!transactionData) {
        Alert.alert(t.error, t.noDataForReport);
        return;
      }

      if (format === "pdf") {
        // Generate PDF locally
        console.log("Generating PDF report...");
        const filePath = await generateLocalPDFReport(
          "transactions",
          transactionData,
          startDate && endDate ? { startDate, endDate } : undefined
        );

        console.log("PDF generated at:", filePath);

        Alert.alert(t.pdfGeneratedSuccessfully, t.reportSavedToDevice, [
          {
            text: t.share,
            onPress: async () => {
              try {
                const { sharePDF } = await import(
                  "~/lib/generators/pdfGenerator"
                );
                await sharePDF(filePath);
              } catch (error) {
                console.error("Error sharing PDF:", error);
                Alert.alert(t.error, t.failedToShare);
              }
            },
          },
          {
            text: t.openFileManager,
            onPress: () => {
              Alert.alert(t.fileLocation, t.pdfSavedToDocuments, [
                { text: t.ok },
              ]);
            },
          },
          {
            text: t.done,
            style: "cancel",
          },
        ]);
      } else {
        // Generate CSV locally
        console.log("Generating CSV report...");
        const filePath = await generateLocalCSVReport(
          "transactions",
          transactionData,
          startDate && endDate ? { startDate, endDate } : undefined
        );

        console.log("CSV generated at:", filePath);

        Alert.alert(t.csvGeneratedSuccessfully, t.reportSavedToDevice, [
          {
            text: t.share,
            onPress: async () => {
              try {
                const { shareCSV } = await import(
                  "~/lib/generators/csvGenerator"
                );
                await shareCSV(filePath);
              } catch (error) {
                console.error("Error sharing CSV:", error);
                Alert.alert(t.error, t.failedToShare);
              }
            },
          },
          {
            text: t.openFileManager,
            onPress: () => {
              Alert.alert(t.fileLocation, t.csvSavedToDocuments, [
                { text: t.ok },
              ]);
            },
          },
          {
            text: t.done,
            style: "cancel",
          },
        ]);
      }
    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()} report:`, error);
      Alert.alert(
        t.error,
        t.errorGeneratingReport.replace("{format}", format.toUpperCase())
      );
    } finally {
      setLoading(false);
    }
  };

  // Date picker callbacks
  const onDismiss = useCallback(() => setDatePickerVisible(false), []);

  const onDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setDatePickerVisible(false);
      }

      if (selectedDate) {
        if (datePickerMode === "start") {
          setPendingDateRange((prev) => ({ ...prev, startDate: selectedDate }));
        } else {
          setPendingDateRange((prev) => ({ ...prev, endDate: selectedDate }));
        }

        console.log("Date selected, waiting for submit to apply changes");
      }
    },
    [datePickerMode]
  );

  const confirmIOSDate = useCallback(() => {
    setDatePickerVisible(false);
    console.log("iOS date confirmed, waiting for submit to apply changes");
  }, []);

  // Function to apply pending date changes and refresh data
  const handleSubmitDateRange = useCallback(() => {
    console.log("Applying date range changes and refreshing data...");
    setDateRange(pendingDateRange);
  }, [pendingDateRange]);

  const openDatePicker = useCallback((mode: "start" | "end") => {
    setDatePickerMode(mode);
    setDatePickerVisible(true);
  }, []);

  // Function to handle pie chart segment selection
  const handleSegmentPress = (segment: any) => {
    const total = Object.values(
      transactionData?.category_breakdown || {}
    ).reduce((sum: number, item: any) => sum + Math.abs(item.amount), 0);
    const percentage =
      total > 0 ? (Math.abs(segment.population) / total) * 100 : 0;

    setSelectedSegment({
      name: segment.name,
      value: segment.population,
      color: segment.color,
      percentage: percentage,
    });
    setSegmentModalVisible(true);
  };

  const renderTransactionTab = () => {
    if (!selectedAccount) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <Wallet size={48} color={theme.textMuted} />
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "600",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            {t.noAccountSelected}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {t.pleaseSelectAccountToViewReports}
          </Text>
        </View>
      );
    }

    if (!transactionData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            {t.loadingTransactionData.replace(
              "{accountName}",
              selectedAccount.name
            )}
          </Text>
        </View>
      );
    }

    if (!processedChartData || !barChartData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <Text style={{ color: theme.textSecondary }}>
            {t.processingChartData}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView className="flex-1">
        {/* Summary Cards */}
        <View className="mb-4">
          {/* First Row - Net Amount */}
          <View className="flex-row justify-between mb-3">
            <View
              style={{
                flex: 1,
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 12,
                marginRight: 8,
                shadowColor: theme.border,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {t.netAmount}
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color:
                    transactionData.summary.total_amount >= 0
                      ? "#059669"
                      : "#dc2626",
                }}
              >
                {formatCurrency(transactionData.summary.total_amount)}
              </Text>
              <Text
                style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}
              >
                {t.incomeExpenses}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 12,
                marginLeft: 8,
                shadowColor: theme.border,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text
                style={{ color: "#8b5cf6", fontSize: 14, fontWeight: "500" }}
              >
                {t.transactions}
              </Text>
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#7c3aed" }}
              >
                {transactionData.summary.total_transactions}
              </Text>
            </View>
          </View>

          {/* Second Row - Income and Expenses */}
          <View className="flex-row justify-between">
            <View
              style={{
                flex: 1,
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 12,
                marginRight: 8,
                shadowColor: theme.border,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text
                style={{ color: "#059669", fontSize: 14, fontWeight: "500" }}
              >
                {t.income}
              </Text>
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "#047857" }}
              >
                +{formatCurrency(transactionData.summary.total_income)}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 12,
                marginLeft: 8,
                shadowColor: theme.border,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text
                style={{ color: "#dc2626", fontSize: 14, fontWeight: "500" }}
              >
                {t.expenses}
              </Text>
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "#b91c1c" }}
              >
                -{formatCurrency(transactionData.summary.total_expenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown Pie Chart */}
        <View
          style={{
            marginBottom: 24,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            shadowColor: theme.border,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}
            >
              {t.spendingByCategory}
            </Text>
            <PieChart size={20} color="#8b5cf6" />
          </View>
          {pieChartData.length > 0 ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  // Show general chart info when tapping the chart area
                  const total = pieChartData.reduce(
                    (sum, item) => sum + item.population,
                    0
                  );
                  setSelectedSegment({
                    name: t.allCategories,
                    value: total,
                    color: "#8b5cf6",
                    percentage: 100,
                  });
                  setSegmentModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 0,
                  }}
                >
                  <ChartKitPieChart
                    data={pieChartData}
                    width={screenWidth - 80}
                    height={220}
                    chartConfig={{
                      backgroundColor: theme.cardBackground,
                      backgroundGradientFrom: theme.cardBackground,
                      backgroundGradientTo: theme.cardBackground,
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="80"
                    absolute
                    hasLegend={false}
                    center={[0, 0]}
                    style={{
                      alignSelf: "center",
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                  />
                </View>
              </TouchableOpacity>

              {/* Interactive Legend */}
              <View className="mt-4">
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 14,
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  {t.tapCategoryForDetails}
                </Text>
                <View className="flex-row flex-wrap">
                  {pieChartData.map((segment, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSegmentPress(segment)}
                      className="flex-row items-center mr-4 mb-2 p-2 rounded-lg"
                      style={{
                        backgroundColor: theme.background,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: segment.color }}
                      />
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 14,
                          fontWeight: "500",
                        }}
                      >
                        {segment.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <Text
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                paddingVertical: 32,
              }}
            >
              {t.noDataAvailable}
            </Text>
          )}
        </View>

        {/* Daily Trends Bar Chart */}
        <View
          style={{
            marginBottom: 24,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            shadowColor: theme.border,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}
            >
              {processedChartData.chartTitle}
            </Text>
            <BarChart2 size={20} color="#6366f1" />
          </View>
          {barChartData.datasets[0].data.length > 0 ? (
            <BarChart
              data={barChartData}
              width={screenWidth - 48}
              height={220}
              yAxisLabel="$"
              chartConfig={{
                backgroundColor: theme.cardBackground,
                backgroundGradientFrom: theme.cardBackground,
                backgroundGradientTo: theme.cardBackground,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                style: { borderRadius: 16 },
                barPercentage: 0.7,
                fillShadowGradient: "#8b5cf6",
                fillShadowGradientOpacity: 0.3,
                propsForBackgroundLines: {
                  strokeDasharray: "5,5",
                  stroke: theme.border,
                  strokeWidth: 1,
                },
                propsForLabels: {
                  fontSize: 12,
                  fontWeight: "500",
                },
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          ) : (
            <Text
              style={{
                color: theme.text,
                textAlign: "center",
                paddingVertical: 32,
              }}
            >
              {t.noTrendDataAvailable}
            </Text>
          )}

          {processedChartData.showingLimited && (
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {t.showingMostRecent
                .replace("{max}", processedChartData.maxDataPoints.toString())
                .replace(
                  "{total}",
                  processedChartData.chartData.length.toString()
                )}
            </Text>
          )}
        </View>

        {/* Category Breakdown Table */}
        <View
          style={{
            marginBottom: 24,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 16,
            }}
          >
            {t.categoryBreakdown}
          </Text>
          {Object.entries(transactionData.category_breakdown).map(
            ([category, data], index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "500" }}>
                    {category}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                    {data.count} {t.transactionsCount}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: theme.text, fontWeight: "bold" }}>
                    {formatCurrency(data.amount)}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                    {formatPercentage(data.percentage)}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View className="flex-1">
        {/* Header */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text
                style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}
              >
                {t.transactionReports}
              </Text>
              {selectedAccount && (
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  {t.showingDataFor} {selectedAccount.name}
                </Text>
              )}
              {!selectedAccount && (
                <Text style={{ color: "#d97706", fontSize: 14, marginTop: 4 }}>
                  {t.pleaseSelectAccountWarning}
                </Text>
              )}
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                style={{
                  backgroundColor: "#3b82f6",
                  padding: 8,
                  borderRadius: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={() => handleDownload("csv")}
                disabled={loading}
              >
                <Download size={18} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#10b981",
                  padding: 8,
                  borderRadius: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={() => handleDownload("pdf")}
                disabled={loading}
              >
                <Download size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Range Picker */}
          <View className="gap-2">
            <View className="flex-row justify-between items-center gap-2">
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.background,
                  padding: 12,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => openDatePicker("start")}
                disabled={loading}
              >
                <Calendar size={14} color="#3b82f6" />
                <Text
                  style={{
                    marginLeft: 8,
                    color: "#1d4ed8",
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  {t.from}:{" "}
                  {formatDate(pendingDateRange.startDate.toISOString())}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.background,
                  padding: 12,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => openDatePicker("end")}
                disabled={loading}
              >
                <Calendar size={14} color="#8b5cf6" />
                <Text
                  style={{
                    marginLeft: 8,
                    color: "#7c3aed",
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  {t.to}: {formatDate(pendingDateRange.endDate.toISOString())}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#10b981",
                padding: 12,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.6 : 1,
              }}
              onPress={handleSubmitDateRange}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Filter size={16} color="white" />
              )}
              <Text
                style={{ marginLeft: 8, color: "white", fontWeight: "600" }}
              >
                {loading ? t.loading : t.applyDateRange}
              </Text>
            </TouchableOpacity>

            {/* Current active date range indicator */}
            <View
              style={{
                backgroundColor: theme.background,
                padding: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                {t.showingData} {formatDate(dateRange.startDate.toISOString())}{" "}
                - {formatDate(dateRange.endDate.toISOString())}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={{ flex: 1, backgroundColor: "transparent", padding: 16 }}>
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{ marginTop: 16, color: theme.textSecondary }}>
                {t.loadingReports}
              </Text>
            </View>
          ) : (
            renderTransactionTab()
          )}
        </View>

        {/* Date Picker */}
        {datePickerVisible && (
          <>
            {Platform.OS === "ios" ? (
              <Modal
                transparent={true}
                animationType="slide"
                visible={datePickerVisible}
                onRequestClose={onDismiss}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderTopLeftRadius: 24,
                      borderTopRightRadius: 24,
                      padding: 20,
                    }}
                  >
                    <View className="flex-row justify-between items-center mb-4">
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 18,
                          fontWeight: "bold",
                        }}
                      >
                        {datePickerMode === "start"
                          ? t.selectStartDate
                          : t.selectEndDate}
                      </Text>
                      <TouchableOpacity onPress={onDismiss}>
                        <X size={24} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <DateTimePicker
                      value={
                        datePickerMode === "start"
                          ? pendingDateRange.startDate
                          : pendingDateRange.endDate
                      }
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      maximumDate={
                        datePickerMode === "start"
                          ? pendingDateRange.endDate
                          : new Date()
                      }
                      minimumDate={
                        datePickerMode === "end"
                          ? pendingDateRange.startDate
                          : new Date(2020, 0, 1)
                      }
                      themeVariant={theme.isDarkColorScheme ? "dark" : "light"}
                    />

                    <TouchableOpacity
                      style={{
                        backgroundColor: "#3b82f6",
                        padding: 16,
                        borderRadius: 12,
                        marginTop: 16,
                      }}
                      onPress={confirmIOSDate}
                    >
                      <Text
                        style={{
                          color: "white",
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {t.confirm}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={
                  datePickerMode === "start"
                    ? pendingDateRange.startDate
                    : pendingDateRange.endDate
                }
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={
                  datePickerMode === "start"
                    ? pendingDateRange.endDate
                    : new Date()
                }
                minimumDate={
                  datePickerMode === "end"
                    ? pendingDateRange.startDate
                    : new Date(2020, 0, 1)
                }
              />
            )}
          </>
        )}

        {/* Segment Details Modal */}
        {selectedSegment && (
          <Modal
            transparent={true}
            animationType="fade"
            visible={segmentModalVisible}
            onRequestClose={() => setSegmentModalVisible(false)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
              }}
            >
              <View
                style={{
                  backgroundColor: theme.cardBackground,
                  borderRadius: 16,
                  padding: 24,
                  marginHorizontal: 32,
                  minWidth: 280,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                {/* Header with category color */}
                <View className="flex-row items-center mb-4">
                  <View
                    className="w-6 h-6 rounded-full mr-3"
                    style={{ backgroundColor: selectedSegment.color }}
                  />
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 20,
                      fontWeight: "bold",
                      flex: 1,
                    }}
                  >
                    {selectedSegment.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSegmentModalVisible(false)}
                    className="p-1"
                  >
                    <X size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Amount and percentage */}
                <View className="mb-4">
                  <View
                    style={{
                      backgroundColor: theme.background,
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {t.amount}
                    </Text>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 24,
                        fontWeight: "bold",
                      }}
                    >
                      {formatCurrency(Math.abs(selectedSegment.value))}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: theme.background,
                      padding: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {t.percentageOfTotal}
                    </Text>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "600",
                        color: selectedSegment.color,
                      }}
                    >
                      {selectedSegment.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                {/* Transaction count if available */}
                {selectedSegment.name !== t.allCategories &&
                  transactionData?.category_breakdown[selectedSegment.name] && (
                    <View
                      style={{
                        backgroundColor: theme.background,
                        padding: 16,
                        borderRadius: 8,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      <Text
                        style={{
                          color: "#1d4ed8",
                          fontSize: 14,
                          marginBottom: 4,
                        }}
                      >
                        {t.transactions}
                      </Text>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "600",
                          color: "#1e40af",
                        }}
                      >
                        {
                          transactionData.category_breakdown[
                            selectedSegment.name
                          ].count
                        }{" "}
                        {t.transactionsCount}
                      </Text>
                    </View>
                  )}

                {/* Close button */}
                <TouchableOpacity
                  onPress={() => setSegmentModalVisible(false)}
                  style={{
                    backgroundColor: "#8b5cf6",
                    padding: 12,
                    borderRadius: 12,
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    {t.close}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}
