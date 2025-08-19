import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Dimensions, ActivityIndicator, Modal, Platform } from 'react-native';
import { Calendar, BarChart2, PieChart, Filter, Download, FileText, TrendingUp, X, Wallet } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarChart, PieChart as ChartKitPieChart, LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccount } from '~/lib/AccountContext';
import { 
  getTransactionReports,
  downloadReport,
  generateLocalPDFReport,
  formatCurrency,
  formatPercentage,
  formatDate,
  testAPIConnectivity,
  type TransactionReport
} from '~/lib/api';
import { sharePDF } from '~/lib/pdfGenerator';

const { width: screenWidth } = Dimensions.get('window');

export default function ReportsScreen() {
  const { selectedAccount, accounts } = useAccount();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [loading, setLoading] = useState(false);
  
  // Report data states
  const [transactionData, setTransactionData] = useState<TransactionReport | null>(null);



  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      Food: '#ff6b6b',
      Transport: '#4ecdc4',
      Entertainment: '#45b7d1',
      Utilities: '#96ceb4',
      Income: '#52c41a',
      Other: '#8c7ae6',
      Savings: '#fd79a8',
      Investment: '#fdcb6e',
      Checking: '#00b894',
      Credit: '#e17055',
      Housing: '#a29bfe',
      Healthcare: '#fab1a0',
      Education: '#74b9ff',
      Shopping: '#81ecec',
      Travel: '#ff7675',
      active: '#52c41a',
      completed: '#00b894',
      paused: '#fdcb6e',
    };
    return colors[category] || '#6c5ce7';
  };

  const fetchTransactionReports = async () => {
    try {
      setLoading(true);
      console.log('Fetching transaction reports for account:', selectedAccount?.id);
      const data = await getTransactionReports(
        selectedAccount?.id,
        dateRange.startDate.toISOString().split('T')[0],
        dateRange.endDate.toISOString().split('T')[0]
      );
      console.log('Transaction reports data received:', data);
      setTransactionData(data);
    } catch (error) {
      console.error('Error fetching transaction reports:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to fetch transaction reports: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };





  const handleDownload = async (format: 'csv' | 'pdf') => {
    try {
      setLoading(true);
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];
      
      if (format === 'pdf') {
        // Generate PDF locally
        const data = transactionData;
        
        if (!data) {
          Alert.alert('Error', 'No data available for PDF generation');
          return;
        }
        
        const filePath = await generateLocalPDFReport(
          'transactions',
          data,
          startDate && endDate ? { startDate, endDate } : undefined
        );
        
        Alert.alert(
          'Success', 
          `PDF report generated successfully!`,
          [
            {
              text: 'Share',
              onPress: async () => {
                try {
                  await sharePDF(filePath);
                } catch (error) {
                  console.error('Error sharing PDF:', error);
                  Alert.alert('Error', 'Failed to share PDF');
                }
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      } else {
        // Download CSV from server
        await downloadReport('transactions', format, startDate, endDate, selectedAccount?.id);
        Alert.alert('Success', 'Transaction report downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  // Date picker callbacks
  const onDismiss = useCallback(() => setDatePickerVisible(false), []);
  
  const onDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setDatePickerVisible(false);
    }
    
    if (selectedDate) {
      if (datePickerMode === 'start') {
        setDateRange(prev => ({ ...prev, startDate: selectedDate }));
      } else {
        setDateRange(prev => ({ ...prev, endDate: selectedDate }));
      }
      
      if (Platform.OS === 'ios') {
        // On iOS, we'll handle the confirm separately
      } else {
        // On Android, refresh data immediately
        setTimeout(() => fetchTransactionReports(), 100);
      }
    }
  }, [datePickerMode]);

  const confirmIOSDate = useCallback(() => {
    setDatePickerVisible(false);
    fetchTransactionReports();
  }, []);

  const openDatePicker = useCallback((mode: 'start' | 'end') => {
    setDatePickerMode(mode);
    setDatePickerVisible(true);
  }, []);

  useEffect(() => {
    // Test API connectivity first
    testAPIConnectivity().then(isConnected => {
      console.log('API connectivity test result:', isConnected);
      if (isConnected && selectedAccount) {
        // Load initial data for transactions tab if we have a selected account
        fetchTransactionReports();
      } else if (!isConnected) {
        Alert.alert('Connection Error', 'Unable to connect to the API server. Please check your internet connection and try again.');
      }
    });
  }, [selectedAccount]);

  // Refresh transaction data when date range changes
  useEffect(() => {
    if (selectedAccount) {
      fetchTransactionReports();
    }
  }, [dateRange]);

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
          <Text className="text-gray-600 mt-4">Loading transaction data for {selectedAccount.name}...</Text>
        </View>
      );
    }

    const pieChartData = Object.entries(transactionData.category_breakdown).map(([category, data]) => ({
      name: category,
      population: Math.abs(data.amount),
      color: getCategoryColor(category),
      legendFontColor: '#64748b',
      legendFontSize: 12,
    }));

    const barChartData = {
      labels: transactionData.daily_trends.slice(-7).map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [{
        data: transactionData.daily_trends.slice(-7).map(item => item.amount),
        colors: transactionData.daily_trends.slice(-7).map((_, index) => () => `hsl(${index * 51}, 70%, 50%)`),
      }]
    };

    return (
      <ScrollView className="flex-1">
        {/* Summary Cards */}
        <View className="mb-4">
          {/* First Row - Net Amount */}
          <View className="flex-row justify-between mb-3">
            <View className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl mr-2 shadow-sm"
                  style={{ backgroundColor: '#dbeafe' }}>
              <Text className="text-blue-600 text-sm font-medium">Net Amount</Text>
              <Text className={`text-2xl font-bold ${transactionData.summary.total_amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(transactionData.summary.total_amount)}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">Income - Expenses</Text>
            </View>
            <View className="flex-1 bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl ml-2 shadow-sm"
                  style={{ backgroundColor: '#ede9fe' }}>
              <Text className="text-purple-600 text-sm font-medium">Transactions</Text>
              <Text className="text-2xl font-bold text-purple-800">
                {transactionData.summary.total_transactions}
              </Text>
            </View>
          </View>
          
          {/* Second Row - Income and Expenses */}
          <View className="flex-row justify-between">
            <View className="flex-1 bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl mr-2 shadow-sm"
                  style={{ backgroundColor: '#dcfce7' }}>
              <Text className="text-green-600 text-sm font-medium">Income</Text>
              <Text className="text-xl font-bold text-green-800">
                +{formatCurrency(transactionData.summary.total_income)}
              </Text>
            </View>
            <View className="flex-1 bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl ml-2 shadow-sm"
                  style={{ backgroundColor: '#fee2e2' }}>
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
            <Text className="font-bold text-lg text-gray-800">Spending by Category</Text>
            <PieChart size={20} color="#8b5cf6" />
          </View>
          {pieChartData.length > 0 ? (
            <ChartKitPieChart
              data={pieChartData}
              width={screenWidth - 48}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#faf5ff',
                backgroundGradientTo: '#f3e8ff',
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
        <View className="mb-6 bg-white p-4 rounded-xl shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg text-gray-800">Daily Spending Trends</Text>
            <BarChart2 size={20} color="#6366f1" />
          </View>
          {barChartData.datasets[0].data.length > 0 ? (
            <BarChart
              data={barChartData}
              width={screenWidth - 48}
              height={220}
              yAxisLabel="$"
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#f8fafc',
                backgroundGradientTo: '#f1f5f9',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                style: { borderRadius: 16 },
                barPercentage: 0.8,
                fillShadowGradient: '#6366f1',
                fillShadowGradientOpacity: 0.8,
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
          {Object.entries(transactionData.category_breakdown).map(([category, data], index) => (
            <View key={index} className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View className="flex-1">
                <Text className="font-medium">{category}</Text>
                <Text className="text-gray-500 text-sm">{data.count} transactions</Text>
              </View>
              <View className="items-end">
                <Text className="font-bold">{formatCurrency(data.amount)}</Text>
                <Text className="text-gray-500 text-sm">{formatPercentage(data.percentage)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };



  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100" style={{ backgroundColor: '#f8fafc' }}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-2xl font-bold text-gray-800">Transaction Reports</Text>
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
            <View className="flex-row space-x-2">
              <TouchableOpacity
                className="bg-blue-500 p-2 rounded-lg"
                style={{
                  backgroundColor: '#3b82f6',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={() => handleDownload('csv')}
              >
                <Download size={18} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-green-500 p-2 rounded-lg"
                style={{
                  backgroundColor: '#10b981',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={() => handleDownload('pdf')}
              >
                <Download size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Range Picker */}
          <View className="flex-row justify-between items-center space-x-2">
            <TouchableOpacity
              className="flex-1 bg-blue-50 p-3 rounded-lg flex-row items-center mr-2"
              onPress={() => openDatePicker('start')}
              style={{ backgroundColor: '#eff6ff' }}
            >
              <Calendar size={14} color="#3b82f6" />
              <Text className="ml-2 text-blue-700 text-sm font-medium">
                From: {formatDate(dateRange.startDate.toISOString())}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-1 bg-purple-50 p-3 rounded-lg flex-row items-center"
              onPress={() => openDatePicker('end')}
              style={{ backgroundColor: '#faf5ff' }}
            >
              <Calendar size={14} color="#8b5cf6" />
              <Text className="ml-2 text-purple-700 text-sm font-medium">
                To: {formatDate(dateRange.endDate.toISOString())}
              </Text>
            </TouchableOpacity>
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
            {Platform.OS === 'ios' ? (
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
                        Select {datePickerMode === 'start' ? 'Start' : 'End'} Date
                      </Text>
                      <TouchableOpacity onPress={onDismiss}>
                        <X size={24} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                    
                    <DateTimePicker
                      value={datePickerMode === 'start' ? dateRange.startDate : dateRange.endDate}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      maximumDate={datePickerMode === 'start' ? dateRange.endDate : new Date()}
                      minimumDate={datePickerMode === 'end' ? dateRange.startDate : new Date(2020, 0, 1)}
                      themeVariant="light"
                    />
                    
                    <TouchableOpacity
                      className="bg-blue-500 p-4 rounded-xl mt-4"
                      onPress={confirmIOSDate}
                    >
                      <Text className="text-white text-center font-bold">Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={datePickerMode === 'start' ? dateRange.startDate : dateRange.endDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={datePickerMode === 'start' ? dateRange.endDate : new Date()}
                minimumDate={datePickerMode === 'end' ? dateRange.startDate : new Date(2020, 0, 1)}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}