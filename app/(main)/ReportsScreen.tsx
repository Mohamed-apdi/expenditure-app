import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  PanResponder,
} from 'react-native';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Wallet,
  X,
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  Zap,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  Target,
  Trophy,
  Flag,
  Flame,
  Star,
  Landmark,
  PiggyBank,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Briefcase,
  HandCoins,
  Users,
  CircleDollarSign,
  Scale,
  History,
} from 'lucide-react-native';
import DateTimePicker, {
  useDefaultStyles,
  type CalendarComponents,
} from 'react-native-ui-datepicker';
import { BarChart as GiftedBarChart, PieChart as GiftedPieChart, LineChart as GiftedLineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccount, getCurrentUserOfflineFirst, triggerSync } from '~/lib';
import {
  getLocalTransactionReports,
  getLocalAccountReports,
  getLocalBudgetReports,
  getLocalGoalReports,
  getLocalSubscriptionReports,
  getLocalInvestmentReports,
  getLocalLoanReports,
  formatCurrency,
  formatPercentage,
  formatDate,
  type TransactionReport,
  type AccountReport,
  type BudgetReport,
  type GoalReport,
  type SubscriptionReport,
  type InvestmentReport,
  type LoanReport,
} from '~/lib/services/localReports';
import { getCategoryColor, getColorByIndex } from '~/lib';
import { generatePDFReport, sharePDF } from '~/lib/generators/pdfGenerator';
import { generateCSVReport, shareCSV } from '~/lib/generators/csvGenerator';
import { useTheme, useScreenStatusBar } from '~/lib';
import { useLanguage } from '~/lib';
import { playTabClickSound, preloadTabClickSound } from '~/lib/utils/playTabSound';
import { toast } from 'sonner-native';

const { width: screenWidth } = Dimensions.get('window');

