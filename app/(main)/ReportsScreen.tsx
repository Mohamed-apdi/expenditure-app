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
  RotateCcw,
  Plus,
  Lightbulb,
  Utensils,
  Home,
  Bus,
  Zap,
  Ticket,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  MoreHorizontal,
  Smile,
  Shield,
  CreditCard,
  Gift,
  HandHeart,
  Luggage,
  PawPrint,
  Baby,
  Repeat,
  Dumbbell,
  Smartphone,
  Sofa,
  Wrench,
  Receipt,
  Landmark,
  Gem,
  Clock,
  Briefcase,
  LineChart as LineChartIcon,
  Percent,
  Key,
  Tag,
  Dice5,
  Trophy,
  RefreshCw,
  Laptop,
  Copyright,
  HandCoins,
  User,
  DollarSign,
  Award,
  ArrowRightLeft,
  Film,
  Book,
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
  generateLocalPDFReport,
  generateLocalCSVReport,
  formatCurrency,
  formatPercentage,
  formatDate,
  type TransactionReport,
} from "~/lib";
import { generateTransactionReport } from "~/lib/services/transactions";
import { getCategoryColor, getColorByIndex } from "~/lib";
import { sharePDF, getSaveLocationMessage } from "~/lib/";
import { getCSVSaveLocationMessage } from "~/lib/generators/csvGenerator";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { useRouter } from "expo-router";

const { width: screenWidth } = Dimensions.get("window");

// Category icon mapping (same as Dashboard)
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  // Expense categories
  "Food & Drinks": Utensils,
  "Home & Rent": Home,
  Travel: Bus,
  Bills: Zap,
  Fun: Film,
  Health: HeartPulse,
  Shopping: ShoppingBag,
  Learning: GraduationCap,
  "Personal Care": Smile,
  Insurance: Shield,
  Loans: CreditCard,
  Gifts: Gift,
  Donations: HandHeart,
  Vacation: Luggage,
  Pets: PawPrint,
  Children: Baby,
  Subscriptions: Repeat,
  "Gym & Sports": Dumbbell,
  Electronics: Smartphone,
  Furniture: Sofa,
  Repairs: Wrench,
  Taxes: Receipt,

  // Income categories
  "Initial Balance": DollarSign,
  Bonus: Zap,
  "Part-time Work": Clock,
  Business: Briefcase,
  Investments: LineChartIcon,
  "Bank Interest": Percent,
  "Rent Income": Home,
  Sales: ShoppingBag,
  Gambling: Dice5,
  Awards: Award,
  Refunds: RefreshCw,
  Freelance: Laptop,
  Royalties: Book,
  Grants: HandCoins,
  "Gifts Received": Gift,
  Pension: User,
  Transfer: ArrowRightLeft,
};

// Category color mapping (same as Dashboard)
const CATEGORY_COLORS: Record<string, string> = {
  // Expense colors
  "Food & Drinks": "#059669",
  "Home & Rent": "#0891b2",
  Travel: "#3b82f6",
  Bills: "#f97316",
  Fun: "#8b5cf6",
  Health: "#dc2626",
  Shopping: "#06b6d4",
  Learning: "#84cc16",
  "Personal Care": "#ec4899",
  Insurance: "#14b8a6",
  Loans: "#f97316",
  Gifts: "#8b5cf6",
  Donations: "#dc2626",
  Vacation: "#3b82f6",
  Pets: "#f97316",
  Children: "#ec4899",
  Subscriptions: "#8b5cf6",
  "Gym & Sports": "#059669",
  Electronics: "#64748b",
  Furniture: "#f97316",
  Repairs: "#3b82f6",
  Taxes: "#dc2626",

  // Income colors
  "Initial Balance": "#059669",
  Bonus: "#f97316",
  "Part-time Work": "#f97316",
  Business: "#8b5cf6",
  Investments: "#059669",
  "Bank Interest": "#06b6d4",
  "Rent Income": "#0891b2",
  Sales: "#06b6d4",
  Gambling: "#f43f5e",
  Awards: "#8b5cf6",
  Refunds: "#3b82f6",
  Freelance: "#f97316",
  Royalties: "#84cc16",
  Grants: "#059669",
  "Gifts Received": "#8b5cf6",
  Pension: "#64748b",
  Transfer: "#64748b",
};

