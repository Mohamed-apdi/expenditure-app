import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import {
  Calendar,
  Filter,
  Wallet,
  X,
  FileText,
  Download,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarChart, PieChart as ChartKitPieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccount } from '~/lib';
import { supabase } from '~/lib';
import {
  getLocalTransactionReports,
  getLocalAccountReports,
  getLocalBudgetReports,
  getLocalGoalReports,
  getLocalSubscriptionReports,
  formatCurrency,
  formatPercentage,
  formatDate,
  type TransactionReport,
  type AccountReport,
  type BudgetReport,
  type GoalReport,
  type SubscriptionReport,
} from '~/lib/services/localReports';
import { getCategoryColor, getColorByIndex } from '~/lib';
import { generatePDFReport, sharePDF } from '~/lib/generators/pdfGenerator';
import { generateCSVReport, shareCSV } from '~/lib/generators/csvGenerator';
import { useTheme } from '~/lib';
import { useLanguage } from '~/lib';

const { width: screenWidth } = Dimensions.get('window');

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
    getDefaultDateRange(),
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>(
    'start',
  );
  const [downloadMenuVisible, setDownloadMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<
    'transactions' | 'accounts' | 'budgets' | 'goals' | 'subscriptions'
  >('transactions');

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

  // Memoized bar chart data
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

  const fetchTransactionReports = useCallback(async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const startDateStr = dateRange.startDate.toISOString().split('T')[0];
      const endDateStr = dateRange.endDate.toISOString().split('T')[0];

      const data = await getLocalTransactionReports(
        user.id,
        selectedAccount?.id,
        startDateStr,
        endDateStr,
      );

      // Debug the received data
      if (!data) {
        console.error('❌ No data received from local function');
      }

      setTransactionData(data);
      setIsInitialLoad(false);
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

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const data = await getLocalAccountReports(user.id, selectedAccount?.id);
      setAccountData(data);
      setIsInitialLoad(false);
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

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const data = await getLocalBudgetReports(
        user.id,
        dateRange.startDate.toISOString().split('T')[0],
        dateRange.endDate.toISOString().split('T')[0],
        selectedAccount?.id,
      );
      setBudgetData(data);
      setIsInitialLoad(false);
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

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const data = await getLocalGoalReports(user.id);
      setGoalData(data);
      setIsInitialLoad(false);
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

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const data = await getLocalSubscriptionReports(
        user.id,
        selectedAccount?.id,
      );
      setSubscriptionData(data);
      setIsInitialLoad(false);
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
    if (selectedAccount || activeTab === 'goals' || activeTab === 'accounts') {
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
          Alert.alert(
            t.pdfGenerated,
            `${t.reportSavedToDocuments}:\n${filePath}`,
            [
              {
                text: t.share,
                onPress: async () => {
                  try {
                    await sharePDF(filePath);
                  } catch (error) {
                    console.error('Error sharing PDF:', error);
                    Alert.alert(t.error, t.failedToSharePdf);
                  }
                },
              },
              { text: t.ok, style: 'default' },
            ],
          );
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
          Alert.alert(
            t.csvGenerated,
            `${t.reportSavedToDocuments}:\n${filePath}`,
            [
              {
                text: t.share,
                onPress: async () => {
                  try {
                    await shareCSV(filePath);
                  } catch (error) {
                    console.error('Error sharing CSV:', error);
                    Alert.alert(t.error, t.failedToShareCsv);
                  }
                },
              },
              { text: t.ok, style: 'default' },
            ],
          );
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
          Alert.alert(
            t.pdfGenerated,
            `${t.reportSavedToDocuments}:\n${filePath}`,
            [
              {
                text: t.share,
                onPress: async () => {
                  try {
                    await sharePDF(filePath);
                  } catch (error) {
                    console.error('Error sharing PDF:', error);
                    Alert.alert(t.error, t.failedToSharePdf);
                  }
                },
              },
              { text: t.ok, style: 'default' },
            ],
          );
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
          Alert.alert(
            t.csvGenerated,
            `${t.reportSavedToDocuments}:\n${filePath}`,
            [
              {
                text: t.share,
                onPress: async () => {
                  try {
                    await shareCSV(filePath);
                  } catch (error) {
                    console.error('Error sharing CSV:', error);
                    Alert.alert(t.error, t.failedToShareCsv);
                  }
                },
              },
              { text: t.ok, style: 'default' },
            ],
          );
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
          Alert.alert(
            t.pdfGenerated,
            `${t.reportSavedToDocuments}:\n${filePath}`,
            [
              {
                text: t.share,
                onPress: async () => {
                  try {
                    await sharePDF(filePath);
                  } catch (error) {
                    console.error('Error sharing PDF:', error);
                    Alert.alert(t.error, t.failedToSharePdf);
                  }
                },
              },
              { text: t.ok, style: 'default' },
            ],
          );
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
          Alert.alert(
            t.csvGenerated,
            `${t.reportSavedToDocuments}:\n${filePath}`,
            [
              {
                text: t.share,
                onPress: async () => {
                  try {
                    await shareCSV(filePath);
                  } catch (error) {
                    console.error('Error sharing CSV:', error);
                    Alert.alert(t.error, t.failedToShareCsv);
                  }
                },
              },
              { text: t.ok, style: 'default' },
            ],
          );
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
          Alert.alert(
            t.pdfGenerated,
            `${t.reportSavedToDocuments}:\n${filePath}`,
            [
              {
                text: t.share,
                onPress: async () => {
                  try {
                    await sharePDF(filePath);
                  } catch (error) {
                    console.error('Error sharing PDF:', error);
                    Alert.alert(t.error, t.failedToSharePdf);
                  }
                },
              },
              { text: t.ok, style: 'default' },
            ],
          );
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
          Alert.alert(
            t.csvGenerated,
            `${t.reportSavedToDocuments}:\n${filePath}`,
            [
              {
                text: t.share,
                onPress: async () => {
                  try {
                    await shareCSV(filePath);
                  } catch (error) {
                    console.error('Error sharing CSV:', error);
                    Alert.alert(t.error, t.failedToShareCsv);
                  }
                },
              },
              { text: t.ok, style: 'default' },
            ],
          );
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
                  formatCurrency(Math.abs(trend.amount)),
                ]),
            },
          ],
        };

        const filePath = await generatePDFReport(pdfData);

        Alert.alert(
          t.pdfGenerated,
          `${t.reportSavedToDocuments}:\n${filePath}`,
          [
            {
              text: t.share,
              onPress: async () => {
                try {
                  await sharePDF(filePath);
                } catch (error) {
                  console.error('Error sharing PDF:', error);
                  Alert.alert(t.error, t.failedToSharePdf);
                }
              },
            },
            { text: t.ok, style: 'default' },
          ],
        );
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
                Math.abs(trend.amount).toString(),
              ]),
            },
          ],
        };

        const filePath = await generateCSVReport(csvData);

        Alert.alert(
          t.csvGenerated,
          `${t.reportSavedToDocuments}:\n${filePath}`,
          [
            {
              text: t.share,
              onPress: async () => {
                try {
                  await shareCSV(filePath);
                } catch (error) {
                  console.error('Error sharing CSV:', error);
                  Alert.alert(t.error, t.failedToShareCsv);
                }
              },
            },
            { text: t.ok, style: 'default' },
          ],
        );
      }
    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()} report:`, error);
      Alert.alert(t.error, `Failed to generate ${format.toUpperCase()} report`);
    } finally {
      setLoading(false);
    }
  };

  // Date picker callbacks
  const onDismiss = useCallback(() => setDatePickerVisible(false), []);

  const onDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setDatePickerVisible(false);
      }

      if (selectedDate) {
        if (datePickerMode === 'start') {
          setPendingDateRange((prev) => ({ ...prev, startDate: selectedDate }));
        } else {
          setPendingDateRange((prev) => ({ ...prev, endDate: selectedDate }));
        }
      }
    },
    [datePickerMode],
  );

  const confirmIOSDate = useCallback(() => {
    setDatePickerVisible(false);
  }, []);

  // Function to apply pending date changes and refresh data
  const handleSubmitDateRange = useCallback(() => {
    setDateRange(pendingDateRange);
  }, [pendingDateRange]);

  const openDatePicker = useCallback((mode: 'start' | 'end') => {
    setDatePickerMode(mode);
    setDatePickerVisible(true);
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
              fontWeight: '600',
              marginTop: 16,
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

    // Check if there's no data for the selected period
    if (transactionData.summary.total_transactions === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <FileText size={48} color={theme.textMuted} />
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              marginTop: 16,
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
          }}>
          <View className="flex-row justify-between items-center mb-3">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.income}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#059669',
                  marginTop: 2,
                }}>
                {formatCurrency(transactionData.summary.total_income)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.expenses}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#dc2626',
                  marginTop: 2,
                }}>
                {formatCurrency(transactionData.summary.total_expenses)}
              </Text>
            </View>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              paddingTop: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text
              style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>
              {t.netAmount}
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color:
                  transactionData.summary.total_amount >= 0
                    ? '#059669'
                    : '#dc2626',
              }}>
              {formatCurrency(transactionData.summary.total_amount)}
            </Text>
          </View>
        </View>

        {/* Spending by Category */}
        <View
          style={{
            marginBottom: 16,
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 12,
            }}>
            {t.spendingByCategory}
          </Text>
          {pieChartData.length > 0 ? (
            <>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
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
                textAlign: 'center',
                paddingVertical: 24,
              }}>
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
                textAlign: 'center',
                paddingVertical: 24,
              }}>
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
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 12,
            }}>
            {t.categoryBreakdown}
          </Text>
          {Object.entries(transactionData.category_breakdown).map(
            ([category, data], index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth:
                    index <
                    Object.keys(transactionData.category_breakdown).length - 1
                      ? 1
                      : 0,
                  borderBottomColor: theme.border,
                }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: '500',
                      fontSize: 14,
                    }}>
                    {translateCategory(category)}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}>
                    {data.count} {t.transactionsCount}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: '600',
                      fontSize: 15,
                    }}>
                    {formatCurrency(data.amount)}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}>
                    {formatPercentage(data.percentage)}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>
      </ScrollView>
    );
  };

  const renderAccountsTab = () => {
    if (!accountData) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            Loading account data...
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
              fontWeight: '600',
              marginTop: 16,
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

    return (
      <ScrollView className="flex-1">
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            {t.totalBalance}
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: theme.text,
              marginTop: 4,
            }}>
            {formatCurrency(accountData.summary.total_balance)}
          </Text>
        </View>

        {/* Account Details */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 12,
            }}>
            {t.accountDetails}
          </Text>
          {accountData.accounts.map((account, index) => (
            <View
              key={account.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth:
                  index < accountData.accounts.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}>
              <View className="flex-row justify-between items-center">
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: '500',
                      fontSize: 14,
                    }}>
                    {account.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}>
                    {account.type} • {account.transaction_count} transactions
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: '600',
                    fontSize: 16,
                  }}>
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
              fontWeight: '600',
              marginTop: 16,
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

    return (
      <ScrollView className="flex-1">
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}>
          <View className="flex-row justify-between items-center">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.totalBudget}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: theme.text,
                  marginTop: 2,
                }}>
                {formatCurrency(budgetData.summary.total_budget)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.totalSpent}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#dc2626',
                  marginTop: 2,
                }}>
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
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 12,
            }}>
            {t.budgetVsActual}
          </Text>
          {budgetData.budget_comparison.map((item, index) => (
            <View
              key={index}
              style={{
                paddingVertical: 10,
                borderBottomWidth:
                  index < budgetData.budget_comparison.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}>
              <View className="flex-row justify-between items-center mb-2">
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                  {item.category}
                </Text>
                <Text
                  style={{
                    color:
                      item.status === 'over'
                        ? '#dc2626'
                        : item.status === 'near'
                          ? '#f59e0b'
                          : '#059669',
                    fontWeight: '600',
                    fontSize: 14,
                  }}>
                  {formatPercentage(item.percentage)}
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: theme.background,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(item.percentage, 100)}%`,
                    backgroundColor:
                      item.status === 'over'
                        ? '#dc2626'
                        : item.status === 'near'
                          ? '#f59e0b'
                          : '#059669',
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                </Text>
                <Text
                  style={{
                    color: item.remaining >= 0 ? '#059669' : '#dc2626',
                    fontSize: 11,
                  }}>
                  {formatCurrency(Math.abs(item.remaining))}{' '}
                  {item.remaining >= 0 ? 'left' : 'over'}
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
              fontWeight: '600',
              marginTop: 16,
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

    return (
      <ScrollView className="flex-1">
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}>
          <View className="flex-row justify-between items-center">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.totalTarget}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: theme.text,
                  marginTop: 2,
                }}>
                {formatCurrency(goalData.summary.total_target)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.totalSaved}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#059669',
                  marginTop: 2,
                }}>
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
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 12,
            }}>
            {t.yourGoals}
          </Text>
          {goalData.goals.map((goal, index) => (
            <View
              key={goal.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth: index < goalData.goals.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}>
              <View className="flex-row justify-between items-center mb-2">
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                  {goal.name}
                </Text>
                <Text
                  style={{
                    color:
                      goal.status === 'completed'
                        ? '#059669'
                        : goal.status === 'on_track'
                          ? '#3b82f6'
                          : '#f59e0b',
                    fontWeight: '600',
                    fontSize: 14,
                  }}>
                  {formatPercentage(goal.percentage)}
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: theme.background,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(goal.percentage, 100)}%`,
                    backgroundColor:
                      goal.status === 'completed'
                        ? '#059669'
                        : goal.status === 'on_track'
                          ? '#3b82f6'
                          : '#f59e0b',
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {formatCurrency(goal.current_amount)} /{' '}
                  {formatCurrency(goal.target_amount)}
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

    // Check if there's no subscription data
    if (subscriptionData.subscriptions.length === 0) {
      return (
        <View className="flex-1 justify-center items-center p-8">
          <FileText size={48} color={theme.textMuted} />
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
              marginTop: 16,
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

    return (
      <ScrollView className="flex-1">
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}>
          <View className="flex-row justify-between items-center">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.monthlyCost}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: theme.text,
                  marginTop: 2,
                }}>
                {formatCurrency(subscriptionData.summary.monthly_cost)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.activeCount}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: theme.primary,
                  marginTop: 2,
                }}>
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
          }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 12,
            }}>
            {t.activeSubscriptions}
          </Text>
          {subscriptionData.subscriptions.map((sub, index) => (
            <View
              key={sub.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth:
                  index < subscriptionData.subscriptions.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}>
              <View className="flex-row justify-between items-center">
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: '500',
                      fontSize: 14,
                    }}>
                    {sub.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}>
                    {sub.billing_cycle} • {sub.category}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: '600',
                      fontSize: 15,
                    }}>
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
      default:
        return renderTransactionTab();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
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
          }}>
          <View className="flex-row justify-between items-center">
            <Text
              style={{ color: theme.text, fontSize: 20, fontWeight: '600' }}>
              {t.transactionReports}
            </Text>
          </View>

          {/* Date Range Picker */}
          <View className="flex-row gap-2 mt-3">
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.background,
                padding: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => openDatePicker('start')}
              disabled={loading}>
              <Calendar size={16} color={theme.primary} />
              <Text
                style={{
                  marginLeft: 6,
                  color: theme.text,
                  fontSize: 13,
                  flex: 1,
                }}>
                {formatDate(pendingDateRange.startDate.toISOString())}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.background,
                padding: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => openDatePicker('end')}
              disabled={loading}>
              <Calendar size={16} color={theme.primary} />
              <Text
                style={{
                  marginLeft: 6,
                  color: theme.text,
                  fontSize: 13,
                  flex: 1,
                }}>
                {formatDate(pendingDateRange.endDate.toISOString())}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                padding: 10,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={handleSubmitDateRange}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Filter size={18} color="white" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                padding: 10,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setDownloadMenuVisible(true)}
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

        {/* Tab Navigation */}
        <View
          style={{
            backgroundColor: theme.background,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === 'transactions'
                      ? theme.primary
                      : theme.background,
                }}
                onPress={() => setActiveTab('transactions')}>
                <Text
                  style={{
                    color: activeTab === 'transactions' ? 'white' : theme.text,
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                  {t.transactions}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === 'subscriptions'
                      ? theme.primary
                      : theme.background,
                }}
                onPress={() => setActiveTab('subscriptions')}>
                <Text
                  style={{
                    color: activeTab === 'subscriptions' ? 'white' : theme.text,
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                  {t.subscriptions}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === 'budgets' ? theme.primary : theme.background,
                }}
                onPress={() => setActiveTab('budgets')}>
                <Text
                  style={{
                    color: activeTab === 'budgets' ? 'white' : theme.text,
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                  {t.budgets}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === 'goals' ? theme.primary : theme.background,
                }}
                onPress={() => setActiveTab('goals')}>
                <Text
                  style={{
                    color: activeTab === 'goals' ? 'white' : theme.text,
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                  {t.goals}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor:
                    activeTab === 'accounts' ? theme.primary : theme.background,
                }}
                onPress={() => setActiveTab('accounts')}>
                <Text
                  style={{
                    color: activeTab === 'accounts' ? 'white' : theme.text,
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                  {t.accounts}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Content */}
        <View style={{ flex: 1, backgroundColor: 'transparent', padding: 16 }}>
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
          onRequestClose={() => setDownloadMenuVisible(false)}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={1}
            onPress={() => setDownloadMenuVisible(false)}>
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
                  setDownloadMenuVisible(false);
                  handleDownload('pdf');
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
                  setDownloadMenuVisible(false);
                  handleDownload('csv');
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
                onPress={() => setDownloadMenuVisible(false)}>
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

        {/* Date Picker */}
        {datePickerVisible && (
          <>
            {Platform.OS === 'ios' ? (
              <Modal
                transparent={true}
                animationType="slide"
                visible={datePickerVisible}
                onRequestClose={onDismiss}>
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'flex-end',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  }}>
                  <View
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderTopLeftRadius: 24,
                      borderTopRightRadius: 24,
                      padding: 20,
                    }}>
                    <View className="flex-row justify-between items-center mb-4">
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 18,
                          fontWeight: 'bold',
                        }}>
                        {datePickerMode === 'start'
                          ? t.selectStartDate
                          : t.selectEndDate}
                      </Text>
                      <TouchableOpacity onPress={onDismiss}>
                        <X size={24} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <DateTimePicker
                      value={
                        datePickerMode === 'start'
                          ? pendingDateRange.startDate
                          : pendingDateRange.endDate
                      }
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      maximumDate={
                        datePickerMode === 'start'
                          ? pendingDateRange.endDate
                          : new Date()
                      }
                      minimumDate={
                        datePickerMode === 'end'
                          ? pendingDateRange.startDate
                          : new Date(2020, 0, 1)
                      }
                      themeVariant={theme.isDarkColorScheme ? 'dark' : 'light'}
                    />

                    <TouchableOpacity
                      style={{
                        backgroundColor: '#3b82f6',
                        padding: 16,
                        borderRadius: 12,
                        marginTop: 16,
                      }}
                      onPress={confirmIOSDate}>
                      <Text
                        style={{
                          color: 'white',
                          textAlign: 'center',
                          fontWeight: 'bold',
                        }}>
                        {t.confirm}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={
                  datePickerMode === 'start'
                    ? pendingDateRange.startDate
                    : pendingDateRange.endDate
                }
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={
                  datePickerMode === 'start'
                    ? pendingDateRange.endDate
                    : new Date()
                }
                minimumDate={
                  datePickerMode === 'end'
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