export default function ReportsScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  useScreenStatusBar();
  const { selectedAccount, accounts } = useAccount();
  const defaultDatePickerStyles = useDefaultStyles(
    theme.isDarkColorScheme ? 'dark' : 'light',
  );

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
  const [rangePickerVisible, setRangePickerVisible] = useState(false);
  const [downloadMenuVisible, setDownloadMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<
    'transactions' | 'accounts' | 'budgets' | 'goals' | 'subscriptions' | 'investments' | 'loans'
  >('transactions');
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Tab bar scroll-to-active (same pattern as BudgetScreen)
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const tabsScrollWidthRef = useRef(0);
  const REPORT_TAB_KEYS = [
    'transactions',
    'subscriptions',
    'budgets',
    'goals',
    'accounts',
    'investments',
    'loans',
  ] as const;

  const scrollTabBarToActive = useCallback(() => {
    const scrollView = tabsScrollRef.current;
    if (!scrollView) return;
    const w = tabsScrollWidthRef.current;
    const layout = tabLayoutsRef.current[activeTab];
    if (layout && w > 0) {
      const targetX = Math.max(0, layout.x - w / 2 + layout.width / 2);
      scrollView.scrollTo({ x: targetX, animated: true });
      return;
    }
    const index = REPORT_TAB_KEYS.indexOf(activeTab);
    if (index >= 0) {
      const padding = 16;
      const gap = 8;
      const approxTabWidth = 90;
      const targetX = Math.max(
        0,
        padding + index * (approxTabWidth + gap) - w / 2 + approxTabWidth / 2,
      );
      scrollView.scrollTo({ x: targetX, animated: true });
    }
  }, [activeTab]);

  useEffect(() => {
    const t = setTimeout(scrollTabBarToActive, 50);
    return () => clearTimeout(t);
  }, [activeTab, scrollTabBarToActive]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        const current = activeTabRef.current;
        if (
          Math.abs(gestureState.dx) > 50 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        ) {
          if (gestureState.dx > 0) {
            switch (current) {
              case 'subscriptions':
                setActiveTab('transactions');
                break;
              case 'budgets':
                setActiveTab('subscriptions');
                break;
              case 'goals':
                setActiveTab('budgets');
                break;
              case 'accounts':
                setActiveTab('goals');
                break;
            }
          } else {
            switch (current) {
              case 'transactions':
                setActiveTab('subscriptions');
                break;
              case 'subscriptions':
                setActiveTab('budgets');
                break;
              case 'budgets':
                setActiveTab('goals');
                break;
              case 'goals':
                setActiveTab('accounts');
                break;
            }
          }
        }
      },
      onPanResponderTerminate: () => {},
    }),
  ).current;

  // Preload tab click feedback (same as Add Expense / Budget)
  useEffect(() => {
    void preloadTabClickSound();
  }, []);

  // Report data states
  const [transactionData, setTransactionData] =
    useState<TransactionReport | null>(null);
  const [accountData, setAccountData] = useState<AccountReport | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetReport | null>(null);
  const [goalData, setGoalData] = useState<GoalReport | null>(null);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionReport | null>(null);
  const [investmentData, setInvestmentData] =
    useState<InvestmentReport | null>(null);
  const [loanData, setLoanData] = useState<LoanReport | null>(null);

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

      const weekKey = startOfWeek.toISOString().split('T')[0];

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { date: weekKey, amount: 0 });
      }

      weeklyMap.get(weekKey).amount += item.amount;
    });

    return Array.from(weeklyMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  };

  const aggregateByMonth = (dailyData: any[]) => {
    const monthlyMap = new Map();

    dailyData.forEach((item) => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { date: monthKey, amount: 0 });
      }

      monthlyMap.get(monthKey).amount += item.amount;
    });

    return Array.from(monthlyMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  };

  // Memoized data processing functions
  const processedChartData = useMemo(() => {
    if (!transactionData) return null;

    const daysDiff = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    let chartData = transactionData.daily_trends;
    let dateFormatter: Intl.DateTimeFormatOptions;
    let chartTitle = t.dailySpendingTrends;

    if (daysDiff <= 14) {
      chartData = transactionData.daily_trends;
      dateFormatter = { month: 'short', day: 'numeric' };
      chartTitle = t.dailySpendingTrends;
    } else if (daysDiff <= 60) {
      const weeklyData = aggregateByWeek(transactionData.daily_trends);
      chartData = weeklyData;
      dateFormatter = { month: 'short', day: 'numeric' };
      chartTitle = t.weeklySpendingTrends;
    } else {
      const monthlyData = aggregateByMonth(transactionData.daily_trends);
      chartData = monthlyData;
      dateFormatter = { month: 'short', year: '2-digit' };
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

  // Function to translate category names
  const translateCategory = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'Food & Drinks': t.foodAndDrinks,
      'Home & Rent': t.homeAndRent,
      Travel: t.travel,
      Fun: t.fun,
      Health: t.health,
      Shopping: t.shopping,
      Learning: t.learning,
      'Personal Care': t.personalCare,
      Loans: t.loans,
      Loan: t.loan,
      Transfer: t.transfer,
      'Loan Repayment': t.loanRepayment,
      Gifts: t.gifts,
      Donations: t.donations,
      Vacation: t.vacation,
      Pets: t.pets,
      Children: t.children,
      'Gym & Sports': t.gymAndSports,
      Electronics: t.electronics,
      Furniture: t.furniture,
      Repairs: t.repairs,
      Taxes: t.taxes,
      'Initial Balance': t.InitialBalance,
      Bonus: t.bonus,
      'Part-time Work': t.partTimeWork,
      Business: t.business,
      'Bank Interest': t.bankInterest,
      'Rent Income': t.rentIncome,
      Sales: t.sales,
      Gambling: t.gambling,
      Awards: t.awards,
      Refunds: t.refunds,
      Freelance: t.freelance,
      Royalties: t.royalties,
      Grants: t.grants,
      'Gifts Received': t.giftsReceived,
      Pension: t.pension,
      'Mobile Money': t.mobileMoney,
      // Additional common categories
      Food: t.food,
      Rent: t.rent,
      Bills: t.bills,
      Subscriptions: t.subscriptions,
      Budgets: t.budgets,
      Reports: t.reports,
      Trends: t.trends,
      Cash: t.cash,
      Bank: t.bank,
      Cards: t.cards,
      Savings: t.savings,
      Investments: t.investments,
      Insurance: t.insurance,
      Others: t.others,
    };

    return categoryMap[category] || category;
  };

  // Memoized pie chart data
  const pieChartData = useMemo(() => {
    if (!transactionData) return [];

    return Object.entries(transactionData.category_breakdown).map(
      ([category, data]) => ({
        name: translateCategory(category),
        population: Math.abs(data.amount),
        color: getCategoryColor(category),
        legendFontColor: '#64748b',
        legendFontSize: 12,
      }),
    );
  }, [transactionData, t]);

  // Gifted Charts pie data: { value, color, text? }
  const giftedPieData = useMemo(() => {
    return pieChartData.map((item) => ({
      value: item.population,
      color: item.color,
      text: item.name,
    }));
  }, [pieChartData]);

  // Memoized bar chart data (chart-kit format - kept for any legacy refs)
  const barChartData = useMemo(() => {
    if (!processedChartData) return null;
    return {
      labels: processedChartData.displayData.map((item) =>
        new Date(item.date).toLocaleDateString(
          'en-US',
          processedChartData.dateFormatter,
        ),
      ),
      datasets: [
        {
          data: processedChartData.displayData.map((item) =>
            Math.abs(item.amount),
          ),
          colors: processedChartData.displayData.map(
            (_, index) => () => getColorByIndex(index),
          ),
        },
      ],
    };
  }, [processedChartData]);

  // Gifted Charts bar data: value, label (date + amount on second line), frontColor. Values under bars so they align on one line.
  const giftedBarData = useMemo(() => {
    if (!processedChartData) return [];
    return processedChartData.displayData.map((item, index) => {
      const value = Math.abs(item.amount);
      const dateLabel = new Date(item.date).toLocaleDateString(
        'en-US',
        processedChartData.dateFormatter,
      );
      const color = getColorByIndex(index);
      return {
        value,
        label: `${dateLabel}\n${formatCurrency(value)}`,
        frontColor: color,
        topLabelComponent: () => null,
        onPress: () => {},
        dateLabel,
        formattedValue: formatCurrency(value),
      };
    });
  }, [processedChartData]);

  const fetchTransactionReports = useCallback(async () => {
    try {
      setLoading(true);

      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      const startDateStr = dateRange.startDate.toISOString().split('T')[0];
      const endDateStr = dateRange.endDate.toISOString().split('T')[0];

      const data = await getLocalTransactionReports(
        user.id,
        selectedAccount?.id,
        startDateStr,
        endDateStr,
      );

      setTransactionData(data);
      setIsInitialLoad(false);

      // Trigger background sync when online
      void triggerSync();
    } catch (error) {
      console.error('❌ Error fetching transaction reports:', error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace('{errorMessage}', errorMessage),
      );
      setTransactionData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, dateRange.startDate, dateRange.endDate, t]);

  const fetchAccountReports = useCallback(async () => {
    try {
      setLoading(true);

      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      const data = await getLocalAccountReports(user.id, selectedAccount?.id);
      setAccountData(data);
      setIsInitialLoad(false);

      // Trigger background sync when online
      void triggerSync();
    } catch (error) {
      console.error('Error fetching account reports:', error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace('{errorMessage}', errorMessage),
      );
      setAccountData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, t]);

  const fetchBudgetReports = useCallback(async () => {
    try {
      setLoading(true);

      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      const data = await getLocalBudgetReports(
        user.id,
        dateRange.startDate.toISOString().split('T')[0],
        dateRange.endDate.toISOString().split('T')[0],
        selectedAccount?.id,
      );
      setBudgetData(data);
      setIsInitialLoad(false);

      // Trigger background sync when online
      void triggerSync();
    } catch (error) {
      console.error('Error fetching budget reports:', error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace('{errorMessage}', errorMessage),
      );
      setBudgetData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, dateRange.startDate, dateRange.endDate, t]);

  const fetchGoalReports = useCallback(async () => {
    try {
      setLoading(true);

      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      const data = await getLocalGoalReports(user.id);
      setGoalData(data);
      setIsInitialLoad(false);

      // Trigger background sync when online
      void triggerSync();
    } catch (error) {
      console.error('Error fetching goal reports:', error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace('{errorMessage}', errorMessage),
      );
      setGoalData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchSubscriptionReports = useCallback(async () => {
    try {
      setLoading(true);

      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      const data = await getLocalSubscriptionReports(
        user.id,
        selectedAccount?.id,
      );
      setSubscriptionData(data);
      setIsInitialLoad(false);

      // Trigger background sync when online
      void triggerSync();
    } catch (error) {
      console.error('Error fetching subscription reports:', error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace('{errorMessage}', errorMessage),
      );
      setSubscriptionData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, t]);

  const fetchInvestmentReports = useCallback(async () => {
    try {
      setLoading(true);

      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      const data = await getLocalInvestmentReports(
        user.id,
        selectedAccount?.id,
      );
      setInvestmentData(data);
      setIsInitialLoad(false);

      void triggerSync();
    } catch (error) {
      console.error('Error fetching investment reports:', error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace('{errorMessage}', errorMessage),
      );
      setInvestmentData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, t]);

  const fetchLoanReports = useCallback(async () => {
    try {
      setLoading(true);

      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      const data = await getLocalLoanReports(
        user.id,
        selectedAccount?.id,
      );
      setLoanData(data);
      setIsInitialLoad(false);

      void triggerSync();
    } catch (error) {
      console.error('Error fetching loan reports:', error);
      const errorMessage =
        error instanceof Error ? error.message : t.unknownError;
      Alert.alert(
        t.error,
        t.failedToFetchReports.replace('{errorMessage}', errorMessage),
      );
      setLoanData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, t]);

  // Unified fetch function based on active tab
  const fetchReports = useCallback(() => {
    switch (activeTab) {
      case 'transactions':
        fetchTransactionReports();
        break;
      case 'accounts':
        fetchAccountReports();
        break;
      case 'budgets':
        fetchBudgetReports();
        break;
      case 'goals':
        fetchGoalReports();
        break;
      case 'subscriptions':
        fetchSubscriptionReports();
        break;
      case 'investments':
        fetchInvestmentReports();
        break;
      case 'loans':
        fetchLoanReports();
        break;
    }
  }, [
    activeTab,
    fetchTransactionReports,
    fetchAccountReports,
    fetchBudgetReports,
    fetchGoalReports,
    fetchSubscriptionReports,
    fetchInvestmentReports,
    fetchLoanReports,
  ]);

  // Fetch data when tab changes or account changes
  useEffect(() => {
    if (selectedAccount || activeTab === 'goals' || activeTab === 'accounts' || activeTab === 'investments' || activeTab === 'loans') {
      fetchReports();
    }
  }, [activeTab, selectedAccount, fetchReports]);

  // Refresh data when date range changes (triggered by submit) for date-dependent tabs
  useEffect(() => {
    if (
      (selectedAccount || activeTab === 'goals') &&
      !isInitialLoad &&
      (activeTab === 'transactions' || activeTab === 'budgets')
    ) {
      fetchReports();
    }
  }, [dateRange, selectedAccount, activeTab, fetchReports, isInitialLoad]);

  const handleDownload = async (format: 'csv' | 'pdf') => {
    try {
      setLoading(true);
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];

      // Handle subscription reports
      if (activeTab === 'subscriptions') {
        if (!subscriptionData) {
          Alert.alert(t.error, t.noDataForReport);
          return;
        }

        if (format === 'pdf') {
          const pdfData = {
            title: t.subscriptionReport,
            subtitle: selectedAccount
              ? `${t.account}: ${selectedAccount.name}`
              : t.allAccounts,
            dateRange: `${t.generated}: ${formatDate(new Date().toISOString())}`,
            summary: [
              {
                label: t.totalSubscriptions,
                value: subscriptionData.summary.total_subscriptions.toString(),
              },
              {
                label: t.activeSubscriptions,
                value: subscriptionData.summary.active_subscriptions.toString(),
              },
              {
                label: t.monthlyCost,
                value: formatCurrency(subscriptionData.summary.monthly_cost),
              },
              {
                label: t.yearlyCost,
                value: formatCurrency(subscriptionData.summary.yearly_cost),
              },
            ],
            charts: [],
            tables: [
              {
                title: t.activeSubscriptions,
                headers: [
                  t.name,
                  t.category,
                  t.billingCycle,
                  t.cost,
                  t.monthlyEquivalent,
                ],
                rows: subscriptionData.subscriptions.map((sub) => [
                  sub.name,
                  sub.category,
                  sub.billing_cycle,
                  formatCurrency(sub.cost),
                  formatCurrency(sub.monthly_equivalent),
                ]),
              },
            ],
          };

          const filePath = await generatePDFReport(pdfData);
          try {
            await sharePDF(filePath);
            toast.success(t.pdfGeneratedSuccessfully, {
              description: t.reportSavedToDevice,
            });
          } catch (shareError) {
            console.error('Error sharing PDF:', shareError);
            Alert.alert(t.error, t.failedToSharePdf);
          }
        } else {
          const csvData = {
            title: t.subscriptionReport,
            dateRange: `${t.generated}: ${formatDate(new Date().toISOString())}`,
            summary: [
              {
                label: t.totalSubscriptions,
                value: subscriptionData.summary.total_subscriptions.toString(),
              },
              {
                label: t.activeSubscriptions,
                value: subscriptionData.summary.active_subscriptions.toString(),
              },
              {
                label: t.monthlyCost,
                value: formatCurrency(subscriptionData.summary.monthly_cost),
              },
              {
                label: t.yearlyCost,
                value: formatCurrency(subscriptionData.summary.yearly_cost),
              },
            ],
            tables: [
              {
                title: t.activeSubscriptions,
                headers: [
                  t.name,
                  t.category,
                  t.billingCycle,
                  t.cost,
                  t.monthlyEquivalent,
                  t.nextBilling,
                ],
                rows: subscriptionData.subscriptions.map((sub) => [
                  sub.name,
                  sub.category,
                  sub.billing_cycle,
                  sub.cost.toString(),
                  sub.monthly_equivalent.toString(),
                  sub.next_billing,
                ]),
              },
            ],
          };

          const filePath = await generateCSVReport(csvData);
          try {
            await shareCSV(filePath);
            toast.success(t.csvGeneratedSuccessfully, {
              description: t.reportSavedToDevice,
            });
          } catch (shareError) {
            console.error('Error sharing CSV:', shareError);
            Alert.alert(t.error, t.failedToShareCsv);
          }
        }
        return;
      }

      // Handle budget reports
      if (activeTab === 'budgets') {
        if (!budgetData) {
          Alert.alert(t.error, t.noDataForReport);
          return;
        }

        if (format === 'pdf') {
          const pdfData = {
            title: t.budgetReport,
            subtitle: selectedAccount
              ? `${t.account}: ${selectedAccount.name}`
              : t.allAccounts,
            dateRange: budgetData.summary.period,
            summary: [
              {
                label: t.totalBudget,
                value: formatCurrency(budgetData.summary.total_budget),
              },
              {
                label: t.totalSpent,
                value: formatCurrency(budgetData.summary.total_spent),
              },
              {
                label: t.totalRemaining,
                value: formatCurrency(budgetData.summary.total_remaining),
              },
              {
                label: t.overallProgress,
                value: `${budgetData.summary.overall_percentage.toFixed(1)}%`,
              },
            ],
            charts: [],
            tables: [
              {
                title: t.budgetVsActualSpending,
                headers: [
                  t.category,
                  t.budget,
                  t.spent,
                  t.remaining,
                  t.progress,
                  t.status,
                ],
                rows: budgetData.budget_comparison.map((item) => [
                  item.category,
                  formatCurrency(item.budget),
                  formatCurrency(item.spent),
                  formatCurrency(item.remaining),
                  `${item.percentage.toFixed(1)}%`,
                  item.status.charAt(0).toUpperCase() + item.status.slice(1),
                ]),
              },
              ...(Object.keys(budgetData.unbudgeted_spending).length > 0
                ? [
                    {
                      title: t.unbudgetedSpending,
                      headers: [t.category, t.amount],
                      rows: Object.entries(budgetData.unbudgeted_spending).map(
                        ([category, amount]) => [
                          category,
                          formatCurrency(amount),
                        ],
                      ),
                    },
                  ]
                : []),
            ],
          };

          const filePath = await generatePDFReport(pdfData);
          try {
            await sharePDF(filePath);
            toast.success(t.pdfGeneratedSuccessfully, {
              description: t.reportSavedToDevice,
            });
          } catch (shareError) {
            console.error('Error sharing PDF:', shareError);
            Alert.alert(t.error, t.failedToSharePdf);
          }
        } else {
          const csvData = {
            title: t.budgetReport,
            dateRange: budgetData.summary.period,
            summary: [
              {
                label: t.totalBudget,
                value: formatCurrency(budgetData.summary.total_budget),
              },
              {
                label: t.totalSpent,
                value: formatCurrency(budgetData.summary.total_spent),
              },
              {
                label: t.totalRemaining,
                value: formatCurrency(budgetData.summary.total_remaining),
              },
              {
                label: t.overallProgress,
                value: `${budgetData.summary.overall_percentage.toFixed(1)}%`,
              },
            ],
            tables: [
              {
                title: t.budgetVsActualSpending,
                headers: [
                  t.category,
                  t.budget,
                  t.spent,
                  t.remaining,
                  t.progress,
                  t.status,
                ],
                rows: budgetData.budget_comparison.map((item) => [
                  item.category,
                  item.budget.toString(),
                  item.spent.toString(),
                  item.remaining.toString(),
                  item.percentage.toString(),
                  item.status,
                ]),
              },
              ...(Object.keys(budgetData.unbudgeted_spending).length > 0
                ? [
                    {
                      title: t.unbudgetedSpending,
                      headers: [t.category, t.amount],
                      rows: Object.entries(budgetData.unbudgeted_spending).map(
                        ([category, amount]) => [category, amount.toString()],
                      ),
                    },
                  ]
                : []),
            ],
          };

          const filePath = await generateCSVReport(csvData);
          try {
            await shareCSV(filePath);
            toast.success(t.csvGeneratedSuccessfully, {
              description: t.reportSavedToDevice,
            });
          } catch (shareError) {
            console.error('Error sharing CSV:', shareError);
            Alert.alert(t.error, t.failedToShareCsv);
          }
        }
        return;
      }

      // Handle goal reports
      if (activeTab === 'goals') {
        if (!goalData) {
          Alert.alert(t.error, t.noDataForReport);
          return;
        }

        if (format === 'pdf') {
          const pdfData = {
            title: t.goalsReport,
            subtitle: t.financialGoalsProgress,
            dateRange: `${t.generated}: ${formatDate(new Date().toISOString())}`,
            summary: [
              {
                label: t.totalGoals,
                value: goalData.summary.total_goals.toString(),
              },
              {
                label: t.completedGoals,
                value: goalData.summary.completed_goals.toString(),
              },
              {
                label: t.totalTarget,
                value: formatCurrency(goalData.summary.total_target),
              },
              {
                label: t.totalSaved,
                value: formatCurrency(goalData.summary.total_saved),
              },
              {
                label: t.overallProgress,
                value: `${goalData.summary.overall_percentage.toFixed(1)}%`,
              },
            ],
            charts: [],
            tables: [
              {
                title: t.goalsProgress,
                headers: [
                  t.goalName,
                  t.category,
                  t.targetAmount,
                  t.currentAmount,
                  t.progress,
                  t.status,
                  t.daysRemaining,
                ],
                rows: goalData.goals.map((goal) => [
                  goal.name,
                  goal.category,
                  formatCurrency(goal.target_amount),
                  formatCurrency(goal.current_amount),
                  `${goal.percentage.toFixed(1)}%`,
                  goal.status.charAt(0).toUpperCase() + goal.status.slice(1),
                  goal.days_remaining > 0
                    ? goal.days_remaining.toString()
                    : t.overdue,
                ]),
              },
            ],
          };

          const filePath = await generatePDFReport(pdfData);
          try {
            await sharePDF(filePath);
            toast.success(t.pdfGeneratedSuccessfully, {
              description: t.reportSavedToDevice,
            });
          } catch (shareError) {
            console.error('Error sharing PDF:', shareError);
            Alert.alert(t.error, t.failedToSharePdf);
          }
        } else {
          const csvData = {
            title: t.goalsReport,
            dateRange: `${t.generated}: ${formatDate(new Date().toISOString())}`,
            summary: [
              {
                label: t.totalGoals,
                value: goalData.summary.total_goals.toString(),
              },
              {
                label: t.completedGoals,
                value: goalData.summary.completed_goals.toString(),
              },
              {
                label: t.totalTarget,
                value: formatCurrency(goalData.summary.total_target),
              },
              {
                label: t.totalSaved,
                value: formatCurrency(goalData.summary.total_saved),
              },
              {
                label: t.overallProgress,
                value: `${goalData.summary.overall_percentage.toFixed(1)}%`,
              },
            ],
            tables: [
              {
                title: t.goalsProgress,
                headers: [
                  t.goalName,
                  t.category,
                  t.targetAmount,
                  t.currentAmount,
                  t.progress,
                  t.status,
                  t.daysRemaining,
                  t.targetDate,
                ],
                rows: goalData.goals.map((goal) => [
                  goal.name,
                  goal.category,
                  goal.target_amount.toString(),
                  goal.current_amount.toString(),
                  goal.percentage.toString(),
                  goal.status,
                  goal.days_remaining > 0
                    ? goal.days_remaining.toString()
                    : t.overdue,
                  goal.target_date,
                ]),
              },
            ],
          };

          const filePath = await generateCSVReport(csvData);
          try {
            await shareCSV(filePath);
            toast.success(t.csvGeneratedSuccessfully, {
              description: t.reportSavedToDevice,
            });
          } catch (shareError) {
            console.error('Error sharing CSV:', shareError);
            Alert.alert(t.error, t.failedToShareCsv);
          }
        }
        return;
      }

      // Handle account reports
      if (activeTab === 'accounts') {
        if (!accountData) {
          Alert.alert(t.error, t.noDataForReport);
          return;
        }

        if (format === 'pdf') {
          const pdfData = {
            title: t.accountReport,
            subtitle: t.accountDetails,
            dateRange: `${t.generated}: ${formatDate(new Date().toISOString())}`,
            summary: [
              {
                label: t.totalBalance,
                value: formatCurrency(accountData.summary.total_balance),
              },
              {
                label: t.totalAccounts,
                value: accountData.summary.total_accounts.toString(),
              },
              {
                label: t.totalTransactions,
                value: accountData.summary.total_transactions.toString(),
              },
            ],
            charts: [],
            tables: [
              {
                title: t.accountDetails,
                headers: [
                  t.name,
                  t.type,
                  t.balance,
                  t.currency,
                  t.transactionsCount,
                  t.date,
                ],
                rows: accountData.accounts.map((account) => [
                  account.name,
                  account.type,
                  formatCurrency(account.balance),
                  account.currency,
                  account.transaction_count.toString(),
                  formatDate(account.created_at),
                ]),
              },
            ],
          };

          const filePath = await generatePDFReport(pdfData);
          try {
            await sharePDF(filePath);
            toast.success(t.pdfGeneratedSuccessfully, {
              description: t.reportSavedToDevice,
            });
          } catch (shareError) {
            console.error('Error sharing PDF:', shareError);
            Alert.alert(t.error, t.failedToSharePdf);
          }
        } else {
          const csvData = {
            title: t.accountReport,
            dateRange: `${t.generated}: ${formatDate(new Date().toISOString())}`,
            summary: [
              {
                label: t.totalBalance,
                value: formatCurrency(accountData.summary.total_balance),
              },
              {
                label: t.totalAccounts,
                value: accountData.summary.total_accounts.toString(),
              },
              {
                label: t.totalTransactions,
                value: accountData.summary.total_transactions.toString(),
              },
            ],
            tables: [
              {
                title: t.accountDetails,
                headers: [
                  t.name,
                  t.type,
                  t.balance,
                  t.currency,
                  t.transactionsCount,
                  t.date,
                ],
                rows: accountData.accounts.map((account) => [
                  account.name,
                  account.type,
                  account.balance.toString(),
                  account.currency,
                  account.transaction_count.toString(),
                  account.created_at,
                ]),
              },
            ],
          };

          const filePath = await generateCSVReport(csvData);
          try {
            await shareCSV(filePath);
            toast.success(t.csvGeneratedSuccessfully, {
              description: t.reportSavedToDevice,
            });
          } catch (shareError) {
            console.error('Error sharing CSV:', shareError);
            Alert.alert(t.error, t.failedToShareCsv);
          }
        }
        return;
      }

      // Handle transaction reports
      if (!transactionData) {
        Alert.alert(t.error, t.noDataForReport);
        return;
      }

      if (format === 'pdf') {
        // Generate PDF locally
        const pdfData = {
          title: t.transactionReport,
          subtitle: selectedAccount
            ? `${t.account}: ${selectedAccount.name}`
            : t.allAccounts,
          dateRange: `${formatDate(startDate)} - ${formatDate(endDate)}`,
          summary: [
            {
              label: t.income,
              value: formatCurrency(transactionData.summary.total_income),
            },
            {
              label: t.expenses,
              value: formatCurrency(transactionData.summary.total_expenses),
            },
            {
              label: t.netAmount,
              value: formatCurrency(transactionData.summary.total_amount),
            },
            {
              label: t.totalTransactions,
              value: transactionData.summary.total_transactions.toString(),
            },
            {
              label: t.averageTransaction,
              value: formatCurrency(
                transactionData.summary.average_transaction,
              ),
            },
          ],
          charts: [], // Charts not supported in PDF yet
          tables: [
            {
              title: t.categoryBreakdown,
              headers: [
                t.category,
                t.amount,
                t.percentageOfTotal,
                t.transactionsCount,
              ],
              rows: Object.entries(transactionData.category_breakdown).map(
                ([category, data]) => [
                  category,
                  formatCurrency(data.amount),
                  formatPercentage(data.percentage),
                  data.count.toString(),
                ],
              ),
            },
            {
              title: `${t.dailySpendingTrends} (15 ${t.daysLeft})`,
              headers: [t.date, t.amount],
              rows: transactionData.daily_trends
                .slice(-15)
                .map((trend) => [
                  formatDate(trend.date),
                  formatCurrency(trend.amount),
                ]),
            },
          ],
        };

        const filePath = await generatePDFReport(pdfData);
        try {
          await sharePDF(filePath);
          toast.success(t.pdfGeneratedSuccessfully, {
            description: t.reportSavedToDevice,
          });
        } catch (shareError) {
          console.error('Error sharing PDF:', shareError);
          Alert.alert(t.error, t.failedToSharePdf);
        }
      } else {
        // Generate CSV locally
        const csvData = {
          title: t.transactionReport,
          dateRange: `${formatDate(startDate)} - ${formatDate(endDate)}`,
          summary: [
            {
              label: t.income,
              value: formatCurrency(transactionData.summary.total_income),
            },
            {
              label: t.expenses,
              value: formatCurrency(transactionData.summary.total_expenses),
            },
            {
              label: t.netAmount,
              value: formatCurrency(transactionData.summary.total_amount),
            },
            {
              label: t.totalTransactions,
              value: transactionData.summary.total_transactions.toString(),
            },
            {
              label: t.averageTransaction,
              value: formatCurrency(
                transactionData.summary.average_transaction,
              ),
            },
          ],
          tables: [
            {
              title: t.categoryBreakdown,
              headers: [
                t.category,
                t.amount,
                t.percentageOfTotal,
                t.transactionsCount,
              ],
              rows: Object.entries(transactionData.category_breakdown).map(
                ([category, data]) => [
                  category,
                  data.amount.toString(),
                  data.percentage.toString(),
                  data.count.toString(),
                ],
              ),
            },
            {
              title: t.dailySpendingTrends,
              headers: [t.date, t.amount],
              rows: transactionData.daily_trends.map((trend) => [
                trend.date,
                trend.amount.toString(),
              ]),
            },
          ],
        };

        const filePath = await generateCSVReport(csvData);
        try {
          await shareCSV(filePath);
          toast.success(t.csvGeneratedSuccessfully, {
            description: t.reportSavedToDevice,
          });
        } catch (shareError) {
          console.error('Error sharing CSV:', shareError);
          Alert.alert(t.error, t.failedToShareCsv);
        }
      }
    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()} report:`, error);
      Alert.alert(t.error, `Failed to generate ${format.toUpperCase()} report`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRangePicker = useCallback(() => {
    setDownloadMenuVisible(false);
    setTimeout(() => setRangePickerVisible((v) => !v), 50);
  }, []);

  const toggleDownloadMenu = useCallback((show: boolean) => {
    if (show) {
      setRangePickerVisible(false);
      setTimeout(() => setDownloadMenuVisible(true), 50);
    } else {
      setDownloadMenuVisible(false);
    }
  }, []);

  const renderTransactionTab = () => {
    if (!selectedAccount) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.isDarkColorScheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <Wallet size={36} color={theme.primary} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {t.noAccountSelected}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
            }}>
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
              '{accountName}',
              selectedAccount.name,
            )}
          </Text>
        </View>
      );
    }

    if (transactionData.summary.total_transactions === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.isDarkColorScheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <FileText size={36} color={theme.primary} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {t.noTransactionsFound}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}>
            {t.noTransactionsForDateRange}
          </Text>
        </View>
      );
    }

    if (!processedChartData || !barChartData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            {t.processingChartData}
          </Text>
        </View>
      );
    }

    const netAmount = transactionData.summary.total_amount;
    const isPositiveNet = netAmount >= 0;
    const savingsRate = transactionData.summary.total_income > 0
      ? ((netAmount / transactionData.summary.total_income) * 100).toFixed(1)
      : '0';

    const incomeExpenseComparisonData = [
      { value: transactionData.summary.total_income, frontColor: '#10B981', label: t.income || 'Income' },
      { value: transactionData.summary.total_expenses, frontColor: '#EF4444', label: t.expenses || 'Expenses' },
    ];

    const lineChartData = (processedChartData?.displayData || []).map((item: any) => {
      const dateLabel = item.date
        ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '';
      return {
        value: item.amount || 0,
        dataPointText: '',
        label: dateLabel,
      };
    });

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Net Amount Hero Card */}
        <View
          style={{
            backgroundColor: isPositiveNet ? '#10B981' : '#EF4444',
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              {isPositiveNet ? (
                <TrendingUp size={20} color="#FFFFFF" />
              ) : (
                <TrendingDown size={20} color="#FFFFFF" />
              )}
            </View>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
              {t.netAmount}
            </Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '700' }}>
            {isPositiveNet ? '+' : ''}{formatCurrency(netAmount)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Activity size={14} color="rgba(255, 255, 255, 0.8)" />
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 13, marginLeft: 6 }}>
                {transactionData.summary.total_transactions} {t.transactions}
              </Text>
            </View>
            {parseFloat(savingsRate) !== 0 && (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  {isPositiveNet ? t.saved || 'Saved' : t.overspent || 'Overspent'} {Math.abs(parseFloat(savingsRate))}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Income & Expense Cards Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Income Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}>
                <ArrowDownRight size={18} color="#10B981" />
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {t.income}
              </Text>
            </View>
            <Text style={{ color: '#10B981', fontSize: 20, fontWeight: '700' }}>
              {formatCurrency(transactionData.summary.total_income)}
            </Text>
          </View>

          {/* Expense Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}>
                <ArrowUpRight size={18} color="#EF4444" />
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {t.expenses}
              </Text>
            </View>
            <Text style={{ color: '#EF4444', fontSize: 20, fontWeight: '700' }}>
              {formatCurrency(transactionData.summary.total_expenses)}
            </Text>
          </View>
        </View>

        {/* Income vs Expense Comparison */}
        <View
          style={{
            marginBottom: 16,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 16,
            }}>
            {t.incomeVsExpenses || 'Income vs Expenses'}
          </Text>
          <View style={{ alignItems: 'center' }}>
            <GiftedBarChart
              data={incomeExpenseComparisonData}
              barWidth={60}
              barBorderRadius={8}
              noOfSections={4}
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: theme.text, fontSize: 12, fontWeight: '500' }}
              formatYLabel={(v) => `$${Number(v).toLocaleString()}`}
              hideRules
              width={screenWidth - 100}
              height={160}
              initialSpacing={40}
              spacing={60}
              isAnimated
              showValuesAsTopLabel
              topLabelTextStyle={{ color: theme.text, fontSize: 10, fontWeight: '600' }}
            />
          </View>
          {/* Visual comparison bar */}
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t.income}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t.expenses}</Text>
            </View>
            <View style={{ height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }}>
              <View
                style={{
                  flex: transactionData.summary.total_income,
                  backgroundColor: '#10B981',
                  borderTopLeftRadius: 6,
                  borderBottomLeftRadius: 6,
                }}
              />
              <View
                style={{
                  flex: transactionData.summary.total_expenses,
                  backgroundColor: '#EF4444',
                  borderTopRightRadius: 6,
                  borderBottomRightRadius: 6,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>
                {((transactionData.summary.total_income / (transactionData.summary.total_income + transactionData.summary.total_expenses)) * 100 || 0).toFixed(0)}%
              </Text>
              <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600' }}>
                {((transactionData.summary.total_expenses / (transactionData.summary.total_income + transactionData.summary.total_expenses)) * 100 || 0).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Spending by Category - Improved */}
        <View
          style={{
            marginBottom: 16,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 16,
            }}>
            {t.spendingByCategory}
          </Text>
          {giftedPieData.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <GiftedPieChart
                  data={giftedPieData}
                  donut
                  radius={70}
                  innerRadius={45}
                  innerCircleColor={theme.cardBackground}
                  focusOnPress
                  isAnimated
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                        {giftedPieData.length}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
                        {t.categories || 'Categories'}
                      </Text>
                    </View>
                  )}
                />
              </View>
              <View style={{ flex: 1, paddingLeft: 8 }}>
                {giftedPieData.slice(0, 5).map((slice, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: slice.color,
                        marginRight: 8,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 12,
                          fontWeight: '500',
                        }}
                        numberOfLines={1}>
                        {slice.text}
                      </Text>
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontSize: 11,
                        }}>
                        {formatCurrency(slice.value)}
                      </Text>
                    </View>
                  </View>
                ))}
                {giftedPieData.length > 5 && (
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                    +{giftedPieData.length - 5} {t.more || 'more'}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text
              style={{
                color: theme.textSecondary,
                textAlign: 'center',
                paddingVertical: 24,
              }}>
              {t.noDataAvailable}
            </Text>
          )}
        </View>

        {/* Spending Trends Line Chart */}
        {lineChartData.length > 1 && (
          <View
            style={{
              marginBottom: 16,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <Text
              style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: '600',
                marginBottom: 16,
              }}>
              {t.spendingTrend || 'Spending Trend'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <GiftedLineChart
                data={lineChartData}
                width={Math.max(screenWidth - 80, lineChartData.length * 50)}
                height={180}
                spacing={50}
                initialSpacing={20}
                endSpacing={20}
                color={theme.primary}
                thickness={3}
                hideDataPoints={false}
                dataPointsColor={theme.primary}
                dataPointsRadius={5}
                startFillColor={theme.primary}
                endFillColor={theme.cardBackground}
                startOpacity={0.3}
                endOpacity={0.05}
                areaChart
                curved
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 9 }}
                yAxisColor="transparent"
                xAxisColor={theme.border}
                hideRules
                noOfSections={4}
                formatYLabel={(v) => `$${Number(v).toLocaleString()}`}
                isAnimated
                animationDuration={1000}
              />
            </ScrollView>
          </View>
        )}

        {/* Daily/Weekly/Monthly Trends Bar Chart */}
        <View
          style={{
            marginBottom: 16,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 12,
            }}>
            {processedChartData.chartTitle}
          </Text>
          {giftedBarData.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ marginVertical: 8, paddingBottom: 4, paddingLeft: 4 }}>
                <GiftedBarChart
                  data={giftedBarData.map(item => ({ ...item, label: '', frontColor: theme.primary }))}
                  barWidth={28}
                  barBorderRadius={6}
                  noOfSections={4}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={theme.border}
                  yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{
                    color: theme.text,
                    fontSize: 10,
                  }}
                  formatYLabel={(v) => `$${Number(v).toLocaleString()}`}
                  hideRules
                  width={Math.max(screenWidth - 64, giftedBarData.length * 60)}
                  height={180}
                  initialSpacing={16}
                  endSpacing={16}
                  spacing={32}
                  labelsExtraHeight={0}
                  isAnimated
                />
                {/* X-axis labels below chart */}
                {(() => {
                  const barWidth = 28;
                  const spacing = 32;
                  const initialSpacing = 16;
                  const yAxisLabelWidth = 50;
                  const containerPadding = 4;
                  const labelColumnWidth = barWidth + spacing;
                  const firstBarCenter = containerPadding + yAxisLabelWidth + initialSpacing + barWidth / 2;
                  return (
                    <View
                      style={{
                        flexDirection: 'row',
                        marginTop: -4,
                        width: Math.max(screenWidth - 64, giftedBarData.length * 60),
                        paddingLeft: containerPadding,
                        minHeight: 32,
                      }}>
                      {giftedBarData.map((item, index) => (
                        <View
                          key={index}
                          style={{
                            position: 'absolute',
                            left: firstBarCenter + index * labelColumnWidth - labelColumnWidth / 2,
                            width: labelColumnWidth,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 9,
                              textAlign: 'center',
                            }}
                            numberOfLines={2}>
                            {item.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
              </View>
            </ScrollView>
          ) : (
            <Text
              style={{
                color: theme.textSecondary,
                textAlign: 'center',
                paddingVertical: 24,
              }}>
              {t.noTrendDataAvailable}
            </Text>
          )}
        </View>

        {/* Category Breakdown - Enhanced */}
        <View
          style={{
            marginBottom: 16,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 16,
            }}>
            {t.categoryBreakdown}
          </Text>
          {Object.entries(transactionData.category_breakdown).map(
            ([category, data], index) => {
              const categoryColor = getCategoryColor(category);
              return (
                <View
                  key={index}
                  style={{
                    marginBottom: index < Object.keys(transactionData.category_breakdown).length - 1 ? 14 : 0,
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: `${categoryColor}15`,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                      <Wallet size={20} color={categoryColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: '600',
                            fontSize: 14,
                          }}>
                          {translateCategory(category)}
                        </Text>
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: '700',
                            fontSize: 15,
                          }}>
                          {formatCurrency(data.amount)}
                        </Text>
                      </View>
                      {/* Progress Bar */}
                      <View
                        style={{
                          height: 8,
                          backgroundColor: theme.isDarkColorScheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          borderRadius: 4,
                          overflow: 'hidden',
                          marginBottom: 4,
                        }}>
                        <View
                          style={{
                            height: '100%',
                            width: `${Math.min(data.percentage, 100)}%`,
                            backgroundColor: categoryColor,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text
                          style={{
                            color: theme.textSecondary,
                            fontSize: 11,
                          }}>
                          {data.count} {data.count === 1 ? t.transaction || 'transaction' : t.transactions || 'transactions'}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                            backgroundColor: `${categoryColor}15`,
                          }}>
                          <Text
                            style={{
                              color: categoryColor,
                              fontSize: 11,
                              fontWeight: '600',
                            }}>
                            {formatPercentage(data.percentage)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            },
          )}
        </View>

        {/* Transaction Stats Card */}
        <View
          style={{
            marginBottom: 16,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 16,
            }}>
            {t.transactionStats || 'Transaction Stats'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                {t.totalTransactions || 'Total Transactions'}
              </Text>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
                {transactionData.summary.total_transactions}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                {t.avgTransaction || 'Avg. Transaction'}
              </Text>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
                {formatCurrency(transactionData.summary.average_transaction)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                {t.largestExpense || 'Largest Expense'}
              </Text>
              <Text style={{ color: '#EF4444', fontSize: 20, fontWeight: '700' }}>
                {formatCurrency(
                  transactionData.transactions
                    .filter(t => t.type === 'expense')
                    .reduce((max, t) => Math.max(max, t.amount), 0)
                )}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                {t.categoriesUsed || 'Categories Used'}
              </Text>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
                {Object.keys(transactionData.category_breakdown).length}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  const renderAccountsTab = () => {
    if (!accountData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            {t.loadingAccountData}
          </Text>
        </View>
      );
    }

    if (accountData.accounts.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.isDarkColorScheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <Landmark size={36} color={theme.primary} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {t.noAccountData}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}>
            {t.unableToLoadAccountInfo}
          </Text>
        </View>
      );
    }

    const getAccountIcon = (type: string) => {
      const lowerType = type?.toLowerCase() || '';
      if (lowerType.includes('bank') || lowerType.includes('checking')) {
        return Landmark;
      } else if (lowerType.includes('savings') || lowerType.includes('save')) {
        return PiggyBank;
      } else if (lowerType.includes('cash')) {
        return Banknote;
      } else if (lowerType.includes('credit') || lowerType.includes('card')) {
        return CreditCard;
      } else if (lowerType.includes('wallet') || lowerType.includes('mobile')) {
        return Wallet;
      }
      return Wallet;
    };

    const getAccountColor = (type: string) => {
      const lowerType = type?.toLowerCase() || '';
      if (lowerType.includes('bank') || lowerType.includes('checking')) {
        return '#3B82F6';
      } else if (lowerType.includes('savings') || lowerType.includes('save')) {
        return '#10B981';
      } else if (lowerType.includes('cash')) {
        return '#8B5CF6';
      } else if (lowerType.includes('credit') || lowerType.includes('card')) {
        return '#F59E0B';
      } else if (lowerType.includes('wallet') || lowerType.includes('mobile')) {
        return '#EC4899';
      }
      return '#6B7280';
    };

    const totalBalance = accountData.summary.total_balance;
    const totalAccounts = accountData.summary.total_accounts;
    const totalTransactions = accountData.summary.total_transactions;

    const positiveAccounts = accountData.accounts.filter(a => a.balance >= 0);
    const negativeAccounts = accountData.accounts.filter(a => a.balance < 0);
    const totalPositive = positiveAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalNegative = Math.abs(negativeAccounts.reduce((sum, a) => sum + a.balance, 0));

    const pieData = accountData.accounts.map((account) => ({
      value: Math.abs(account.balance),
      color: getAccountColor(account.type),
      text: account.name,
    }));

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Total Balance Card */}
        <View
          style={{
            backgroundColor: theme.primary,
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              <Landmark size={20} color="#FFFFFF" />
            </View>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
              {t.totalBalance}
            </Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '700' }}>
            {formatCurrency(totalBalance)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 6,
                }}>
                <Wallet size={12} color="#FFFFFF" />
              </View>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 13 }}>
                {totalAccounts} {t.accounts || 'accounts'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 6,
                }}>
                <Activity size={12} color="#FFFFFF" />
              </View>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 13 }}>
                {totalTransactions} {t.transactions || 'transactions'}
              </Text>
            </View>
          </View>
        </View>

        {/* Assets & Liabilities Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Assets Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}>
                <ArrowUpRight size={16} color="#10B981" />
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {t.assets || 'Assets'}
              </Text>
            </View>
            <Text style={{ color: '#10B981', fontSize: 18, fontWeight: '700' }}>
              {formatCurrency(totalPositive)}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              {positiveAccounts.length} {t.accounts || 'accounts'}
            </Text>
          </View>

          {/* Liabilities Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}>
                <ArrowDownRight size={16} color="#EF4444" />
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {t.liabilities || 'Liabilities'}
              </Text>
            </View>
            <Text style={{ color: totalNegative > 0 ? '#EF4444' : theme.text, fontSize: 18, fontWeight: '700' }}>
              {formatCurrency(totalNegative)}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              {negativeAccounts.length} {t.accounts || 'accounts'}
            </Text>
          </View>
        </View>

        {/* Account Distribution Chart */}
        {pieData.length > 1 && (
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
              {t.accountDistribution || 'Account Distribution'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <GiftedPieChart
                  data={pieData}
                  donut
                  radius={60}
                  innerRadius={40}
                  innerCircleColor={theme.cardBackground}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
                        {pieData.length}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
                        {t.accounts || 'Accounts'}
                      </Text>
                    </View>
                  )}
                />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                {pieData.slice(0, 4).map((item, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: item.color,
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, flex: 1 }} numberOfLines={1}>
                      {item.text}
                    </Text>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
                      {formatCurrency(item.value)}
                    </Text>
                  </View>
                ))}
                {pieData.length > 4 && (
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                    +{pieData.length - 4} {t.more || 'more'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Accounts List */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
              {t.allAccounts}
            </Text>
          </View>
          {accountData.accounts.map((account, index) => {
            const IconComponent = getAccountIcon(account.type);
            const iconColor = getAccountColor(account.type);
            const isNegative = account.balance < 0;

            return (
              <View
                key={account.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Account Icon */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: iconColor + '15',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                    <IconComponent size={22} color={iconColor} />
                  </View>

                  {/* Account Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
                        {account.name}
                      </Text>
                      <Text
                        style={{
                          color: isNegative ? '#EF4444' : theme.text,
                          fontWeight: '700',
                          fontSize: 16,
                        }}>
                        {formatCurrency(account.balance)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                            backgroundColor: iconColor + '15',
                          }}>
                          <Text style={{ color: iconColor, fontSize: 11, fontWeight: '500' }}>
                            {account.type}
                          </Text>
                        </View>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          {account.currency}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Activity size={12} color={theme.textSecondary} />
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          {account.transaction_count} {t.txns || 'txns'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
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
              fontWeight: '600',
              marginTop: 16,
              textAlign: 'center',
            }}>
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
            {t.loadingBudgetData}
          </Text>
        </View>
      );
    }

    if (budgetData.budget_comparison.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.isDarkColorScheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <Wallet size={36} color={theme.primary} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {t.noBudgetsFound}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}>
            {t.noBudgetsSetUpYet}
          </Text>
        </View>
      );
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'over':
          return '#EF4444';
        case 'near':
          return '#F59E0B';
        default:
          return '#10B981';
      }
    };

    const getStatusBgColor = (status: string) => {
      switch (status) {
        case 'over':
          return 'rgba(239, 68, 68, 0.1)';
        case 'near':
          return 'rgba(245, 158, 11, 0.1)';
        default:
          return 'rgba(16, 185, 129, 0.1)';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'over':
          return t.overBudget || 'Over Budget';
        case 'near':
          return t.nearLimit || 'Near Limit';
        default:
          return t.onTrack || 'On Track';
      }
    };

    const overallPercentage = budgetData.summary.overall_percentage;
    const overallStatus = overallPercentage > 100 ? 'over' : overallPercentage > 80 ? 'near' : 'under';
    const budgetsOver = budgetData.budget_comparison.filter(b => b.status === 'over').length;
    const budgetsNear = budgetData.budget_comparison.filter(b => b.status === 'near').length;
    const budgetsOnTrack = budgetData.budget_comparison.filter(b => b.status !== 'over' && b.status !== 'near').length;

    const pieData = budgetData.budget_comparison.map((item, index) => ({
      value: item.spent,
      color: getStatusColor(item.status),
      text: item.category,
    }));

    const unbudgetedEntries = Object.entries(budgetData.unbudgeted_spending || {});
    const totalUnbudgeted = unbudgetedEntries.reduce((sum, [_, amount]) => sum + (amount as number), 0);

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Overall Progress Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Donut Chart */}
            <View style={{ marginRight: 20 }}>
              <GiftedPieChart
                data={[
                  { value: Math.min(overallPercentage, 100), color: getStatusColor(overallStatus) },
                  { value: Math.max(100 - overallPercentage, 0), color: theme.isDarkColorScheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                ]}
                donut
                radius={50}
                innerRadius={38}
                innerCircleColor={theme.cardBackground}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: getStatusColor(overallStatus), fontSize: 18, fontWeight: '700' }}>
                      {Math.round(overallPercentage)}%
                    </Text>
                  </View>
                )}
              />
            </View>

            {/* Summary Info */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                {t.overallProgress}
              </Text>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', marginBottom: 8 }}>
                {formatCurrency(budgetData.summary.total_spent)}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.of || 'of'} {formatCurrency(budgetData.summary.total_budget)}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: getStatusBgColor(overallStatus),
                  alignSelf: 'flex-start',
                }}>
                {overallStatus === 'over' ? (
                  <AlertCircle size={12} color={getStatusColor(overallStatus)} />
                ) : overallStatus === 'near' ? (
                  <Clock size={12} color={getStatusColor(overallStatus)} />
                ) : (
                  <CheckCircle size={12} color={getStatusColor(overallStatus)} />
                )}
                <Text style={{ color: getStatusColor(overallStatus), fontSize: 11, fontWeight: '600', marginLeft: 4 }}>
                  {getStatusLabel(overallStatus)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Remaining Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: budgetData.summary.total_remaining >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <TrendingUp size={18} color={budgetData.summary.total_remaining >= 0 ? '#10B981' : '#EF4444'} />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 2 }}>
              {t.totalRemaining}
            </Text>
            <Text style={{ color: budgetData.summary.total_remaining >= 0 ? '#10B981' : '#EF4444', fontSize: 18, fontWeight: '700' }}>
              {formatCurrency(Math.abs(budgetData.summary.total_remaining))}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
              {budgetData.summary.total_remaining >= 0 ? t.left || 'left' : t.over || 'over'}
            </Text>
          </View>

          {/* Budget Count Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <Wallet size={18} color="#8B5CF6" />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 2 }}>
              {t.totalBudgets || 'Total Budgets'}
            </Text>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
              {budgetData.budget_comparison.length}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {budgetsOnTrack > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 3 }} />
                  <Text style={{ color: theme.textSecondary, fontSize: 10 }}>{budgetsOnTrack}</Text>
                </View>
              )}
              {budgetsNear > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B', marginRight: 3 }} />
                  <Text style={{ color: theme.textSecondary, fontSize: 10 }}>{budgetsNear}</Text>
                </View>
              )}
              {budgetsOver > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 3 }} />
                  <Text style={{ color: theme.textSecondary, fontSize: 10 }}>{budgetsOver}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Budget Categories List */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 16,
          }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
              {t.budgetVsActual}
            </Text>
          </View>
          {budgetData.budget_comparison.map((item, index) => (
            <View
              key={index}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                backgroundColor: item.status === 'over'
                  ? theme.isDarkColorScheme ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)'
                  : 'transparent',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Category Icon */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: getCategoryColor(item.category) + '15',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                  <Wallet size={20} color={getCategoryColor(item.category)} />
                </View>

                {/* Budget Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
                      {item.category}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor: getStatusBgColor(item.status),
                      }}>
                      <Text style={{ color: getStatusColor(item.status), fontSize: 11, fontWeight: '600' }}>
                        {formatPercentage(item.percentage)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View
                    style={{
                      height: 8,
                      backgroundColor: theme.isDarkColorScheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      borderRadius: 4,
                      overflow: 'hidden',
                      marginBottom: 6,
                    }}>
                    <View
                      style={{
                        height: '100%',
                        width: `${Math.min(item.percentage, 100)}%`,
                        backgroundColor: getStatusColor(item.status),
                        borderRadius: 4,
                      }}
                    />
                  </View>

                  {/* Amount Details */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                      {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {item.remaining >= 0 ? (
                        <CheckCircle size={12} color="#10B981" />
                      ) : (
                        <AlertCircle size={12} color="#EF4444" />
                      )}
                      <Text
                        style={{
                          color: item.remaining >= 0 ? '#10B981' : '#EF4444',
                          fontSize: 12,
                          fontWeight: '600',
                        }}>
                        {formatCurrency(Math.abs(item.remaining))} {item.remaining >= 0 ? t.left || 'left' : t.over || 'over'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Unbudgeted Spending */}
        {unbudgetedEntries.length > 0 && (
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 16,
            }}>
            <View style={{ padding: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} color="#F59E0B" />
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                  {t.unbudgetedSpending}
                </Text>
              </View>
              <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600' }}>
                {formatCurrency(totalUnbudgeted)}
              </Text>
            </View>
            {unbudgetedEntries.map(([category, amount], index) => (
              <View
                key={category}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Wallet size={16} color="#F59E0B" />
                  </View>
                  <Text style={{ color: theme.text, fontSize: 14 }}>{category}</Text>
                </View>
                <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600' }}>
                  {formatCurrency(amount as number)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  const renderGoalsTab = () => {
    if (!goalData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            {t.loadingGoalData}
          </Text>
        </View>
      );
    }

    if (goalData.goals.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.isDarkColorScheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <Target size={36} color={theme.primary} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {t.noGoalsSet}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}>
            {t.noFinancialGoalsYet}
          </Text>
        </View>
      );
    }

    const getGoalStatusColor = (status: string) => {
      switch (status) {
        case 'completed':
          return '#10B981';
        case 'on_track':
          return '#3B82F6';
        case 'behind':
          return '#F59E0B';
        case 'at_risk':
          return '#EF4444';
        default:
          return '#3B82F6';
      }
    };

    const getGoalStatusBgColor = (status: string) => {
      switch (status) {
        case 'completed':
          return 'rgba(16, 185, 129, 0.1)';
        case 'on_track':
          return 'rgba(59, 130, 246, 0.1)';
        case 'behind':
          return 'rgba(245, 158, 11, 0.1)';
        case 'at_risk':
          return 'rgba(239, 68, 68, 0.1)';
        default:
          return 'rgba(59, 130, 246, 0.1)';
      }
    };

    const getGoalStatusLabel = (status: string) => {
      switch (status) {
        case 'completed':
          return t.completed || 'Completed';
        case 'on_track':
          return t.onTrack || 'On Track';
        case 'behind':
          return t.behind || 'Behind';
        case 'at_risk':
          return t.atRisk || 'At Risk';
        default:
          return status;
      }
    };

    const getGoalStatusIcon = (status: string) => {
      switch (status) {
        case 'completed':
          return <Trophy size={12} color="#10B981" />;
        case 'on_track':
          return <CheckCircle size={12} color="#3B82F6" />;
        case 'behind':
          return <Clock size={12} color="#F59E0B" />;
        case 'at_risk':
          return <AlertCircle size={12} color="#EF4444" />;
        default:
          return <Target size={12} color="#3B82F6" />;
      }
    };

    const getCategoryIcon = (category: string) => {
      const lowerCategory = category?.toLowerCase() || '';
      if (lowerCategory.includes('house') || lowerCategory.includes('home')) {
        return <Wallet size={20} color={getCategoryColor(category)} />;
      } else if (lowerCategory.includes('car') || lowerCategory.includes('vehicle')) {
        return <Wallet size={20} color={getCategoryColor(category)} />;
      } else if (lowerCategory.includes('travel') || lowerCategory.includes('vacation')) {
        return <Wallet size={20} color={getCategoryColor(category)} />;
      } else if (lowerCategory.includes('education')) {
        return <Wallet size={20} color={getCategoryColor(category)} />;
      } else if (lowerCategory.includes('emergency')) {
        return <Wallet size={20} color={getCategoryColor(category)} />;
      } else if (lowerCategory.includes('retirement')) {
        return <Wallet size={20} color={getCategoryColor(category)} />;
      }
      return <Target size={20} color={getCategoryColor(category)} />;
    };

    const overallPercentage = goalData.summary.overall_percentage;
    const completedGoals = goalData.summary.completed_goals;
    const totalGoals = goalData.summary.total_goals;
    const inProgressGoals = totalGoals - completedGoals;

    const goalsOnTrack = goalData.goals.filter(g => g.status === 'on_track').length;
    const goalsBehind = goalData.goals.filter(g => g.status === 'behind' || g.status === 'at_risk').length;

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Overall Progress Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Donut Chart */}
            <View style={{ marginRight: 20 }}>
              <GiftedPieChart
                data={[
                  { value: Math.min(overallPercentage, 100), color: '#10B981' },
                  { value: Math.max(100 - overallPercentage, 0), color: theme.isDarkColorScheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                ]}
                donut
                radius={50}
                innerRadius={38}
                innerCircleColor={theme.cardBackground}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#10B981', fontSize: 18, fontWeight: '700' }}>
                      {Math.round(overallPercentage)}%
                    </Text>
                  </View>
                )}
              />
            </View>

            {/* Summary Info */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                {t.totalSaved}
              </Text>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', marginBottom: 4 }}>
                {formatCurrency(goalData.summary.total_saved)}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.of || 'of'} {formatCurrency(goalData.summary.total_target)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  }}>
                  <Trophy size={10} color="#10B981" />
                  <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '600', marginLeft: 3 }}>
                    {completedGoals} {t.completed || 'completed'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Total Goals Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <Flag size={18} color="#8B5CF6" />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 2 }}>
              {t.totalGoals}
            </Text>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
              {totalGoals}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {inProgressGoals > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6', marginRight: 3 }} />
                  <Text style={{ color: theme.textSecondary, fontSize: 10 }}>{inProgressGoals} {t.active || 'active'}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Remaining Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <Flame size={18} color="#F59E0B" />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 2 }}>
              {t.totalRemaining}
            </Text>
            <Text style={{ color: '#F59E0B', fontSize: 20, fontWeight: '700' }}>
              {formatCurrency(goalData.summary.total_remaining)}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 10, marginTop: 4 }}>
              {t.toReachAllGoals || 'to reach all goals'}
            </Text>
          </View>
        </View>

        {/* Completed Goals Celebration (if any) */}
        {completedGoals > 0 && (
          <View
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              padding: 16,
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.2)',
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              <Trophy size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#10B981', fontSize: 15, fontWeight: '600' }}>
                {completedGoals} {completedGoals === 1 ? t.goalCompleted || 'Goal Completed!' : t.goalsCompleted || 'Goals Completed!'}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                {t.keepUpGreatWork || 'Keep up the great work!'}
              </Text>
            </View>
            <Star size={20} color="#F59E0B" fill="#F59E0B" />
          </View>
        )}

        {/* Goals List */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
              {t.yourGoals}
            </Text>
          </View>
          {goalData.goals.map((goal, index) => {
            const isCompleted = goal.status === 'completed';
            const isOverdue = goal.days_remaining !== null && goal.days_remaining < 0;

            return (
              <View
                key={goal.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  backgroundColor: isCompleted
                    ? theme.isDarkColorScheme ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.03)'
                    : 'transparent',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {/* Goal Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: getGoalStatusBgColor(goal.status),
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                    {isCompleted ? (
                      <Trophy size={20} color="#10B981" />
                    ) : (
                      getCategoryIcon(goal.category)
                    )}
                  </View>

                  {/* Goal Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15, flex: 1 }} numberOfLines={1}>
                        {goal.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 10,
                          backgroundColor: getGoalStatusBgColor(goal.status),
                          marginLeft: 8,
                        }}>
                        {getGoalStatusIcon(goal.status)}
                        <Text style={{ color: getGoalStatusColor(goal.status), fontSize: 10, fontWeight: '600', marginLeft: 3 }}>
                          {formatPercentage(goal.percentage)}
                        </Text>
                      </View>
                    </View>

                    {/* Category & Description */}
                    {(goal.category || goal.description) && (
                      <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }} numberOfLines={1}>
                        {goal.category}{goal.description ? ` • ${goal.description}` : ''}
                      </Text>
                    )}

                    {/* Progress Bar */}
                    <View
                      style={{
                        height: 8,
                        backgroundColor: theme.isDarkColorScheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        borderRadius: 4,
                        overflow: 'hidden',
                        marginBottom: 8,
                      }}>
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.min(goal.percentage, 100)}%`,
                          backgroundColor: getGoalStatusColor(goal.status),
                          borderRadius: 4,
                        }}
                      />
                    </View>

                    {/* Amount & Days */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                      </Text>
                      {goal.days_remaining !== null && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 10,
                            backgroundColor: isOverdue
                              ? 'rgba(239, 68, 68, 0.1)'
                              : goal.days_remaining <= 30
                                ? 'rgba(245, 158, 11, 0.1)'
                                : 'rgba(107, 114, 128, 0.1)',
                          }}>
                          <Clock size={10} color={isOverdue ? '#EF4444' : goal.days_remaining <= 30 ? '#F59E0B' : theme.textSecondary} />
                          <Text
                            style={{
                              color: isOverdue ? '#EF4444' : goal.days_remaining <= 30 ? '#F59E0B' : theme.textSecondary,
                              fontSize: 10,
                              fontWeight: '500',
                            }}>
                            {isOverdue
                              ? `${Math.abs(goal.days_remaining)} ${t.daysOverdue || 'days overdue'}`
                              : goal.days_remaining === 0
                                ? t.dueToday || 'Due today'
                                : `${goal.days_remaining} ${t.daysLeft || 'days left'}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
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
              fontWeight: '600',
              marginTop: 16,
              textAlign: 'center',
            }}>
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
            {t.loadingSubscriptionData}
          </Text>
        </View>
      );
    }

    if (subscriptionData.subscriptions.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.isDarkColorScheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <RefreshCw size={36} color={theme.primary} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {t.noSubscriptionsFound}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}>
            {t.noActiveSubscriptionsYet}
          </Text>
        </View>
      );
    }

    const getStatusIcon = (status: string) => {
      switch (status.toLowerCase()) {
        case 'active':
          return <CheckCircle size={14} color="#10B981" />;
        case 'paused':
          return <PauseCircle size={14} color="#F59E0B" />;
        case 'cancelled':
          return <AlertCircle size={14} color="#EF4444" />;
        default:
          return <CheckCircle size={14} color="#10B981" />;
      }
    };

    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'active':
          return '#10B981';
        case 'paused':
          return '#F59E0B';
        case 'cancelled':
          return '#EF4444';
        default:
          return '#10B981';
      }
    };

    const getBillingIcon = (cycle: string) => {
      switch (cycle.toLowerCase()) {
        case 'weekly':
          return <Clock size={12} color={theme.textSecondary} />;
        case 'monthly':
          return <Calendar size={12} color={theme.textSecondary} />;
        case 'yearly':
          return <TrendingUp size={12} color={theme.textSecondary} />;
        default:
          return <RefreshCw size={12} color={theme.textSecondary} />;
      }
    };

    const categoryBreakdown = subscriptionData.category_breakdown || {};
    const categoryColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
    const pieData = Object.entries(categoryBreakdown).map(([category, amount], index) => ({
      value: amount as number,
      color: categoryColors[index % categoryColors.length],
      text: category,
    }));

    const isUpcoming = (nextBilling: string) => {
      if (!nextBilling) return false;
      const billingDate = new Date(nextBilling);
      const today = new Date();
      const diffDays = Math.ceil((billingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    };

    const getDaysUntilBilling = (nextBilling: string) => {
      if (!nextBilling) return null;
      const billingDate = new Date(nextBilling);
      const today = new Date();
      const diffDays = Math.ceil((billingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Summary Cards Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Monthly Cost Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
              <CreditCard size={20} color="#3B82F6" />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
              {t.monthlyCost}
            </Text>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
              {formatCurrency(subscriptionData.summary.monthly_cost)}
            </Text>
          </View>

          {/* Yearly Cost Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
              <TrendingUp size={20} color="#10B981" />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
              {t.yearlyCost || 'Yearly Cost'}
            </Text>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
              {formatCurrency(subscriptionData.summary.yearly_cost)}
            </Text>
          </View>
        </View>

        {/* Active Count & Total Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Zap size={24} color="#8B5CF6" />
              </View>
              <View>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {t.activeSubscriptions}
                </Text>
                <Text style={{ color: theme.text, fontSize: 24, fontWeight: '700' }}>
                  {subscriptionData.summary.active_subscriptions}
                  <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '400' }}>
                    {' '}/ {subscriptionData.summary.total_subscriptions}
                  </Text>
                </Text>
              </View>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
              }}>
              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>
                {t.active || 'Active'}
              </Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown with Pie Chart */}
        {pieData.length > 0 && (
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
              {t.categoryBreakdown}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <GiftedPieChart
                  data={pieData}
                  donut
                  radius={60}
                  innerRadius={40}
                  innerCircleColor={theme.cardBackground}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
                        {pieData.length}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
                        {t.categories || 'Categories'}
                      </Text>
                    </View>
                  )}
                />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                {pieData.slice(0, 4).map((item, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: item.color,
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, flex: 1 }} numberOfLines={1}>
                      {item.text}
                    </Text>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
                      {formatCurrency(item.value)}
                    </Text>
                  </View>
                ))}
                {pieData.length > 4 && (
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                    +{pieData.length - 4} {t.more || 'more'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Subscriptions List */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
              {t.allSubscriptions || 'All Subscriptions'}
            </Text>
          </View>
          {subscriptionData.subscriptions.map((sub, index) => {
            const daysUntil = getDaysUntilBilling(sub.next_billing);
            const upcoming = isUpcoming(sub.next_billing);

            return (
              <View
                key={sub.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  backgroundColor: upcoming
                    ? theme.isDarkColorScheme
                      ? 'rgba(245, 158, 11, 0.05)'
                      : 'rgba(245, 158, 11, 0.03)'
                    : 'transparent',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Category Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: getCategoryColor(sub.category) + '15',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                    <RefreshCw size={20} color={getCategoryColor(sub.category)} />
                  </View>

                  {/* Subscription Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: '600',
                          fontSize: 15,
                        }}
                        numberOfLines={1}>
                        {sub.name}
                      </Text>
                      {getStatusIcon(sub.status)}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {getBillingIcon(sub.billing_cycle)}
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          {sub.billing_cycle}
                        </Text>
                      </View>
                      <Text style={{ color: theme.textMuted }}>•</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                        {sub.category}
                      </Text>
                    </View>
                  </View>

                  {/* Price & Next Billing */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontWeight: '700',
                        fontSize: 16,
                      }}>
                      {formatCurrency(sub.cost)}
                    </Text>
                    {upcoming && daysUntil !== null && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 10,
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        }}>
                        <Clock size={10} color="#F59E0B" />
                        <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '600' }}>
                          {daysUntil === 0
                            ? t.today || 'Today'
                            : daysUntil === 1
                              ? t.tomorrow || 'Tomorrow'
                              : `${daysUntil} ${t.days || 'days'}`}
                        </Text>
                      </View>
                    )}
                    {!upcoming && (
                      <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                        {formatCurrency(sub.monthly_equivalent)}/{t.mo || 'mo'}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  const renderInvestmentsTab = () => {
    if (!investmentData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            {t.loadingInvestmentData || 'Loading investment data...'}
          </Text>
        </View>
      );
    }

    if (investmentData.investments.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.isDarkColorScheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <Briefcase size={36} color={theme.primary} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {t.noInvestmentsFound || 'No Investments Found'}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}>
            {t.noInvestmentsYet || 'Start tracking your investments to see them here.'}
          </Text>
        </View>
      );
    }

    const { summary, investments, type_breakdown } = investmentData;
    const isPositive = summary.total_gain_loss >= 0;

    const pieData = Object.entries(type_breakdown).map(([type, data], index) => {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
      return {
        value: data.current,
        color: colors[index % colors.length],
        text: type,
      };
    });

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Portfolio Summary Card */}
        <View
          style={{
            backgroundColor: isPositive ? '#10B981' : '#EF4444',
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              <Briefcase size={20} color="#FFFFFF" />
            </View>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
              {t.portfolioValue || 'Portfolio Value'}
            </Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '700' }}>
            {formatCurrency(summary.total_current_value)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isPositive ? (
                <TrendingUp size={16} color="#FFFFFF" />
              ) : (
                <TrendingDown size={16} color="#FFFFFF" />
              )}
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 4 }}>
                {isPositive ? '+' : ''}{formatCurrency(summary.total_gain_loss)} ({summary.gain_loss_percentage.toFixed(1)}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Total Invested Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <CircleDollarSign size={18} color="#3B82F6" />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 2 }}>
              {t.totalInvested || 'Total Invested'}
            </Text>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
              {formatCurrency(summary.total_invested)}
            </Text>
          </View>

          {/* Investments Count Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <Briefcase size={18} color="#8B5CF6" />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 2 }}>
              {t.totalInvestments || 'Total Investments'}
            </Text>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
              {summary.total_investments}
            </Text>
          </View>
        </View>

        {/* Type Distribution Chart */}
        {pieData.length > 0 && (
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
              {t.investmentsByType || 'Investments by Type'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <GiftedPieChart
                  data={pieData}
                  donut
                  radius={60}
                  innerRadius={40}
                  innerCircleColor={theme.cardBackground}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                        {pieData.length}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
                        {t.types || 'Types'}
                      </Text>
                    </View>
                  )}
                />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                {pieData.map((item, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: item.color,
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 12, flex: 1 }} numberOfLines={1}>
                      {item.text}
                    </Text>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
                      {formatCurrency(item.value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Investments List */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
              {t.allInvestments || 'All Investments'}
            </Text>
          </View>
          {investments.map((inv) => {
            const isGain = inv.gain_loss >= 0;

            return (
              <View
                key={inv.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Investment Icon */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: isGain ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                    {isGain ? (
                      <TrendingUp size={22} color="#10B981" />
                    ) : (
                      <TrendingDown size={22} color="#EF4444" />
                    )}
                  </View>

                  {/* Investment Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
                        {inv.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: '700',
                          fontSize: 16,
                        }}>
                        {formatCurrency(inv.current_value)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                          }}>
                          <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '500' }}>
                            {inv.type}
                          </Text>
                        </View>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          {t.invested || 'Invested'}: {formatCurrency(inv.invested_amount)}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                          backgroundColor: isGain ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        }}>
                        <Text style={{ color: isGain ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '600' }}>
                          {isGain ? '+' : ''}{inv.gain_loss_percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  const renderLoansTab = () => {
    if (!loanData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            {t.loadingLoanData || 'Loading loan data...'}
          </Text>
        </View>
      );
    }

    if (loanData.loans.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.isDarkColorScheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <HandCoins size={36} color={theme.primary} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {t.noLoansFound || 'No Loans Found'}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}>
            {t.noLoansYet || 'Track your loans given and taken here.'}
          </Text>
        </View>
      );
    }

    const { summary, loans, repayment_history } = loanData;
    const netPositive = summary.net_position >= 0;

    const loansGiven = loans.filter(l => l.type === 'loan_given');
    const loansTaken = loans.filter(l => l.type === 'loan_taken');
    const overdueLoans = loans.filter(l => l.is_overdue);

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Net Position Card */}
        <View
          style={{
            backgroundColor: netPositive ? '#10B981' : '#EF4444',
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              <Scale size={20} color="#FFFFFF" />
            </View>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
              {t.netPosition || 'Net Position'}
            </Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '700' }}>
            {netPositive ? '+' : ''}{formatCurrency(summary.net_position)}
          </Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13, marginTop: 4 }}>
            {netPositive
              ? (t.othersOweYou || 'Others owe you more')
              : (t.youOweOthers || 'You owe others more')}
          </Text>
        </View>

        {/* Loans Given vs Taken Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Loans Given Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}>
                <ArrowUpRight size={16} color="#10B981" />
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {t.loansGiven || 'Loans Given'}
              </Text>
            </View>
            <Text style={{ color: '#10B981', fontSize: 18, fontWeight: '700' }}>
              {formatCurrency(summary.total_outstanding_given)}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              {summary.loans_given} {t.loans || 'loans'} • {t.outstanding || 'outstanding'}
            </Text>
          </View>

          {/* Loans Taken Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}>
                <ArrowDownRight size={16} color="#EF4444" />
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {t.loansTaken || 'Loans Taken'}
              </Text>
            </View>
            <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700' }}>
              {formatCurrency(summary.total_outstanding_taken)}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              {summary.loans_taken} {t.loans || 'loans'} • {t.outstanding || 'outstanding'}
            </Text>
          </View>
        </View>

        {/* Overdue Warning */}
        {overdueLoans.length > 0 && (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              padding: 16,
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.2)',
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              <AlertCircle size={22} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '600' }}>
                {overdueLoans.length} {t.overdueLoans || 'Overdue Loans'}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                {t.requiresAttention || 'Requires your attention'}
              </Text>
            </View>
          </View>
        )}

        {/* Loans List */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 16,
          }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
              {t.allLoans || 'All Loans'}
            </Text>
          </View>
          {loans.map((loan) => {
            const isGiven = loan.type === 'loan_given';
            const progressPercent = loan.principal_amount > 0
              ? ((loan.paid_amount / loan.principal_amount) * 100)
              : 0;

            return (
              <View
                key={loan.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  backgroundColor: loan.is_overdue
                    ? theme.isDarkColorScheme ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)'
                    : 'transparent',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {/* Person Icon */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isGiven ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                    <Users size={22} color={isGiven ? '#10B981' : '#EF4444'} />
                  </View>

                  {/* Loan Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
                        {loan.party_name}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                          backgroundColor: isGiven ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        }}>
                        <Text style={{ color: isGiven ? '#10B981' : '#EF4444', fontSize: 10, fontWeight: '600' }}>
                          {isGiven ? (t.given || 'GIVEN') : (t.taken || 'TAKEN')}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View
                      style={{
                        height: 6,
                        backgroundColor: theme.isDarkColorScheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        borderRadius: 3,
                        overflow: 'hidden',
                        marginBottom: 6,
                      }}>
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.min(progressPercent, 100)}%`,
                          backgroundColor: loan.status === 'settled' ? '#10B981' : isGiven ? '#3B82F6' : '#F59E0B',
                          borderRadius: 3,
                        }}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                        {formatCurrency(loan.paid_amount)} / {formatCurrency(loan.principal_amount)}
                      </Text>
                      <Text
                        style={{
                          color: loan.status === 'settled' ? '#10B981' : theme.text,
                          fontWeight: '600',
                          fontSize: 14,
                        }}>
                        {formatCurrency(loan.remaining_amount)} {t.left || 'left'}
                      </Text>
                    </View>

                    {/* Due Date & Status */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                          backgroundColor:
                            loan.status === 'settled'
                              ? 'rgba(16, 185, 129, 0.1)'
                              : loan.status === 'partial'
                                ? 'rgba(245, 158, 11, 0.1)'
                                : 'rgba(59, 130, 246, 0.1)',
                        }}>
                        <Text
                          style={{
                            color:
                              loan.status === 'settled'
                                ? '#10B981'
                                : loan.status === 'partial'
                                  ? '#F59E0B'
                                  : '#3B82F6',
                            fontSize: 10,
                            fontWeight: '600',
                          }}>
                          {loan.status === 'settled'
                            ? (t.settled || 'Settled')
                            : loan.status === 'partial'
                              ? (t.partial || 'Partial')
                              : (t.active || 'Active')}
                        </Text>
                      </View>
                      {loan.due_date && loan.status !== 'settled' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} color={loan.is_overdue ? '#EF4444' : theme.textSecondary} />
                          <Text
                            style={{
                              color: loan.is_overdue ? '#EF4444' : theme.textSecondary,
                              fontSize: 11,
                            }}>
                            {loan.is_overdue
                              ? `${Math.abs(loan.days_until_due || 0)} ${t.daysOverdue || 'days overdue'}`
                              : loan.days_until_due === 0
                                ? (t.dueToday || 'Due today')
                                : `${loan.days_until_due} ${t.daysLeft || 'days left'}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Recent Repayments */}
        {repayment_history.length > 0 && (
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border,
            }}>
            <View style={{ padding: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <History size={18} color={theme.primary} />
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                {t.recentRepayments || 'Recent Repayments'}
              </Text>
            </View>
            {repayment_history.slice(0, 5).map((repayment, index) => (
              <View
                key={`${repayment.loan_id}-${index}`}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <View>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>
                    {repayment.party_name}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {formatDate(repayment.payment_date)}
                  </Text>
                </View>
                <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '600' }}>
                  +{formatCurrency(repayment.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'transactions':
        return renderTransactionTab();
      case 'accounts':
        return renderAccountsTab();
      case 'budgets':
        return renderBudgetsTab();
      case 'goals':
        return renderGoalsTab();
      case 'subscriptions':
        return renderSubscriptionsTab();
      case 'investments':
        return renderInvestmentsTab();
      case 'loans':
        return renderLoansTab();
      default:
        return renderTransactionTab();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <View className="flex-row justify-between items-center">
            <Text
              style={{ color: theme.text, fontSize: 20, fontWeight: '600' }}>
              {activeTab === 'transactions' && t.transactionReports}
              {activeTab === 'subscriptions' && t.subscriptionReports}
              {activeTab === 'budgets' && t.budgetReports}
              {activeTab === 'goals' && t.goalReports}
              {activeTab === 'accounts' && t.accountReports}
              {activeTab === 'investments' && (t.investmentReports || 'Investment Reports')}
              {activeTab === 'loans' && (t.loanReports || 'Loan Reports')}
            </Text>
          </View>

          {/* Date Range - tap to open bottom sheet */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <TouchableOpacity
              style={{
                backgroundColor: theme.background,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={toggleRangePicker}
              disabled={loading}>
              <Calendar size={16} color={theme.primary} />
              <Text
                style={{
                  marginLeft: 8,
                  color: theme.text,
                  fontSize: 13,
                }}>
                {formatDate(dateRange.startDate.toISOString())} – {formatDate(dateRange.endDate.toISOString())}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => toggleDownloadMenu(true)}
              disabled={
                loading ||
                !(
                  (transactionData && activeTab === 'transactions') ||
                  (subscriptionData && activeTab === 'subscriptions') ||
                  (budgetData && activeTab === 'budgets') ||
                  (goalData && activeTab === 'goals') ||
                  (accountData && activeTab === 'accounts')
                )
              }>
              <Download size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation - scrollable, scrolls to active tab on change */}
        <View
          style={{
            backgroundColor: theme.background,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <ScrollView
            ref={tabsScrollRef}
            onLayout={(e) => {
              tabsScrollWidthRef.current = e.nativeEvent.layout.width;
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {(
              [
                { key: 'transactions' as const, label: t.transactions },
                { key: 'subscriptions' as const, label: t.subscriptions },
                { key: 'budgets' as const, label: t.budgets },
                { key: 'goals' as const, label: t.goals },
                { key: 'accounts' as const, label: t.accounts },
                { key: 'investments' as const, label: t.investments || 'Investments' },
                { key: 'loans' as const, label: t.loans || 'Loans' },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={1}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    tabLayoutsRef.current[tab.key] = { x, width };
                    if (
                      activeTab === tab.key &&
                      tabsScrollRef.current &&
                      tabsScrollWidthRef.current > 0
                    ) {
                      const w = tabsScrollWidthRef.current;
                      const targetX = Math.max(
                        0,
                        x - w / 2 + width / 2,
                      );
                      tabsScrollRef.current.scrollTo({
                        x: targetX,
                        animated: true,
                      });
                    }
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: isActive ? '#00BFFF' : theme.background,
                  }}
                  onPress={() => {
                    void playTabClickSound();
                    setActiveTab(tab.key);
                  }}>
                  <Text
                    style={{
                      color: isActive ? 'white' : theme.text,
                      fontWeight: '500',
                      fontSize: 14,
                    }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content - swipe left/right to change tab */}
        <View
          style={{ flex: 1, backgroundColor: 'transparent', paddingHorizontal: 16, paddingTop: 16 }}
          {...panResponder.panHandlers}>
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

        {/* Download Menu Modal */}
        <Modal
          transparent={true}
          animationType="fade"
          visible={downloadMenuVisible}
          onRequestClose={() => toggleDownloadMenu(false)}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={1}
            onPress={() => toggleDownloadMenu(false)}>
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
                padding: 20,
                width: screenWidth - 80,
                maxWidth: 300,
              }}
              onStartShouldSetResponder={() => true}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginBottom: 16,
                  textAlign: 'center',
                }}>
                {t.exportReport || 'Export Report'}
              </Text>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.background,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => {
                  toggleDownloadMenu(false);
                  setTimeout(() => handleDownload('pdf'), 100);
                }}>
                <FileText size={20} color={theme.primary} />
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: '600',
                    marginLeft: 12,
                  }}>
                  {t.pdfReport || 'PDF Report'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.background,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => {
                  toggleDownloadMenu(false);
                  setTimeout(() => handleDownload('csv'), 100);
                }}>
                <Download size={20} color={theme.primary} />
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: '600',
                    marginLeft: 12,
                  }}>
                  {t.csvData || 'CSV Data'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.cardBackground,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => toggleDownloadMenu(false)}>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}>
                  {t.cancel || 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Date range bottom sheet */}
        <Modal
          visible={rangePickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setRangePickerVisible(false)}
          statusBarTranslucent>
          <Pressable
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
            onPress={() => setRangePickerVisible(false)}>
            <Pressable
              style={{
                maxHeight: '85%',
                backgroundColor: theme.cardBackground,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                overflow: 'hidden',
              }}
              onPress={(e) => e.stopPropagation()}>
              <View
                style={{
                  paddingTop: 12,
                  paddingBottom: 8,
                  alignItems: 'center',
                }}>
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.border,
                  }}
                />
              </View>
              <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 18,
                      fontWeight: '700',
                    }}>
                    {t.selectDateRange || 'Select date range'}
                  </Text>
                  <TouchableOpacity onPress={() => setRangePickerVisible(false)}>
                    <X size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="range"
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={(params) => {
                    setDateRange({
                      startDate: params.startDate
                        ? new Date(params.startDate as string | number | Date)
                        : dateRange.startDate,
                      endDate: params.endDate
                        ? new Date(params.endDate as string | number | Date)
                        : dateRange.endDate,
                    });
                  }}
                  minDate={new Date(2020, 0, 1)}
                  maxDate={new Date()}
                  showOutsideDays
                  containerHeight={280}
                  components={{
                    IconPrev: <ChevronLeft size={20} color={theme.text} />,
                    IconNext: <ChevronRight size={20} color={theme.text} />,
                  } as CalendarComponents}
                  styles={{
                    ...defaultDatePickerStyles,
                    range_fill: { backgroundColor: `${theme.primary}30` },
                    range_fill_weekstart: {
                      borderTopLeftRadius: 8,
                      borderBottomLeftRadius: 8,
                    },
                    range_fill_weekend: {
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                    },
                    range_start: { backgroundColor: theme.primary },
                    range_end: { backgroundColor: theme.primary },
                    range_start_label: { color: theme.primaryText },
                    range_end_label: { color: theme.primaryText },
                    range_middle_label: { color: theme.text },
                  }}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
