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
  StatusBar,
} from "react-native";
import {
  Calendar,
  Filter,
  Wallet,
  X,
  FileText,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  BarChart,
  PieChart as ChartKitPieChart,
} from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAccount } from "~/lib";
import {
  getTransactionReports,
  getAccountReports,
  getBudgetReports,
  getGoalReports,
  getSubscriptionReports,
  downloadReport,
  generateLocalPDFReport,
  generateLocalCSVReport,
  formatCurrency,
  formatPercentage,
  formatDate,
  testAPIConnectivity,
  debugUserData,
  type TransactionReport,
  type AccountReport,
  type BudgetReport,
  type GoalReport,
  type SubscriptionReport,
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

  // Set default date range to last 30 days
  const getDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      startDate: thirtyDaysAgo,
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

  // Tab state
  const [activeTab, setActiveTab] = useState<
    "transactions" | "accounts" | "budgets" | "goals" | "subscriptions"
  >("transactions");

  // Report data states
  const [transactionData, setTransactionData] =
    useState<TransactionReport | null>(null);
  const [accountData, setAccountData] = useState<AccountReport | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetReport | null>(null);
  const [goalData, setGoalData] = useState<GoalReport | null>(null);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionReport | null>(null);


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
      console.log("❌ No selected account, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      const startDateStr = dateRange.startDate.toISOString().split("T")[0];
      const endDateStr = dateRange.endDate.toISOString().split("T")[0];

      console.log("🚀 Fetching transaction reports:");
      console.log("   📋 Account ID:", selectedAccount?.id);
      console.log("   📋 Account Name:", selectedAccount?.name);
      console.log("   📅 Date range:", startDateStr, "to", endDateStr);

      const data = await getTransactionReports(
        selectedAccount?.id,
        startDateStr,
        endDateStr
      );

      console.log("✅ Transaction reports data received:", data);

      // Debug the received data
      if (data) {
        console.log("📊 Data summary:", data.summary);
        console.log("📊 Categories:", Object.keys(data.category_breakdown || {}));
        console.log("📊 Transactions count:", data.transactions?.length || 0);
        console.log("📊 Daily trends count:", data.daily_trends?.length || 0);

        if (data.summary?.total_transactions === 0) {
          console.warn("⚠️ API returned 0 transactions - checking if this is correct");
          console.log("📋 Full API response:", JSON.stringify(data, null, 2));
        }
      } else {
        console.error("❌ No data received from API");
      }

      setTransactionData(data);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("❌ Error fetching transaction reports:", error);
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
  }, [selectedAccount, dateRange.startDate, dateRange.endDate, t]);

  const fetchAccountReports = useCallback(async () => {
    if (!selectedAccount) {
      console.log("No selected account, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching account reports for account:", selectedAccount?.id);

      const data = await getAccountReports(selectedAccount?.id);

      console.log("Account reports data received:", data);
      setAccountData(data);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error fetching account reports:", error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace("{errorMessage}", errorMessage)
      );
      setAccountData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, t]);

  const fetchBudgetReports = useCallback(async () => {
    if (!selectedAccount) {
      console.log("No selected account, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching budget reports for account:", selectedAccount?.id);

      const data = await getBudgetReports(
        dateRange.startDate.toISOString().split("T")[0],
        dateRange.endDate.toISOString().split("T")[0],
        selectedAccount?.id
      );

      console.log("Budget reports data received:", data);
      setBudgetData(data);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error fetching budget reports:", error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace("{errorMessage}", errorMessage)
      );
      setBudgetData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, dateRange.startDate, dateRange.endDate, t]);

  const fetchGoalReports = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching goal reports");

      const data = await getGoalReports();

      console.log("Goal reports data received:", data);
      setGoalData(data);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error fetching goal reports:", error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace("{errorMessage}", errorMessage)
      );
      setGoalData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchSubscriptionReports = useCallback(async () => {
    if (!selectedAccount) {
      console.log("No selected account, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching subscription reports for account:", selectedAccount?.id);

      const data = await getSubscriptionReports(selectedAccount?.id);

      console.log("Subscription reports data received:", data);
      setSubscriptionData(data);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error fetching subscription reports:", error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace("{errorMessage}", errorMessage)
      );
      setSubscriptionData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, t]);

  // Unified fetch function based on active tab
  const fetchReports = useCallback(() => {
    switch (activeTab) {
      case "transactions":
        fetchTransactionReports();
        break;
      case "accounts":
        fetchAccountReports();
        break;
      case "budgets":
        fetchBudgetReports();
        break;
      case "goals":
        fetchGoalReports();
        break;
      case "subscriptions":
        fetchSubscriptionReports();
        break;
    }
  }, [
    activeTab,
    fetchTransactionReports,
    fetchAccountReports,
    fetchBudgetReports,
    fetchGoalReports,
    fetchSubscriptionReports,
  ]);

  // Fetch data when tab changes or account changes
  useEffect(() => {
    if (selectedAccount || activeTab === "goals") {
      console.log("Fetching data for tab:", activeTab);
      fetchReports();
    }
  }, [activeTab, selectedAccount, fetchReports]);

  // Refresh data when date range changes (triggered by submit) for date-dependent tabs
  useEffect(() => {
    if (
      (selectedAccount || activeTab === "goals") &&
      !isInitialLoad &&
      (activeTab === "transactions" || activeTab === "budgets")
    ) {
      console.log("Date range changed via submit, refreshing data...");
      fetchReports();
    }
  }, [dateRange, selectedAccount, activeTab, fetchReports, isInitialLoad]);

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

  // Debug function to check user data
  const debugUserDataFunction = useCallback(async () => {
    try {
      const token = await import("expo-secure-store").then(m => m.getItemAsync("supabase_session"));
      if (!token) {
        Alert.alert("Debug Error", "No authentication token found");
        return;
      }

      const sessionData = JSON.parse(token);
      const userId = sessionData.user?.id;

      if (!userId) {
        Alert.alert("Debug Error", "No user ID found in token");
        return;
      }

      console.log("🔍 Debug: Checking user data for user:", userId);
      const debugData = await debugUserData(userId);

      Alert.alert(
        "Debug Data",
        `User: ${userId}\nExpenses: ${debugData.total_expenses}\nAccounts: ${debugData.total_accounts}\nAccount IDs: ${debugData.account_ids.join(", ")}`,
        [
          { text: "OK" },
          {
            text: "Log Details",
            onPress: () => console.log("🔍 Full debug data:", debugData)
          }
        ]
      );
    } catch (error) {
      console.error("Debug error:", error);
      Alert.alert("Debug Error", error instanceof Error ? error.message : "Unknown error");
    }
  }, []);

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

    // Check if there's no data for the selected period
    if (transactionData.summary.total_transactions === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <FileText size={48} color={theme.textMuted} />
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "600",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            No Transactions Found
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
              paddingHorizontal: 32,
            }}
          >
            There are no transactions for the selected date range. Try expanding your date range or add some transactions.
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
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.income}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#059669", marginTop: 2 }}>
                {formatCurrency(transactionData.summary.total_income)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.expenses}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#dc2626", marginTop: 2 }}>
                {formatCurrency(transactionData.summary.total_expenses)}
              </Text>
            </View>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              paddingTop: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: "500" }}>
              {t.netAmount}
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color:
                  transactionData.summary.total_amount >= 0
                    ? "#059669"
                    : "#dc2626",
              }}
            >
              {formatCurrency(transactionData.summary.total_amount)}
            </Text>
          </View>
        </View>

        {/* Category Breakdown Pie Chart */}
        <View
          style={{
            marginBottom: 16,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            {t.spendingByCategory}
          </Text>
          {pieChartData.length > 0 ? (
            <>
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <ChartKitPieChart
                  data={pieChartData}
                  width={screenWidth - 64}
                  height={200}
                  chartConfig={{
                    backgroundColor: theme.cardBackground,
                    backgroundGradientFrom: theme.cardBackground,
                    backgroundGradientTo: theme.cardBackground,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  hasLegend={true}
                  center={[10, 0]}
                />
              </View>
            </>
          ) : (
            <Text
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                paddingVertical: 24,
              }}
            >
              {t.noDataAvailable}
            </Text>
          )}
        </View>

        {/* Daily Trends Bar Chart */}
        <View
          style={{
            marginBottom: 16,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            {processedChartData.chartTitle}
          </Text>
          {barChartData.datasets[0].data.length > 0 ? (
            <BarChart
              data={barChartData}
              width={screenWidth - 64}
              height={200}
              yAxisLabel="$"
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: theme.cardBackground,
                backgroundGradientFrom: theme.cardBackground,
                backgroundGradientTo: theme.cardBackground,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                style: { borderRadius: 12 },
                barPercentage: 0.7,
                propsForBackgroundLines: {
                  stroke: theme.border,
                  strokeWidth: 1,
                },
              }}
              style={{ marginVertical: 8 }}
            />
          ) : (
            <Text
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                paddingVertical: 24,
              }}
            >
              {t.noTrendDataAvailable}
            </Text>
          )}
        </View>

        {/* Category Breakdown Table */}
        <View
          style={{
            marginBottom: 16,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
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
                  paddingVertical: 10,
                  borderBottomWidth:
                    index < Object.keys(transactionData.category_breakdown).length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "500", fontSize: 14 }}>
                    {category}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {data.count} {t.transactionsCount}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: theme.text, fontWeight: "600", fontSize: 15 }}>
                    {formatCurrency(data.amount)}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
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

  const renderAccountsTab = () => {
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
        </View>
      );
    }

    if (!accountData) {
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

    // Check if there's no account data
    if (accountData.accounts.length === 0) {
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
            No Account Data
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
              paddingHorizontal: 32,
            }}
          >
            Unable to load account information. Please try again later.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView className="flex-1">
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            Total Balance
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: theme.text,
              marginTop: 4,
            }}
          >
            {formatCurrency(accountData.summary.total_balance)}
          </Text>
        </View>

        {/* Account Details */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Account Details
          </Text>
          {accountData.accounts.map((account, index) => (
            <View
              key={account.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth:
                  index < accountData.accounts.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}
            >
              <View className="flex-row justify-between items-center">
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "500", fontSize: 14 }}>
                    {account.name}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {account.type} • {account.transaction_count} transactions
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  {formatCurrency(account.balance)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderBudgetsTab = () => {
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
        </View>
      );
    }

    if (!budgetData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            Loading budget data...
          </Text>
        </View>
      );
    }

    // Check if there's no budget data
    if (budgetData.budget_comparison.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <FileText size={48} color={theme.textMuted} />
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "600",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            No Budgets Found
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
              paddingHorizontal: 32,
            }}
          >
            You haven't set up any budgets yet. Create budgets to track your spending.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView className="flex-1">
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <View className="flex-row justify-between items-center">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                Total Budget
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: theme.text, marginTop: 2 }}>
                {formatCurrency(budgetData.summary.total_budget)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                Total Spent
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#dc2626", marginTop: 2 }}>
                {formatCurrency(budgetData.summary.total_spent)}
              </Text>
            </View>
          </View>
        </View>

        {/* Budget Comparison */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Budget vs Actual
          </Text>
          {budgetData.budget_comparison.map((item, index) => (
            <View
              key={index}
              style={{
                paddingVertical: 10,
                borderBottomWidth:
                  index < budgetData.budget_comparison.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text style={{ color: theme.text, fontWeight: "500", fontSize: 14 }}>
                  {item.category}
                </Text>
                <Text
                  style={{
                    color:
                      item.status === "over"
                        ? "#dc2626"
                        : item.status === "near"
                          ? "#f59e0b"
                          : "#059669",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {formatPercentage(item.percentage)}
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: theme.background,
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.min(item.percentage, 100)}%`,
                    backgroundColor:
                      item.status === "over"
                        ? "#dc2626"
                        : item.status === "near"
                          ? "#f59e0b"
                          : "#059669",
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                </Text>
                <Text
                  style={{
                    color: item.remaining >= 0 ? "#059669" : "#dc2626",
                    fontSize: 11,
                  }}
                >
                  {formatCurrency(Math.abs(item.remaining))}{" "}
                  {item.remaining >= 0 ? "left" : "over"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderGoalsTab = () => {
    if (!goalData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            Loading goal data...
          </Text>
        </View>
      );
    }

    // Check if there's no goal data
    if (goalData.goals.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <FileText size={48} color={theme.textMuted} />
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "600",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            No Goals Set
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
              paddingHorizontal: 32,
            }}
          >
            You haven't created any financial goals yet. Set goals to track your savings progress.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView className="flex-1">
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <View className="flex-row justify-between items-center">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                Total Target
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: theme.text, marginTop: 2 }}>
                {formatCurrency(goalData.summary.total_target)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                Total Saved
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#059669", marginTop: 2 }}>
                {formatCurrency(goalData.summary.total_saved)}
              </Text>
            </View>
          </View>
        </View>

        {/* Goals List */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Your Goals
          </Text>
          {goalData.goals.map((goal, index) => (
            <View
              key={goal.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth: index < goalData.goals.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text style={{ color: theme.text, fontWeight: "500", fontSize: 14 }}>
                  {goal.name}
                </Text>
                <Text
                  style={{
                    color:
                      goal.status === "completed"
                        ? "#059669"
                        : goal.status === "on_track"
                          ? "#3b82f6"
                          : "#f59e0b",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {formatPercentage(goal.percentage)}
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: theme.background,
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.min(goal.percentage, 100)}%`,
                    backgroundColor:
                      goal.status === "completed"
                        ? "#059669"
                        : goal.status === "on_track"
                          ? "#3b82f6"
                          : "#f59e0b",
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                </Text>
                {goal.days_remaining !== null && (
                  <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                    {goal.days_remaining} days left
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderSubscriptionsTab = () => {
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
        </View>
      );
    }

    if (!subscriptionData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            Loading subscription data...
          </Text>
        </View>
      );
    }

    // Check if there's no subscription data
    if (subscriptionData.subscriptions.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <FileText size={48} color={theme.textMuted} />
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "600",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            No Subscriptions Found
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
              paddingHorizontal: 32,
            }}
          >
            You don't have any active subscriptions. Add subscriptions to track recurring costs.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView className="flex-1">
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <View className="flex-row justify-between items-center">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                Monthly Cost
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: theme.text, marginTop: 2 }}>
                {formatCurrency(subscriptionData.summary.monthly_cost)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                Active Count
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: theme.primary, marginTop: 2 }}>
                {subscriptionData.summary.active_subscriptions}
              </Text>
            </View>
          </View>
        </View>

        {/* Subscriptions List */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Active Subscriptions
          </Text>
          {subscriptionData.subscriptions.map((sub, index) => (
            <View
              key={sub.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth:
                  index < subscriptionData.subscriptions.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}
            >
              <View className="flex-row justify-between items-center">
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "500", fontSize: 14 }}>
                    {sub.name}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {sub.billing_cycle} • {sub.category}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: "600",
                      fontSize: 15,
                    }}
                  >
                    {formatCurrency(sub.cost)}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                    {formatCurrency(sub.monthly_equivalent)}/mo
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "transactions":
        return renderTransactionTab();
      case "accounts":
        return renderAccountsTab();
      case "budgets":
        return renderBudgetsTab();
      case "goals":
        return renderGoalsTab();
      case "subscriptions":
        return renderSubscriptionsTab();
      default:
        return renderTransactionTab();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
        translucent={false}
      />
      <View className="flex-1">
        {/* Header */}
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View className="flex-row justify-between items-center">
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: "600" }}>
              {t.transactionReports}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
              onPress={debugUserDataFunction}
            >
              <Text style={{ color: "white", fontSize: 12, fontWeight: "500" }}>
                Debug
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Range Picker */}
          <View className="flex-row gap-2 mt-3">
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.background,
                padding: 10,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => openDatePicker("start")}
              disabled={loading}
            >
              <Calendar size={16} color={theme.primary} />
              <Text
                style={{
                  marginLeft: 6,
                  color: theme.text,
                  fontSize: 13,
                  flex: 1,
                }}
              >
                {formatDate(pendingDateRange.startDate.toISOString())}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.background,
                padding: 10,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => openDatePicker("end")}
              disabled={loading}
            >
              <Calendar size={16} color={theme.primary} />
              <Text
                style={{
                  marginLeft: 6,
                  color: theme.text,
                  fontSize: 13,
                  flex: 1,
                }}
              >
                {formatDate(pendingDateRange.endDate.toISOString())}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                padding: 10,
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={handleSubmitDateRange}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Filter size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View
          style={{
            backgroundColor: theme.background,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === "transactions" ? theme.primary : theme.background,
                }}
                onPress={() => setActiveTab("transactions")}
              >
                <Text
                  style={{
                    color: activeTab === "transactions" ? "white" : theme.text,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                >
                  Transactions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === "subscriptions" ? theme.primary : theme.background,
                }}
                onPress={() => setActiveTab("subscriptions")}
              >
                <Text
                  style={{
                    color: activeTab === "subscriptions" ? "white" : theme.text,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                >
                  Subscriptions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === "budgets" ? theme.primary : theme.background,
                }}
                onPress={() => setActiveTab("budgets")}
              >
                <Text
                  style={{
                    color: activeTab === "budgets" ? "white" : theme.text,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                >
                  Budgets
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === "goals" ? theme.primary : theme.background,
                }}
                onPress={() => setActiveTab("goals")}
              >
                <Text
                  style={{
                    color: activeTab === "goals" ? "white" : theme.text,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                >
                  Goals
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === "accounts" ? theme.primary : theme.background,
                }}
                onPress={() => setActiveTab("accounts")}
              >
                <Text
                  style={{
                    color: activeTab === "accounts" ? "white" : theme.text,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                >
                  Accounts
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
            renderActiveTab()
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

      </View>
    </SafeAreaView>
  );
}
