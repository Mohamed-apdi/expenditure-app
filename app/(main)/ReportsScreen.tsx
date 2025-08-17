// screens/ReportsScreen.tsx
import { useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Dimensions } from 'react-native';
import { Calendar, BarChart2, PieChart, Filter, Plus, X, Edit2, Trash2, Download } from 'lucide-react-native';
import { DatePickerModal } from 'react-native-paper-dates';
import { BarChart, PieChart as ChartKitPieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '~/lib/supabase';
import { 
  fetchExpenses, 
  updateExpense, 
  deleteExpense,
  getExpensesByCategory,
  getMonthlySummary,
  type Expense 
} from '~/lib/expenses';

const { width: screenWidth } = Dimensions.get('window');

export default function ReportsScreen() {
  const [range, setRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });
  const [visible, setVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Expense | null>(null);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Food');
  const [dateFilter, setDateFilter] = useState('month'); // 'today', 'week', 'month', 'custom'
  const [transactions, setTransactions] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const getCategoryColor = (category: string): string => {
    const colors = {
      Food: '#f59e0b',
      Transport: '#3b82f6',
      Entertainment: '#8b5cf6',
      Utilities: '#10b981',
      Income: '#84cc16',
      Other: '#64748b',
    };
    return colors[category] || '#64748b';
  };

  const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Income', 'Other'];

  // Fetch transactions from database
  const fetchTransactionsData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      setUserId(user.id);
      const transactionsData = await fetchExpenses(user.id);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      Alert.alert("Error", "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionsData();
  }, []);

  // Filter transactions based on selected date range
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);
    return transactionDate >= startDate && transactionDate <= endDate;
  });

  // Process data for charts using filtered transactions
  const expenseData = filteredTransactions
    .filter(t => t.entry_type === 'Expense')
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.category === curr.category);
      if (existing) {
        existing.amount += Math.abs(curr.amount);
      } else {
        acc.push({
          category: curr.category,
          amount: Math.abs(curr.amount),
          color: getCategoryColor(curr.category),
        });
      }
      return acc;
    }, [] as { category: string; amount: number; color: string }[]);

  const incomeData = filteredTransactions
    .filter(t => t.entry_type === 'Income')
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.category === curr.category);
      if (existing) {
        existing.amount += curr.amount;
      } else {
        acc.push({
          category: curr.category,
          amount: curr.amount,
          color: getCategoryColor(curr.category),
        });
      }
      return acc;
    }, [] as { category: string; amount: number; color: string }[]);

  const totalExpenses = filteredTransactions
    .filter(t => t.entry_type === 'Expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalIncome = filteredTransactions
    .filter(t => t.entry_type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const netAmount = totalIncome - totalExpenses;

  const onDismiss = useCallback(() => setVisible(false), []);
  const onConfirm = useCallback(({ startDate, endDate }) => {
    setRange({ startDate, endDate });
    setVisible(false);
    setDateFilter('custom');
  }, []);

  // Apply date filter presets
  const applyDateFilter = (filterType: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newRange = { startDate: today, endDate: new Date() };
    
    switch (filterType) {
      case 'today':
        newRange.startDate = new Date(today);
        break;
      case 'week':
        newRange.startDate = new Date(today.setDate(today.getDate() - today.getDay()));
        break;
      case 'month':
        newRange.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'custom':
        setVisible(true);
        return;
    }
    
    setRange(newRange);
    setDateFilter(filterType);
  };

  const openAddModal = () => {
    setCurrentTransaction(null);
    setNewDescription('');
    setNewAmount('');
    setNewCategory('Food');
    setIsModalVisible(true);
  };

  const openEditModal = (transaction: Expense) => {
    setCurrentTransaction(transaction);
    setNewDescription(transaction.description || '');
    setNewAmount(Math.abs(transaction.amount).toString());
    setNewCategory(transaction.category);
    setIsModalVisible(true);
  };

  const handleSaveTransaction = async () => {
    if (!currentTransaction || !newDescription || !newAmount) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      const updatedTransaction = await updateExpense(currentTransaction.id, {
        description: newDescription,
        amount: parseFloat(newAmount) * (currentTransaction.entry_type === 'Expense' ? -1 : 1),
        category: newCategory,
      });

      setTransactions(prev => prev.map(t => 
        t.id === currentTransaction.id ? updatedTransaction : t
      ));
      
      setIsModalVisible(false);
      Alert.alert("Success", "Transaction updated successfully");
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Error", "Failed to update transaction");
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense(transactionId);
              setTransactions(prev => prev.filter(t => t.id !== transactionId));
              Alert.alert("Success", "Transaction deleted successfully");
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert("Error", "Failed to delete transaction");
            }
          },
        },
      ]
    );
  };

  const renderPieChart = () => {
    const pieChartData = expenseData.map(item => ({
      name: item.category,
      population: item.amount,
      color: item.color,
      legendFontColor: '#64748b',
      legendFontSize: 12,
    }));

    return (
      <View style={{ alignItems: 'center' }}>
        <ChartKitPieChart
          data={pieChartData}
          width={screenWidth - 32}
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
      </View>
    );
  };

  const renderBarChart = () => {
    const chartData = {
      labels: monthlyData.map(item => item.label),
      datasets: [{
        data: monthlyData.map(item => item.value),
      }]
    };

    return (
      <View style={{ alignItems: 'center' }}>
        <BarChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          yAxisLabel="$"
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            barPercentage: 0.7,
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>
    );
  };

  const groupTransactionsByDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
    
    return [
      {
        title: 'Today',
        data: filteredTransactions.filter(t => t.date.split('T')[0] === today),
      },
      {
        title: 'Yesterday',
        data: filteredTransactions.filter(t => t.date.split('T')[0] === yesterday),
      },
      {
        title: 'Earlier',
        data: filteredTransactions.filter(t => {
          const date = t.date.split('T')[0];
          return date !== today && date !== yesterday;
        }),
      },
    ].filter(group => group.data.length > 0);
  };

  return (
    <SafeAreaView className="flex-1 py-safe">
      <View className="flex-1 bg-gray-50">
        <ScrollView className="flex-1 p-4">
          {/* Date Filter Picker */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row space-x-2">
              <TouchableOpacity
                className={`px-3 py-2 rounded-lg ${dateFilter === 'today' ? 'bg-blue-600' : 'bg-white'}`}
                onPress={() => applyDateFilter('today')}
              >
                <Text className={dateFilter === 'today' ? 'text-white' : 'text-gray-800'}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-3 py-2 rounded-lg ${dateFilter === 'week' ? 'bg-blue-600' : 'bg-white'}`}
                onPress={() => applyDateFilter('week')}
              >
                <Text className={dateFilter === 'week' ? 'text-white' : 'text-gray-800'}>Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-3 py-2 rounded-lg ${dateFilter === 'month' ? 'bg-blue-600' : 'bg-white'}`}
                onPress={() => applyDateFilter('month')}
              >
                <Text className={dateFilter === 'month' ? 'text-white' : 'text-gray-800'}>Month</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-3 py-2 rounded-lg ${dateFilter === 'custom' ? 'bg-blue-600' : 'bg-white'}`}
                onPress={() => applyDateFilter('custom')}
              >
                <Text className={dateFilter === 'custom' ? 'text-white' : 'text-gray-800'}>Custom</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity className="bg-white p-2 rounded-lg">
              <Download size={18} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <DatePickerModal
            locale="en"
            mode="range"
            visible={visible}
            onDismiss={onDismiss}
            startDate={range.startDate}
            endDate={range.endDate}
            onConfirm={onConfirm}
          />

          {/* Date Range Display */}
          <View className="mb-4 bg-white p-3 rounded-lg">
            <Text className="text-center text-gray-700">
              Showing data from {range.startDate.toLocaleDateString()} to {range.endDate.toLocaleDateString()}
            </Text>
          </View>

          {/* Spending by Category Pie Chart */}
          <View className="mb-6 bg-white p-4 rounded-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-bold text-lg">Spending by Category</Text>
              <PieChart size={20} color="#6b7280" />
            </View>
            <View className="h-64 items-center justify-center">
              {expenseData.length > 0 ? (
                renderPieChart()
              ) : (
                <Text className="text-gray-500">No expense data available</Text>
              )}
            </View>
          </View>

          {/* Monthly Trends Bar Chart */}
          <View className="mb-6 bg-white p-4 rounded-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-bold text-lg">Monthly Trends</Text>
              <BarChart2 size={20} color="#6b7280" />
            </View>
            <View className="h-64">
              {monthlyData.length > 0 ? (
                renderBarChart()
              ) : (
                <View className="flex-1 justify-center items-center">
                  <Text className="text-gray-500">No trend data available</Text>
                </View>
              )}
            </View>
          </View>

          {/* Recent Transactions */}
          <View className="bg-white p-4 rounded-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-bold text-lg">Recent Transactions</Text>
              <TouchableOpacity 
                className="bg-blue-500 p-2 rounded-full"
                onPress={openAddModal}
              >
                <Plus size={18} color="white" />
              </TouchableOpacity>
            </View>
            
            {groupTransactionsByDate().map((group) => (
              <View key={group.title} className="mb-4">
                <Text className="font-bold text-gray-500 py-2 bg-gray-50">
                  {group.title}
                </Text>
                {group.data.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    className="flex-row justify-between py-3 border-b border-gray-100"
                    onPress={() => openEditModal(item)}
                  >
                    <View className="flex-row items-center">
                      <View 
                        className="w-8 h-8 rounded-full mr-3 items-center justify-center"
                        style={{ backgroundColor: `${getCategoryColor(item.category)}20` }}
                      >
                        <Text style={{ color: getCategoryColor(item.category) }}>
                          {item.category.charAt(0)}
                        </Text>
                      </View>
                      <View>
                        <Text className="font-medium">{item.description}</Text>
                        <Text className="text-gray-500 text-sm">{item.category}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <Text className={`font-medium ${item.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {item.amount < 0 ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
                      </Text>
                      <TouchableOpacity 
                        className="ml-2"
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteTransaction(item.id);
                        }}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Add/Edit Transaction Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="w-11/12 bg-white rounded-xl p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="font-bold text-lg">
                  {currentTransaction ? 'Edit Transaction' : 'Add Transaction'}
                </Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-1">Description</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="e.g., Grocery Store"
                  value={newDescription}
                  onChangeText={setNewDescription}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-1">Amount ($)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={newAmount}
                  onChangeText={setNewAmount}
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 mb-1">Category</Text>
                <View className="flex-row flex-wrap">
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      className={`px-3 py-2 rounded-full mr-2 mb-2 ${newCategory === category ? 'bg-blue-500' : 'bg-gray-200'}`}
                      onPress={() => setNewCategory(category)}
                    >
                      <Text className={newCategory === category ? 'text-white' : 'text-gray-800'}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                className="bg-blue-500 py-3 rounded-lg items-center"
                onPress={handleSaveTransaction}
              >
                <Text className="text-white font-medium">
                  {currentTransaction ? 'Update Transaction' : 'Add Transaction'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}