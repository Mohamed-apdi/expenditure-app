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
import { useAccount } from "~/lib/AccountContext";
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
} from "~/lib/api";
import { getCategoryColor, getColorByIndex } from "~/lib/chartColors";
import { sharePDF } from "~/lib/pdfGenerator";

const { width: screenWidth } = Dimensions.get("window");

export default function ReportsScreen() {
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
  const [pendingDateRange, setPendingDateRange] = useState(getDefaultDateRange());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">("start");
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Report data states
  const [transactionData, setTransactionData] = useState<TransactionReport | null>(null);
  
  // Pie chart interaction states
  const [selectedSegment, setSelectedSegment] = useState<{
    name: string;
    value: number;
    color: string;
    percentage: number;
  } | null>(null);
  const [segmentModalVisible, setSegmentModalVisible] = useState(false);

  // Memoized data processing functions
  const processedChartData = useMemo(() => {
    if (!transactionData) return null;

    const daysDiff = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    let chartData = transactionData.daily_trends;
    let dateFormatter: Intl.DateTimeFormatOptions;
    let chartTitle = "Daily Spending Trends";
    
    if (daysDiff <= 14) {
      chartData = transactionData.daily_trends;
      dateFormatter = { month: "short", day: "numeric" };
      chartTitle = "Daily Spending Trends";
    } else if (daysDiff <= 60) {
      const weeklyData = aggregateByWeek(transactionData.daily_trends);
      chartData = weeklyData;
      dateFormatter = { month: "short", day: "numeric" };
      chartTitle = "Weekly Spending Trends";
    } else {
      const monthlyData = aggregateByMonth(transactionData.daily_trends);
      chartData = monthlyData;
      dateFormatter = { month: "short", year: "2-digit" };
      chartTitle = "Monthly Spending Trends";
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
      maxDataPoints
    };
  }, [transactionData, dateRange]);

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
        new Date(item.date).toLocaleDateString("en-US", processedChartData.dateFormatter)
      ),
      datasets: [
        {
          data: processedChartData.displayData.map((item) => Math.abs(item.amount)),
          colors: processedChartData.displayData.map((_, index) => () => getColorByIndex(index)),
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
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert(
        "Error",
        `Failed to fetch transaction reports: ${errorMessage}`
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

  // Helper functions for data aggregation (moved outside component to prevent recreation)
  const aggregateByWeek = (dailyData: any[]) => {
    const weeklyMap = new Map();
    
    dailyData.forEach(item => {
      const date = new Date(item.date);
      // Get start of week (Monday)
      const startOfWeek = new Date(date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const weekKey = startOfWeek.toISOString().split('T')[0];
      
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { date: weekKey, amount: 0 });
      }
      
      weeklyMap.get(weekKey).amount += item.amount;
    });
    
    return Array.from(weeklyMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const aggregateByMonth = (dailyData: any[]) => {
    const monthlyMap = new Map();
    
    dailyData.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { date: monthKey, amount: 0 });
      }
      
      monthlyMap.get(monthKey).amount += item.amount;
    });
    
    return Array.from(monthlyMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const handleDownload = async (format: "csv" | "pdf") => {
    try {
      setLoading(true);
      const startDate = dateRange.startDate.toISOString().split("T")[0];
      const endDate = dateRange.endDate.toISOString().split("T")[0];

      if (!transactionData) {
        Alert.alert("Error", "No data available for report generation");
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

        Alert.alert(
          "PDF Generated Successfully",
          "Your transaction report has been saved to your device. What would you like to do?",
          [
            {
              text: "Share",
              onPress: async () => {
                try {
                  const { sharePDF } = await import("~/lib/pdfGenerator");
                  await sharePDF(filePath);
                } catch (error) {
                  console.error("Error sharing PDF:", error);
                  Alert.alert("Error", "Failed to share PDF. The file has been saved to your device.");
                }
              },
            },
            {
              text: "Open File Manager",
              onPress: () => {
                Alert.alert(
                  "File Location",
                  "Your PDF has been saved to the Documents folder. You can access it through your device's file manager.",
                  [{ text: "OK" }]
                );
              },
            },
            {
              text: "Done",
              style: "cancel",
            },
          ]
        );
      } else {
        // Generate CSV locally
        console.log("Generating CSV report...");
        const filePath = await generateLocalCSVReport(
          "transactions",
          transactionData,
          startDate && endDate ? { startDate, endDate } : undefined
        );

        console.log("CSV generated at:", filePath);

        Alert.alert(
          "CSV Generated Successfully",
          "Your transaction report has been saved to your device. What would you like to do?",
          [
            {
              text: "Share",
              onPress: async () => {
                try {
                  const { shareCSV } = await import("~/lib/csvGenerator");
                  await shareCSV(filePath);
                } catch (error) {
                  console.error("Error sharing CSV:", error);
                  Alert.alert("Error", "Failed to share CSV. The file has been saved to your device.");
                }
              },
            },
            {
              text: "Open File Manager",
              onPress: () => {
                Alert.alert(
                  "File Location",
                  "Your CSV has been saved to the Documents folder. You can access it through your device's file manager.",
                  [{ text: "OK" }]
                );
              },
            },
            {
              text: "Done",
              style: "cancel",
            },
          ]
        );
      }
    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()} report:`, error);
      Alert.alert(
        "Error",
        `Failed to generate ${format.toUpperCase()} report. Please try again.`
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
    const total = Object.values(transactionData?.category_breakdown || {}).reduce(
      (sum: number, item: any) => sum + Math.abs(item.amount), 0
    );
    const percentage = total > 0 ? (Math.abs(segment.population) / total) * 100 : 0;
    
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
          <Wallet size={48} color="#6b7280" />
          <Text className="text-lg font-semibold text-gray-700 mt-4 text-center">
            No Account Selected
          </Text>
          <Text className="text-sm text-gray-500 mt-2 text-center">
            Please select an account to view transaction reports
          </Text>
        </View>
      );
    }

    if (!transactionData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-gray-600 mt-4">
            Loading transaction data for {selectedAccount.name}...
          </Text>
        </View>
      );
    }

    if (!processedChartData || !barChartData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <Text className="text-gray-500">Processing chart data...</Text>
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
              className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl mr-2 shadow-sm"
              style={{ backgroundColor: "#dbeafe" }}
            >
              <Text className="text-blue-600 text-sm font-medium">
                Net Amount
              </Text>
              <Text
                className={`text-2xl font-bold ${transactionData.summary.total_amount >= 0 ? "text-green-700" : "text-red-700"}`}
              >
                {formatCurrency(transactionData.summary.total_amount)}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">
                Income - Expenses
              </Text>
            </View>
            <View
              className="flex-1 bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl ml-2 shadow-sm"
              style={{ backgroundColor: "#ede9fe" }}
            >
              <Text className="text-purple-600 text-sm font-medium">
                Transactions
              </Text>
              <Text className="text-2xl font-bold text-purple-800">
                {transactionData.summary.total_transactions}
              </Text>
            </View>
          </View>

          {/* Second Row - Income and Expenses */}
          <View className="flex-row justify-between">
            <View
              className="flex-1 bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl mr-2 shadow-sm"
              style={{ backgroundColor: "#dcfce7" }}
            >
              <Text className="text-green-600 text-sm font-medium">Income</Text>
              <Text className="text-xl font-bold text-green-800">
                +{formatCurrency(transactionData.summary.total_income)}
              </Text>
            </View>
            <View
              className="flex-1 bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl ml-2 shadow-sm"
              style={{ backgroundColor: "#fee2e2" }}
            >
              <Text className="text-red-600 text-sm font-medium">Expenses</Text>
              <Text className="text-xl font-bold text-red-800">
                -{formatCurrency(transactionData.summary.total_expenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown Pie Chart */}
        <View className="mb-6 bg-white p-4 rounded-xl shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg text-gray-800">
              Spending by Category
            </Text>
            <PieChart size={20} color="#8b5cf6" />
          </View>
          {pieChartData.length > 0 ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  // Show general chart info when tapping the chart area
                  const total = pieChartData.reduce((sum, item) => sum + item.population, 0);
                  setSelectedSegment({
                    name: "All Categories",
                    value: total,
                    color: "#8b5cf6",
                    percentage: 100,
                  });
                  setSegmentModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={{ 
                  width: '100%', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  paddingHorizontal: 0 
                }}>
                  <ChartKitPieChart
                    data={pieChartData}
                    width={screenWidth - 80}
                    height={220}
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#faf5ff",
                      backgroundGradientTo: "#f3e8ff",
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="80"
                    absolute
                    hasLegend={false}
                    center={[0, 0]}
                    style={{ 
                      alignSelf: 'center',
                      marginLeft: 'auto',
                      marginRight: 'auto'
                    }}
                  />
                </View>
              </TouchableOpacity>
              
              {/* Interactive Legend */}
              <View className="mt-4">
                <Text className="text-sm font-semibold text-gray-600 mb-2">
                  Tap a category to see details:
                </Text>
                <View className="flex-row flex-wrap">
                  {pieChartData.map((segment, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSegmentPress(segment)}
                      className="flex-row items-center mr-4 mb-2 p-2 rounded-lg"
                      style={{ 
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: segment.color }}
                      />
                      <Text className="text-sm font-medium text-gray-700">
                        {segment.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <Text className="text-gray-500 text-center py-8">
              No data available
            </Text>
          )}
        </View>

        {/* Daily Trends Bar Chart */}
        <View className="mb-6 bg-white p-4 rounded-xl shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg text-gray-800">
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
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#fef7ff",
                backgroundGradientTo: "#f3e8ff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                style: { borderRadius: 16 },
                barPercentage: 0.7,
                fillShadowGradient: "#8b5cf6",
                fillShadowGradientOpacity: 0.3,
                propsForBackgroundLines: {
                  strokeDasharray: "5,5",
                  stroke: "#e2e8f0",
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
            <Text className="text-gray-500 text-center py-8">
              No trend data available
            </Text>
          )}
          
          {processedChartData.showingLimited && (
            <Text className="text-xs text-gray-400 text-center mt-2">
              Showing most recent {processedChartData.maxDataPoints} data points of {processedChartData.chartData.length} total
            </Text>
          )}
        </View>

        {/* Category Breakdown Table */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <Text className="font-bold text-lg mb-4">Category Breakdown</Text>
          {Object.entries(transactionData.category_breakdown).map(
            ([category, data], index) => (
              <View
                key={index}
                className="flex-row justify-between items-center py-3 border-b border-gray-100"
              >
                <View className="flex-1">
                  <Text className="font-medium">{category}</Text>
                  <Text className="text-gray-500 text-sm">
                    {data.count} transactions
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold">
                    {formatCurrency(data.amount)}
                  </Text>
                  <Text className="text-gray-500 text-sm">
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
    <SafeAreaView
      className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100"
      style={{ backgroundColor: "#f8fafc" }}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-2xl font-bold text-gray-800">
                Transaction Reports
              </Text>
              {selectedAccount && (
                <Text className="text-sm text-gray-500 mt-1">
                  Showing data for: {selectedAccount.name}
                </Text>
              )}
              {!selectedAccount && (
                <Text className="text-sm text-amber-600 mt-1">
                  ⚠️ Please select an account
                </Text>
              )}
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="bg-blue-500 p-2 rounded-lg"
                style={{
                  backgroundColor: "#3b82f6",
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
                className="bg-green-500 p-2 rounded-lg"
                style={{
                  backgroundColor: "#10b981",
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
                className="flex-1 bg-blue-50 p-3 rounded-lg flex-row items-center mr-2"
                onPress={() => openDatePicker("start")}
                style={{ backgroundColor: "#eff6ff" }}
                disabled={loading}
              >
                <Calendar size={14} color="#3b82f6" />
                <Text className="ml-2 text-blue-700 text-sm font-medium">
                  From: {formatDate(pendingDateRange.startDate.toISOString())}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-purple-50 p-3 rounded-lg flex-row items-center"
                onPress={() => openDatePicker("end")}
                style={{ backgroundColor: "#faf5ff" }}
                disabled={loading}
              >
                <Calendar size={14} color="#8b5cf6" />
                <Text className="ml-2 text-purple-700 text-sm font-medium">
                  To: {formatDate(pendingDateRange.endDate.toISOString())}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className="bg-green-500 p-3 rounded-lg flex-row items-center justify-center"
              style={{ 
                backgroundColor: "#10b981",
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
              <Text className="ml-2 text-white font-semibold">
                {loading ? "Loading..." : "Apply Date Range"}
              </Text>
            </TouchableOpacity>

            {/* Current active date range indicator */}
            <View className="bg-gray-50 p-2 rounded-lg">
              <Text className="text-xs text-gray-600 text-center">
                Showing data: {formatDate(dateRange.startDate.toISOString())} - {formatDate(dateRange.endDate.toISOString())}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 bg-transparent p-4">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="mt-4 text-gray-600">Loading reports...</Text>
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
                <View className="flex-1 justify-end bg-black/30">
                  <View className="bg-white rounded-t-3xl p-5">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-lg font-bold text-gray-800">
                        Select {datePickerMode === "start" ? "Start" : "End"}{" "}
                        Date
                      </Text>
                      <TouchableOpacity onPress={onDismiss}>
                        <X size={24} color="#6b7280" />
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
                      themeVariant="light"
                    />

                    <TouchableOpacity
                      className="bg-blue-500 p-4 rounded-xl mt-4"
                      onPress={confirmIOSDate}
                    >
                      <Text className="text-white text-center font-bold">
                        Confirm
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
                  datePickerMode === "start" ? pendingDateRange.endDate : new Date()
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
            <View className="flex-1 justify-center items-center bg-black/50">
              <View 
                className="bg-white rounded-2xl p-6 mx-8 shadow-lg"
                style={{
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
                  <Text className="text-xl font-bold text-gray-800 flex-1">
                    {selectedSegment.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSegmentModalVisible(false)}
                    className="p-1"
                  >
                    <X size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Amount and percentage */}
                <View className="mb-4">
                  <View className="bg-gray-50 p-4 rounded-lg mb-3">
                    <Text className="text-sm text-gray-600 mb-1">Amount</Text>
                    <Text className="text-2xl font-bold text-gray-800">
                      {formatCurrency(Math.abs(selectedSegment.value))}
                    </Text>
                  </View>
                  
                  <View className="bg-gray-50 p-4 rounded-lg">
                    <Text className="text-sm text-gray-600 mb-1">
                      Percentage of Total
                    </Text>
                    <Text className="text-xl font-semibold" style={{ color: selectedSegment.color }}>
                      {selectedSegment.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                {/* Transaction count if available */}
                {selectedSegment.name !== "All Categories" && transactionData?.category_breakdown[selectedSegment.name] && (
                  <View className="bg-blue-50 p-4 rounded-lg mb-4">
                    <Text className="text-sm text-blue-600 mb-1">Transactions</Text>
                    <Text className="text-lg font-semibold text-blue-800">
                      {transactionData.category_breakdown[selectedSegment.name].count} transactions
                    </Text>
                  </View>
                )}

                {/* Close button */}
                <TouchableOpacity
                  onPress={() => setSegmentModalVisible(false)}
                  className="bg-purple-500 p-3 rounded-xl mt-2"
                  style={{ backgroundColor: "#8b5cf6" }}
                >
                  <Text className="text-white text-center font-semibold">
                    Close
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
