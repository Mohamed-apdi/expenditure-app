import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { Calendar, BarChart2, PieChart, Filter, Download, FileText, TrendingUp, Wallet, Target, CreditCard } from 'lucide-react-native';
import { DatePickerModal } from 'react-native-paper-dates';
import { BarChart, PieChart as ChartKitPieChart, LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  getTransactionReports,
  getAccountReports,
  getBudgetReports,
  getSubscriptionReports,
  getGoalReports,
  downloadReport,
  generateLocalPDFReport,
  formatCurrency,
  formatPercentage,
  formatDate,
  type TransactionReport,
  type AccountReport,
  type BudgetReport,
  type SubscriptionReport,
  type GoalReport
} from '~/lib/api';

const { width: screenWidth } = Dimensions.get('window');

type TabType = 'transactions' | 'accounts' | 'budget' | 'subscriptions' | 'goals';

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Report data states
  const [transactionData, setTransactionData] = useState<TransactionReport | null>(null);
  const [accountData, setAccountData] = useState<AccountReport | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetReport | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionReport | null>(null);
  const [goalData, setGoalData] = useState<GoalReport | null>(null);

  const tabs = [
    { id: 'transactions' as TabType, label: 'Transactions', icon: TrendingUp },
    { id: 'accounts' as TabType, label: 'Accounts', icon: Wallet },
    { id: 'budget' as TabType, label: 'Budget', icon: BarChart2 },
    { id: 'subscriptions' as TabType, label: 'Subscriptions', icon: CreditCard },
    { id: 'goals' as TabType, label: 'Goals', icon: Target },
  ];

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      Food: '#f59e0b',
      Transport: '#3b82f6',
      Entertainment: '#8b5cf6',
      Utilities: '#10b981',
      Income: '#84cc16',
      Other: '#64748b',
      Savings: '#06b6d4',
      Investment: '#8b5cf6',
      Checking: '#10b981',
      Credit: '#ef4444',
    };
    return colors[category] || '#64748b';
  };

  const fetchTransactionReports = async () => {
    try {
      setLoading(true);
      const data = await getTransactionReports(
        dateRange.startDate.toISOString().split('T')[0],
        dateRange.endDate.toISOString().split('T')[0]
      );
      setTransactionData(data);
    } catch (error) {
      console.error('Error fetching transaction reports:', error);
      Alert.alert('Error', 'Failed to fetch transaction reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountReports = async () => {
    try {
      setLoading(true);
      const data = await getAccountReports();
      setAccountData(data);
    } catch (error) {
      console.error('Error fetching account reports:', error);
      Alert.alert('Error', 'Failed to fetch account reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetReports = async () => {
    try {
      setLoading(true);
      const data = await getBudgetReports();
      setBudgetData(data);
    } catch (error) {
      console.error('Error fetching budget reports:', error);
      Alert.alert('Error', 'Failed to fetch budget reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionReports = async () => {
    try {
      setLoading(true);
      const data = await getSubscriptionReports();
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error fetching subscription reports:', error);
      Alert.alert('Error', 'Failed to fetch subscription reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoalReports = async () => {
    try {
      setLoading(true);
      const data = await getGoalReports();
      setGoalData(data);
    } catch (error) {
      console.error('Error fetching goal reports:', error);
      Alert.alert('Error', 'Failed to fetch goal reports');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Fetch data for the selected tab if not already loaded
    switch (tab) {
      case 'transactions':
        if (!transactionData) fetchTransactionReports();
        break;
      case 'accounts':
        if (!accountData) fetchAccountReports();
        break;
      case 'budget':
        if (!budgetData) fetchBudgetReports();
        break;
      case 'subscriptions':
        if (!subscriptionData) fetchSubscriptionReports();
        break;
      case 'goals':
        if (!goalData) fetchGoalReports();
        break;
    }
  };

  const handleDownload = async (format: 'csv' | 'pdf') => {
    try {
      setLoading(true);
      const startDate = activeTab === 'transactions' ? dateRange.startDate.toISOString().split('T')[0] : undefined;
      const endDate = activeTab === 'transactions' ? dateRange.endDate.toISOString().split('T')[0] : undefined;
      
      if (format === 'pdf') {
        // Generate PDF locally
        let data;
        switch (activeTab) {
          case 'transactions':
            data = transactionData;
            break;
          case 'accounts':
            data = accountData;
            break;
          case 'budget':
            data = budgetData;
            break;
          case 'subscriptions':
            data = subscriptionData;
            break;
          case 'goals':
            data = goalData;
            break;
          default:
            throw new Error('Invalid report type');
        }
        
        if (!data) {
          Alert.alert('Error', 'No data available for PDF generation');
          return;
        }
        
        const filePath = await generateLocalPDFReport(
          activeTab,
          data,
          startDate && endDate ? { startDate, endDate } : undefined
        );
        
        Alert.alert('Success', `PDF report generated successfully at: ${filePath}`);
      } else {
        // Download CSV from server
        await downloadReport(activeTab, format, startDate, endDate);
        Alert.alert('Success', `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} report downloaded successfully`);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  const onDismiss = useCallback(() => setDatePickerVisible(false), []);
  const onConfirm = useCallback(({ startDate, endDate }: any) => {
    setDateRange({ startDate, endDate });
    setDatePickerVisible(false);
    if (activeTab === 'transactions') {
      fetchTransactionReports();
    }
  }, [activeTab]);

  useEffect(() => {
    // Load initial data for transactions tab
    fetchTransactionReports();
  }, []);

  const renderTransactionTab = () => {
    if (!transactionData) return null;

    const pieChartData = transactionData.category_breakdown.map(item => ({
      name: item.category,
      population: item.amount,
      color: getCategoryColor(item.category),
      legendFontColor: '#64748b',
      legendFontSize: 12,
    }));

    const barChartData = {
      labels: transactionData.daily_trends.slice(-7).map(item => formatDate(item.date).split(' ')[1]), // Show last 7 days
      datasets: [{
        data: transactionData.daily_trends.slice(-7).map(item => item.amount),
      }]
    };

    return (
      <ScrollView className="flex-1">
        {/* Summary Cards */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-1 bg-white p-4 rounded-xl mr-2">
            <Text className="text-gray-500 text-sm">Total Amount</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {formatCurrency(transactionData.summary.total_amount)}
            </Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl ml-2">
            <Text className="text-gray-500 text-sm">Transactions</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {transactionData.summary.total_transactions}
            </Text>
          </View>
        </View>

        {/* Category Breakdown Pie Chart */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg">Spending by Category</Text>
            <PieChart size={20} color="#6b7280" />
          </View>
          {pieChartData.length > 0 ? (
            <ChartKitPieChart
              data={pieChartData}
              width={screenWidth - 48}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text className="text-gray-500 text-center py-8">No data available</Text>
          )}
        </View>

        {/* Daily Trends Bar Chart */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg">Daily Spending Trends</Text>
            <BarChart2 size={20} color="#6b7280" />
          </View>
          {barChartData.datasets[0].data.length > 0 ? (
            <BarChart
              data={barChartData}
              width={screenWidth - 48}
              height={220}
              yAxisLabel="$"
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: { borderRadius: 16 },
                barPercentage: 0.7,
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          ) : (
            <Text className="text-gray-500 text-center py-8">No trend data available</Text>
          )}
        </View>

        {/* Category Breakdown Table */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <Text className="font-bold text-lg mb-4">Category Breakdown</Text>
          {transactionData.category_breakdown.map((item, index) => (
            <View key={index} className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View 
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: getCategoryColor(item.category) }}
                />
                <Text className="font-medium">{item.category}</Text>
              </View>
              <View className="items-end">
                <Text className="font-bold">{formatCurrency(item.amount)}</Text>
                <Text className="text-gray-500 text-sm">{formatPercentage(item.percentage)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderAccountTab = () => {
    if (!accountData) return null;

    const pieChartData = Object.entries(accountData.by_type).map(([type, data]) => ({
      name: type,
      population: data.total_balance,
      color: getCategoryColor(type),
      legendFontColor: '#64748b',
      legendFontSize: 12,
    }));

    return (
      <ScrollView className="flex-1">
        {/* Summary Cards */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-1 bg-white p-4 rounded-xl mr-2">
            <Text className="text-gray-500 text-sm">Total Balance</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {formatCurrency(accountData.summary.total_balance)}
            </Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl ml-2">
            <Text className="text-gray-500 text-sm">Accounts</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {accountData.summary.total_accounts}
            </Text>
          </View>
        </View>

        {/* Account Type Distribution */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg">Balance by Account Type</Text>
            <PieChart size={20} color="#6b7280" />
          </View>
          {pieChartData.length > 0 ? (
            <ChartKitPieChart
              data={pieChartData}
              width={screenWidth - 48}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text className="text-gray-500 text-center py-8">No data available</Text>
          )}
        </View>

        {/* Accounts List */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <Text className="font-bold text-lg mb-4">All Accounts</Text>
          {accountData.accounts.map((account, index) => (
            <View key={index} className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View>
                <Text className="font-medium">{account.name}</Text>
                <Text className="text-gray-500 text-sm">{account.type}</Text>
              </View>
              <Text className="font-bold">{formatCurrency(account.balance)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderBudgetTab = () => {
    if (!budgetData) return null;

    const barChartData = {
      labels: budgetData.budget_analysis.map(item => item.category),
      datasets: [{
        data: budgetData.budget_analysis.map(item => item.budget_amount),
      }]
    };

    const spentData = budgetData.budget_analysis.map(item => item.spent_amount);

    return (
      <ScrollView className="flex-1">
        {/* Summary Cards */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-1 bg-white p-4 rounded-xl mr-2">
            <Text className="text-gray-500 text-sm">Total Budget</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {formatCurrency(budgetData.summary.total_budget)}
            </Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl ml-2">
            <Text className="text-gray-500 text-sm">Spent</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {formatCurrency(budgetData.summary.total_spent)}
            </Text>
          </View>
        </View>

        {/* Budget vs Actual Bar Chart */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg">Budget vs Actual</Text>
            <BarChart2 size={20} color="#6b7280" />
          </View>
          {barChartData.datasets[0].data.length > 0 ? (
            <BarChart
              data={barChartData}
              width={screenWidth - 48}
              height={220}
              yAxisLabel="$"
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: { borderRadius: 16 },
                barPercentage: 0.7,
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          ) : (
            <Text className="text-gray-500 text-center py-8">No budget data available</Text>
          )}
        </View>

        {/* Budget Analysis Table */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <Text className="font-bold text-lg mb-4">Budget Analysis</Text>
          {budgetData.budget_analysis.map((item, index) => (
            <View key={index} className="py-3 border-b border-gray-100">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-medium">{item.category}</Text>
                <Text className="font-bold">{formatCurrency(item.budget_amount)}</Text>
              </View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-500 text-sm">Spent</Text>
                <Text className="text-gray-500">{formatCurrency(item.spent_amount)}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-500 text-sm">Remaining</Text>
                <Text className={`font-medium ${item.remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatCurrency(item.remaining)}
                </Text>
              </View>
              <View className="mt-2">
                <View className="w-full bg-gray-200 rounded-full h-2">
                  <View 
                    className={`h-2 rounded-full ${item.percentage_used > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(item.percentage_used, 100)}%` }}
                  />
                </View>
                <Text className="text-gray-500 text-sm mt-1">{formatPercentage(item.percentage_used)} used</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderSubscriptionTab = () => {
    if (!subscriptionData) return null;

    const pieChartData = Object.entries(subscriptionData.by_category).map(([category, data]) => ({
      name: category,
      population: data.total_monthly_cost,
      color: getCategoryColor(category),
      legendFontColor: '#64748b',
      legendFontSize: 12,
    }));

    return (
      <ScrollView className="flex-1">
        {/* Summary Cards */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-1 bg-white p-4 rounded-xl mr-2">
            <Text className="text-gray-500 text-sm">Monthly Cost</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {formatCurrency(subscriptionData.summary.total_monthly_cost)}
            </Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl ml-2">
            <Text className="text-gray-500 text-sm">Yearly Cost</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {formatCurrency(subscriptionData.summary.total_yearly_cost)}
            </Text>
          </View>
        </View>

        {/* Subscription Distribution */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg">Cost by Category</Text>
            <PieChart size={20} color="#6b7280" />
          </View>
          {pieChartData.length > 0 ? (
            <ChartKitPieChart
              data={pieChartData}
              width={screenWidth - 48}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text className="text-gray-500 text-center py-8">No data available</Text>
          )}
        </View>

        {/* Subscriptions List */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <Text className="font-bold text-lg mb-4">All Subscriptions</Text>
          {subscriptionData.subscriptions.map((subscription, index) => (
            <View key={index} className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View>
                <Text className="font-medium">{subscription.name}</Text>
                <Text className="text-gray-500 text-sm">{subscription.category}</Text>
              </View>
              <View className="items-end">
                <Text className="font-bold">{formatCurrency(subscription.monthly_cost)}</Text>
                <Text className="text-gray-500 text-sm">{subscription.billing_cycle}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderGoalTab = () => {
    if (!goalData) return null;

    const pieChartData = goalData.goals.map(goal => ({
      name: goal.name,
      population: goal.current_amount,
      color: getCategoryColor(goal.status),
      legendFontColor: '#64748b',
      legendFontSize: 12,
    }));

    return (
      <ScrollView className="flex-1">
        {/* Summary Cards */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-1 bg-white p-4 rounded-xl mr-2">
            <Text className="text-gray-500 text-sm">Total Saved</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {formatCurrency(goalData.summary.total_saved)}
            </Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl ml-2">
            <Text className="text-gray-500 text-sm">Progress</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {formatPercentage(goalData.summary.total_progress)}
            </Text>
          </View>
        </View>

        {/* Goal Progress */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg">Goal Progress</Text>
            <Target size={20} color="#6b7280" />
          </View>
          {pieChartData.length > 0 ? (
            <ChartKitPieChart
              data={pieChartData}
              width={screenWidth - 48}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text className="text-gray-500 text-center py-8">No data available</Text>
          )}
        </View>

        {/* Goals List */}
        <View className="mb-6 bg-white p-4 rounded-xl">
          <Text className="font-bold text-lg mb-4">All Goals</Text>
          {goalData.goals.map((goal, index) => {
            const progress = (goal.current_amount / goal.target_amount * 100);
            return (
              <View key={index} className="py-3 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-medium">{goal.name}</Text>
                  <Text className={`font-bold ${goal.status === 'completed' ? 'text-green-500' : 'text-blue-500'}`}>
                    {goal.status}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-500 text-sm">Target</Text>
                  <Text className="text-gray-500">{formatCurrency(goal.target_amount)}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-500 text-sm">Current</Text>
                  <Text className="text-gray-500">{formatCurrency(goal.current_amount)}</Text>
                </View>
                <View className="mt-2">
                  <View className="w-full bg-gray-200 rounded-full h-2">
                    <View 
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </View>
                  <Text className="text-gray-500 text-sm mt-1">{formatPercentage(progress)} complete</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'transactions':
        return renderTransactionTab();
      case 'accounts':
        return renderAccountTab();
      case 'budget':
        return renderBudgetTab();
      case 'subscriptions':
        return renderSubscriptionTab();
      case 'goals':
        return renderGoalTab();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-gray-800">Reports</Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                className="bg-blue-500 p-2 rounded-lg"
                onPress={() => handleDownload('csv')}
                disabled={loading}
              >
                <FileText size={18} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-green-500 p-2 rounded-lg"
                onPress={() => handleDownload('pdf')}
                disabled={loading}
              >
                <Download size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Range Picker (only for transactions) */}
          {activeTab === 'transactions' && (
            <View className="flex-row justify-between items-center">
              <TouchableOpacity
                className="bg-gray-100 p-3 rounded-lg flex-row items-center"
                onPress={() => setDatePickerVisible(true)}
              >
                <Calendar size={16} color="#6b7280" />
                <Text className="ml-2 text-gray-700">
                  {formatDate(dateRange.startDate.toISOString())} - {formatDate(dateRange.endDate.toISOString())}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tab Navigation */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="bg-white border-b border-gray-200"
        >
          <View className="flex-row px-4 py-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  className={`flex-row items-center px-4 py-2 rounded-lg mr-2 ${
                    isActive ? 'bg-blue-500' : 'bg-gray-100'
                  }`}
                  onPress={() => handleTabChange(tab.id)}
                >
                  <IconComponent size={16} color={isActive ? 'white' : '#6b7280'} />
                  <Text className={`ml-2 font-medium ${
                    isActive ? 'text-white' : 'text-gray-700'
                  }`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Content */}
        <View className="flex-1 p-4">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="mt-2 text-gray-500">Loading reports...</Text>
            </View>
          ) : (
            renderTabContent()
          )}
        </View>

        {/* Date Picker Modal */}
        <DatePickerModal
          locale="en"
          mode="range"
          visible={datePickerVisible}
          onDismiss={onDismiss}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onConfirm={onConfirm}
        />
      </View>
    </SafeAreaView>
  );
}