// Category type mapping (expense vs income)
const CATEGORY_TYPES: Record<string, "expense" | "income"> = {
  // Expense categories
  "Food & Drinks": "expense",
  "Home & Rent": "expense",
  Travel: "expense",
  Bills: "expense",
  Fun: "expense",
  Health: "expense",
  Shopping: "expense",
  Learning: "expense",
  "Personal Care": "expense",
  Insurance: "expense",
  Loans: "expense",
  Gifts: "expense",
  Donations: "expense",
  Vacation: "expense",
  Pets: "expense",
  Children: "expense",
  Subscriptions: "expense",
  "Gym & Sports": "expense",
  Electronics: "expense",
  Furniture: "expense",
  Repairs: "expense",
  Taxes: "expense",

  // Income categories
  "Initial Balance": "income",
  Bonus: "income",
  "Part-time Work": "income",
  Business: "income",
  Investments: "income",
  "Bank Interest": "income",
  "Rent Income": "income",
  Sales: "income",
  Gambling: "income",
  Awards: "income",
  Refunds: "income",
  Freelance: "income",
  Royalties: "income",
  Grants: "income",
  "Gifts Received": "income",
  Pension: "income",
  Transfer: "income",
};

// Category Item Component (similar to MemoizedTransactionItem)
const CategoryItem = ({
  category,
  data,
  isSelected = false,
}: {
  category: string;
  data: {
    amount: number;
    percentage: number;
    count: number;
    transactionIds?: string[];
  };
  isSelected?: boolean;
}) => {
  const theme = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const IconComponent = CATEGORY_ICONS[category] || MoreHorizontal;
  const color = CATEGORY_COLORS[category] || "#64748b";
  const categoryType = CATEGORY_TYPES[category] || "expense";
  const isExpense = categoryType === "expense";

  const handlePress = () => {
    if (data.transactionIds && data.transactionIds.length > 0) {
      // Navigate to the first transaction detail
      router.push(
        `/(transactions)/transaction-detail/${data.transactionIds[0]}`
      );
    }
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <View
        className="flex-row items-center p-4 rounded-xl gap-3 mb-2"
        style={{
          backgroundColor: isSelected ? `${color}10` : theme.cardBackground,
          borderWidth: isSelected ? 1 : 0,
          borderColor: isSelected ? color : "transparent",
        }}
      >
        <View
          className="w-11 h-11 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <IconComponent size={20} color={color} />
        </View>
        <View className="flex-1 flex-row justify-between items-center">
          <View className="flex-1 flex-row items-center">
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                className="text-base font-semibold"
                style={{ color: theme.text }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {category}
              </Text>
              <Text
                className="text-xs"
                style={{ color: theme.textSecondary }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {data.count} {t.transactionsCount}
              </Text>
              <Text
                className="text-xs"
                //style={{ color: theme.textSecondary }}
                style={{
                  color: isExpense ? "#DC2626" : "#16A34A",
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isExpense ? t.expense : t.income}
              </Text>
            </View>
            <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
              <Text
                className="text-base font-bold"
                style={{
                  color: isExpense ? "#DC2626" : "#16A34A",
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isExpense ? "-" : "+"}
                {formatCurrency(Math.abs(data.amount))}
              </Text>
              <Text
                className="text-xs"
                style={{ color: theme.textSecondary }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {formatPercentage(data.percentage)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function Report() {
  const theme = useTheme();
  const { t } = useLanguage();
  const { selectedAccount, accounts } = useAccount();
  const router = useRouter();

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
  const [selectedPreset, setSelectedPreset] = useState<string | null>("today");
  const [chartView, setChartView] = useState<"bar" | "line">("bar");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  // Helper function to transform generateTransactionReport data to match UI expectations
  const transformReportData = useCallback(
    (
      reportData: any,
      userId: string,
      startDate: string,
      endDate: string
    ): TransactionReport => {
      // Validate input data
      if (!reportData) {
        throw new Error("reportData is null or undefined");
      }

      // Ensure data structures exist
      const categoryBreakdown = reportData.categoryBreakdown || {};
      const dailyTrends = reportData.dailyTrends || {};
      const monthlyTrends = reportData.monthlyTrends || {};

      // Use the income/expense data from generateTransactionReport
      const totalIncome = reportData.totalIncome || 0;
      const totalExpenses = reportData.totalExpenses || 0;

      // Transform category breakdown to include count, percentage, and transaction IDs
      const transformedCategoryBreakdown: {
        [key: string]: {
          amount: number;
          percentage: number;
          count: number;
          transactionIds?: string[];
        };
      } = {};

      if (typeof categoryBreakdown === "object") {
        Object.entries(categoryBreakdown).forEach(
          ([category, data]: [string, any]) => {
            // Handle both old format (just amount) and new format (object with amount, count, transactionIds)
            const amount = typeof data === "number" ? data : data.amount;
            const count = typeof data === "number" ? 1 : data.count;
            const transactionIds =
              typeof data === "number" ? [] : data.transactionIds || [];

            const absAmount = Math.abs(amount || 0);
            const totalSpending = totalIncome + totalExpenses;
            const percentage =
              totalSpending > 0 ? (absAmount / totalSpending) * 100 : 0;
            transformedCategoryBreakdown[category] = {
              amount: absAmount,
              percentage: percentage,
              count: count,
              transactionIds: transactionIds,
            };
          }
        );
      }

      // Transform daily trends to array format
      const transformedDailyTrends =
        typeof dailyTrends === "object"
          ? Object.entries(dailyTrends).map(
              ([date, amount]: [string, any]) => ({
                date,
                amount: Math.abs(amount || 0),
              })
            )
          : [];

      // Transform monthly trends to array format
      const transformedMonthlyTrends =
        typeof monthlyTrends === "object"
          ? Object.entries(monthlyTrends).map(
              ([month, amount]: [string, any]) => ({
                month,
                amount: Math.abs(amount || 0),
              })
            )
          : [];

      return {
        summary: {
          total_amount: reportData.totalAmount || 0,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          total_transactions: reportData.totalTransactions || 0,
          average_transaction: reportData.avgTransaction || 0,
          period: `${startDate} to ${endDate}`,
        },
        category_breakdown: transformedCategoryBreakdown,
        daily_trends: transformedDailyTrends,
        monthly_trends: transformedMonthlyTrends,
        transactions: [],
      };
    },
    []
  );

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

  // Memoized line chart data
  const lineChartData = useMemo(() => {
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
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`, // Indigo color
          strokeWidth: 3,
        },
      ],
    };
  }, [processedChartData]);

  const fetchTransactionReports = useCallback(async () => {
    if (!selectedAccount) {
      return;
    }

    try {
      setLoading(true);

      const startDate = dateRange.startDate.toISOString().split("T")[0];
      const endDate = dateRange.endDate.toISOString().split("T")[0];

      const rawData = await generateTransactionReport(
        selectedAccount.user_id,
        startDate,
        endDate
      );

      if (!rawData) {
        throw new Error("No data returned from generateTransactionReport");
      }

      const data = transformReportData(
        rawData,
        selectedAccount.user_id,
        startDate,
        endDate
      );
      setTransactionData(data);
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error generating transaction reports:", error);
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
  }, [
    selectedAccount,
    dateRange.startDate,
    dateRange.endDate,
    transformReportData,
    t,
  ]);

  // Initial data loading
  useEffect(() => {
    if (selectedAccount && isInitialLoad) {
      fetchTransactionReports();
    }
  }, [selectedAccount?.id, isInitialLoad]);

  // Refresh transaction data when date range changes
  useEffect(() => {
    if (selectedAccount && !isInitialLoad) {
      fetchTransactionReports();
    }
  }, [dateRange.startDate, dateRange.endDate, selectedAccount?.id]);

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
    // You can add more functionality here, like filtering transactions by category
    console.log(`Selected category: ${category}`);
  };

  const handleDownload = async (format: "csv" | "pdf") => {
    try {
      const startDate = dateRange.startDate.toISOString().split("T")[0];
      const endDate = dateRange.endDate.toISOString().split("T")[0];

      if (!transactionData) {
        Alert.alert(t.error, t.noDataForReport);
        return;
      }

      // Show confirmation dialog
      const formatUpper = format.toUpperCase();
      Alert.alert(
        `Download ${formatUpper}`,
        `Are you sure you want to download the ${formatUpper} report?`,
        [
          {
            text: t.cancel,
            style: "cancel",
          },
          {
            text: t.download,
            onPress: async () => {
              await performDownload(format, startDate, endDate);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in handleDownload:", error);
      Alert.alert(t.error, t.somethingWentWrong);
    }
  };

  const performDownload = async (
    format: "csv" | "pdf",
    startDate: string,
    endDate: string
  ) => {
    try {
      setLoading(true);

      if (format === "pdf") {
        // Generate PDF locally
        const filePath = await generateLocalPDFReport(
          "transactions",
          transactionData,
          startDate && endDate ? { startDate, endDate } : undefined
        );

        const fileName = `Transactions.pdf`;
        const saveMessage = getSaveLocationMessage(filePath, fileName);

        Alert.alert(t.pdfGeneratedSuccessfully, saveMessage, [
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
            text: t.done,
            style: "cancel",
          },
        ]);
      } else {
        // Generate CSV locally
        const filePath = await generateLocalCSVReport(
          "transactions",
          transactionData,
          startDate && endDate ? { startDate, endDate } : undefined
        );

        const fileName = `Transactions.csv`;
        const saveMessage = getCSVSaveLocationMessage(filePath, fileName);

        Alert.alert(t.csvGeneratedSuccessfully, saveMessage, [
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
        // Clear selected preset when manually changing dates
        setSelectedPreset(null);
      }
    },
    [datePickerMode]
  );

  const confirmIOSDate = useCallback(() => {
    setDatePickerVisible(false);
  }, []);

  // Function to apply pending date changes and refresh data
  const handleSubmitDateRange = useCallback(() => {
    setDateRange(pendingDateRange);
  }, [pendingDateRange]);

  const openDatePicker = useCallback((mode: "start" | "end") => {
    setDatePickerMode(mode);
    setDatePickerVisible(true);
  }, []);

  // Reset function to set date range to today
  const handleReset = useCallback(() => {
    const today = new Date();
    const resetDateRange = {
      startDate: today,
      endDate: today,
    };
    setPendingDateRange(resetDateRange);
    setDateRange(resetDateRange);
    setSelectedPreset("today");
  }, []);

  // Quick date preset functions
  const handleDatePreset = useCallback((preset: string) => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (preset) {
      case "today":
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case "thisWeek":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        endDate = new Date(today);
        break;
      case "thisMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today);
        break;
      case "lastMonth":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "thisYear":
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today);
        break;
      default:
        startDate = new Date(today);
        endDate = new Date(today);
    }

    const presetDateRange = { startDate, endDate };
    setPendingDateRange(presetDateRange);
    setDateRange(presetDateRange);
    setSelectedPreset(preset);
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
        {/* Smart Insights */}
        {transactionData &&
          Object.keys(transactionData.category_breakdown).length > 0 && (
            <View
              style={{
                marginBottom: 16,
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
              <View className="flex-row items-center mb-3">
                <Lightbulb size={20} color="#f59e0b" />
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: "bold",
                    marginLeft: 8,
                  }}
                >
                  {t.smartInsights}
                </Text>
              </View>
              <View>
                {(() => {
                  const insights = [];
                  const categories = Object.entries(
                    transactionData.category_breakdown
                  );
                  const totalSpending =
                    transactionData.summary.total_income +
                    transactionData.summary.total_expenses;

                  // Calculate net income (income - expenses)
                  const netIncome =
                    transactionData.summary.total_income -
                    transactionData.summary.total_expenses;
                  const overspendingAmount = Math.abs(netIncome);

                  // Find biggest expense category
                  const biggestCategory = categories.reduce(
                    (max, [category, data]) =>
                      data.amount > max.amount
                        ? {
                            category,
                            amount: data.amount,
                            percentage: data.percentage,
                          }
                        : max,
                    { category: "", amount: 0, percentage: 0 }
                  );

                  // Biggest expense category insight
                  if (biggestCategory.amount > 0) {
                    insights.push(
                      <Text
                        key="biggest-category"
                        style={{
                          color: theme.textSecondary,
                          fontSize: 14,
                          lineHeight: 20,
                          marginBottom: 8,
                        }}
                      >
                        💡{" "}
                        {t.biggestExpenseCategory
                          .replace("{category}", biggestCategory.category)
                          .replace(
                            "{percentage}",
                            biggestCategory.percentage.toFixed(1)
                          )}
                      </Text>
                    );
                  }

                  // Net Income Analysis with detailed financial advice
                  if (
                    transactionData.summary.total_income > 0 &&
                    transactionData.summary.total_expenses > 0
                  ) {
                    const savingsRate =
                      ((transactionData.summary.total_income -
                        transactionData.summary.total_expenses) /
                        transactionData.summary.total_income) *
                      100;

                    if (netIncome > 0) {
                      // Positive net income - user is saving
                      insights.push(
                        <View
                          key="positive-net-income"
                          style={{ marginBottom: 12 }}
                        >
                          <Text
                            style={{
                              color: "#059669",
                              fontSize: 14,
                              lineHeight: 20,
                              marginBottom: 8,
                              fontWeight: "600",
                            }}
                          >
                            💰{" "}
                            {t.netIncomePositive.replace(
                              "{percentage}",
                              savingsRate.toFixed(1)
                            )}
                          </Text>
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 13,
                              lineHeight: 18,
                              marginLeft: 16,
                            }}
                          >
                            • {t.buildEmergencyFund}
                          </Text>
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 13,
                              lineHeight: 18,
                              marginLeft: 16,
                            }}
                          >
                            • {t.setSavingsGoal}
                          </Text>
                        </View>
                      );
                    } else {
                      // Negative net income - user is overspending
                      insights.push(
                        <View
                          key="negative-net-income"
                          style={{ marginBottom: 12 }}
                        >
                          <Text
                            style={{
                              color: "#dc2626",
                              fontSize: 14,
                              lineHeight: 20,
                              marginBottom: 8,
                              fontWeight: "600",
                            }}
                          >
                            {t.netIncomeNegative.replace(
                              "{amount}",
                              formatCurrency(overspendingAmount)
                            )}
                          </Text>

                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 13,
                              fontWeight: "600",
                              marginBottom: 6,
                              marginLeft: 16,
                            }}
                          >
                            {t.overspendingRecommendations}
                          </Text>

                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 13,
                              lineHeight: 18,
                              marginLeft: 16,
                            }}
                          >
                            • {t.reduceExpenses}
                          </Text>
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 13,
                              lineHeight: 18,
                              marginLeft: 16,
                            }}
                          >
                            • {t.reviewSubscriptions}
                          </Text>
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 13,
                              lineHeight: 18,
                              marginLeft: 16,
                            }}
                          >
                            • {t.createBudget}
                          </Text>
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 13,
                              lineHeight: 18,
                              marginLeft: 16,
                            }}
                          >
                            • {t.trackDailySpending}
                          </Text>
                        </View>
                      );
                    }
                  }

                  // Additional insights for spending patterns
                  if (categories.length > 3) {
                    const topThreeCategories = categories
                      .sort(([, a], [, b]) => b.amount - a.amount)
                      .slice(0, 3);

                    if (topThreeCategories.length > 0) {
                      insights.push(
                        <Text
                          key="spending-diversity"
                          style={{
                            color: theme.textSecondary,
                            fontSize: 14,
                            lineHeight: 20,
                            marginBottom: 8,
                          }}
                        >
                          📊{" "}
                          {t.spendingDiversity
                            .replace("{count}", categories.length.toString())
                            .replace(
                              "{categories}",
                              topThreeCategories.map(([cat]) => cat).join(", ")
                            )}
                        </Text>
                      );
                    }
                  }

                  return insights.length > 0 ? (
                    insights
                  ) : (
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 14,
                        fontStyle: "italic",
                      }}
                    >
                      {t.keepAddingTransactions}
                    </Text>
                  );
                })()}
              </View>
            </View>
          )}

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
            <View
              style={{
                alignItems: "center",
                paddingVertical: 32,
                paddingHorizontal: 16,
              }}
            >
              <PieChart size={48} color={theme.textMuted} />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 18,
                  fontWeight: "600",
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                No Spending Data Yet
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                Start adding transactions to see your spending patterns and
                insights here.
              </Text>
            </View>
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
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => setChartView("bar")}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor:
                    chartView === "bar" ? "#6366f1" : "transparent",
                  marginRight: 8,
                }}
              >
                <BarChart2
                  size={20}
                  color={chartView === "bar" ? "#ffffff" : "#6366f1"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setChartView("line")}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor:
                    chartView === "line" ? "#10b981" : "transparent",
                }}
              >
                <TrendingUp
                  size={20}
                  color={chartView === "line" ? "#ffffff" : "#10b981"}
                />
              </TouchableOpacity>
            </View>
          </View>
          {barChartData.datasets[0].data.length > 0 ? (
            chartView === "bar" ? (
              <BarChart
                data={barChartData}
                width={screenWidth - 48}
                height={220}
                yAxisLabel="$"
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: theme.cardBackground,
                  backgroundGradientFrom: theme.cardBackground,
                  backgroundGradientTo: theme.cardBackground,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                  labelColor: (opacity = 1) =>
                    `rgba(156, 163, 175, ${opacity})`,
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
              <LineChart
                data={lineChartData!}
                width={screenWidth - 48}
                height={220}
                yAxisLabel="$"
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: theme.cardBackground,
                  backgroundGradientFrom: theme.cardBackground,
                  backgroundGradientTo: theme.cardBackground,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) =>
                    `rgba(156, 163, 175, ${opacity})`,
                  style: { borderRadius: 16 },
                  fillShadowGradient: "#10b981",
                  fillShadowGradientOpacity: 0.1,
                  propsForBackgroundLines: {
                    strokeDasharray: "5,5",
                    stroke: theme.border,
                    strokeWidth: 1,
                  },
                  propsForLabels: {
                    fontSize: 12,
                    fontWeight: "500",
                  },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#10b981",
                  },
                }}
                style={{ marginVertical: 8, borderRadius: 16 }}
                bezier
              />
            )
          ) : (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 32,
                paddingHorizontal: 16,
              }}
            >
              {chartView === "bar" ? (
                <BarChart2 size={48} color={theme.textMuted} />
              ) : (
                <TrendingUp size={48} color={theme.textMuted} />
              )}
              <Text
                style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: "600",
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                No Trend Data Available
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Try selecting a different date range to see spending trends
              </Text>
            </View>
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

        {/* Category Breakdown */}
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
              style={{
                color: theme.text,
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              {t.categoryBreakdown}
            </Text>
            <PieChart size={20} color="#8b5cf6" />
          </View>
          {Object.entries(transactionData.category_breakdown)
            .sort(([, a], [, b]) => Math.abs(b.amount) - Math.abs(a.amount)) // Sort by amount descending
            .map(([category, data], index) => (
              <CategoryItem key={index} category={category} data={data} />
            ))}
        </View>

        {/* Selected Category Details */}
        {selectedCategory &&
          transactionData.category_breakdown[selectedCategory] && (
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
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    {selectedCategory} Details
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {CATEGORY_TYPES[selectedCategory] === "expense"
                      ? t.expense
                      : t.income}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      const categoryData =
                        transactionData.category_breakdown[selectedCategory];
                      if (
                        categoryData.transactionIds &&
                        categoryData.transactionIds.length > 0
                      ) {
                        router.push(
                          `/(transactions)/transaction-detail/${categoryData.transactionIds[0]}`
                        );
                      }
                    }}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: theme.primary,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      View Transaction
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(null)}
                    style={{
                      padding: 4,
                      borderRadius: 4,
                    }}
                  >
                    <X size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View className="flex-row justify-between">
                <View>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                    Total Amount
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color:
                        CATEGORY_TYPES[selectedCategory] === "expense"
                          ? "#DC2626"
                          : "#16A34A",
                    }}
                  >
                    {CATEGORY_TYPES[selectedCategory] === "expense" ? "-" : "+"}
                    {formatCurrency(
                      Math.abs(
                        transactionData.category_breakdown[selectedCategory]
                          .amount
                      )
                    )}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                    Percentage
                  </Text>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    {formatPercentage(
                      transactionData.category_breakdown[selectedCategory]
                        .percentage
                    )}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                    Transactions
                  </Text>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    {transactionData.category_breakdown[selectedCategory].count}
                  </Text>
                </View>
              </View>
            </View>
          )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView className="flex-1">
        <View className="flex-1">
          {/* Header */}
          <View
            style={{
              backgroundColor: theme.background,
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 18,
                    fontWeight: "bold",
                  }}
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
                  <Text
                    style={{ color: "#d97706", fontSize: 14, marginTop: 4 }}
                  >
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
                  <FileText size={18} color="white" />
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

            {/* Quick Date Presets */}
            <View className="mb-3">
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                Quick Select
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { key: "today", label: "Today" },
                  { key: "thisWeek", label: "This Week" },
                  { key: "thisMonth", label: "This Month" },
                  { key: "lastMonth", label: "Last Month" },
                  { key: "thisYear", label: "This Year" },
                ].map((preset) => {
                  const isSelected = selectedPreset === preset.key;
                  return (
                    <TouchableOpacity
                      key={preset.key}
                      style={{
                        backgroundColor: isSelected
                          ? theme.primary
                          : theme.background,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isSelected ? theme.primary : theme.border,
                        shadowColor: isSelected ? theme.primary : "transparent",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isSelected ? 0.3 : 0,
                        shadowRadius: 4,
                        elevation: isSelected ? 3 : 0,
                      }}
                      onPress={() => handleDatePreset(preset.key)}
                      disabled={loading}
                    >
                      <Text
                        style={{
                          color: isSelected ? "white" : theme.text,
                          fontSize: 12,
                          fontWeight: isSelected ? "600" : "500",
                        }}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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

              {/* Action Buttons Row */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  style={{
                    backgroundColor: "#3b82f6",
                    padding: 12,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
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
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.5}
                  >
                    {loading ? t.loading : t.applyDateRange}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: "#f59e0b",
                    padding: 12,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: loading ? 0.6 : 1,
                    flex: 1,
                  }}
                  onPress={handleReset}
                  disabled={loading}
                >
                  <RotateCcw size={16} color="white" />
                  <Text
                    style={{ marginLeft: 8, color: "white", fontWeight: "600" }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.5}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>

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
                  {t.showingData}{" "}
                  {formatDate(dateRange.startDate.toISOString())} -{" "}
                  {formatDate(dateRange.endDate.toISOString())}
                </Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <View
            style={{ flex: 1, backgroundColor: "transparent", padding: 16 }}
          >
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
                        themeVariant={
                          theme.isDarkColorScheme ? "dark" : "light"
                        }
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
                    transactionData?.category_breakdown[
                      selectedSegment.name
                    ] && (
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
      </ScrollView>
    </SafeAreaView>
  );
}
