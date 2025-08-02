import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ChevronRight, 
  Filter, 
  Plus,
  ArrowUpDown,
  X,
  ShoppingCart,
  Truck,
  Zap,
  Film,
  Heart,
  ShoppingBag,
  Book,
  MoreHorizontal,
  Search,
  Check,
  Repeat,
  List
} from 'lucide-react-native';
import { supabase } from '~/lib/supabase';
import { format } from 'date-fns';
import AddExpenseOptionsModal from '../(expense)/AddExpenseOptionsModal';

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method: string;
  is_recurring?: boolean;
  location?: string;
};

type FilterOptions = {
  category?: string;
  paymentMethod?: string;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
  dateRange?: 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all';
};

const categoryMeta = {
  'All Categories': { icon: List, color: "#64748b" },
  'Food': { icon: ShoppingCart, color: "#10b981" },
  'Transport': { icon: Truck, color: "#3b82f6" },
  'Utilities': { icon: Zap, color: "#f59e0b" },
  'Entertainment': { icon: Film, color: "#8b5cf6" },
  'Healthcare': { icon: Heart, color: "#ef4444" },
  'Shopping': { icon: ShoppingBag, color: "#06b6d4" },
  'Education': { icon: Book, color: "#84cc16" },
  'Other': { icon: MoreHorizontal, color: "#64748b" }
};

const dateRanges = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_year', label: 'This Year' }
];

export default function ExpenseListScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sortBy: 'date',
    sortOrder: 'desc',
    dateRange: 'all',
    category: undefined // Start with no category filter
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddOptions, setShowAddOptions] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id);

      // Apply category filter only if not 'All Categories'
      if (filterOptions.category && filterOptions.category !== 'All Categories') {
        query = query.eq('category', filterOptions.category);
      }

      // Apply payment method filter
      if (filterOptions.paymentMethod) {
        query = query.eq('payment_method', filterOptions.paymentMethod);
      }

      // Apply date range filter only if not 'all'
      if (filterOptions.dateRange && filterOptions.dateRange !== 'all') {
        const today = new Date();
        let startDate: string | null = null;
        let endDate: string | null = null;

        switch (filterOptions.dateRange) {
          case 'today':
            startDate = today.toISOString().split('T')[0];
            endDate = startDate;
            break;
          case 'this_week': {
            const day = today.getDay();
            const first = new Date(today);
            first.setDate(today.getDate() - day);
            startDate = first.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
            break;
          }
          case 'this_month': {
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate = first.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
            break;
          }
          case 'last_month': {
            const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const last = new Date(today.getFullYear(), today.getMonth(), 0);
            startDate = first.toISOString().split('T')[0];
            endDate = last.toISOString().split('T')[0];
            break;
          }
          case 'this_year':
            startDate = `${today.getFullYear()}-01-01`;
            endDate = today.toISOString().split('T')[0];
            break;
        }

        if (startDate && endDate) {
          query = query.gte('date', startDate).lte('date', endDate);
        }
      }

      // Apply sorting
      query = query.order(filterOptions.sortBy, { 
        ascending: filterOptions.sortOrder === 'asc' 
      });

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter by search query if present
      const filteredData = searchQuery 
        ? (data || []).filter(expense => 
            expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            expense.category.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : data || [];

      setExpenses(filteredData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterOptions, searchQuery]);

  const groupExpensesByDate = () => {
    const groups: Record<string, Expense[]> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      let dateKey: string;

      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(date, 'EEEE, MMM d');
      }

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(expense);
    });

    return groups;
  };

  const clearFilters = () => {
    setFilterOptions({
      sortBy: 'date',
      sortOrder: 'desc',
      dateRange: 'all',
      category: undefined
    });
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-5">
        <Text className="text-white text-2xl font-bold">My Expenses</Text>
        <TouchableOpacity 
          className="bg-emerald-500 w-10 h-10 rounded-full justify-center items-center"
          onPress={() => setShowAddOptions(true)}
        >
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View className="flex-row px-6 mb-5 gap-3">
        <View className="flex-row items-center flex-1 bg-slate-800 rounded-xl border border-slate-700 px-4">
          <Search size={20} color="#64748b" />
          <TextInput
            className="flex-1 py-3 px-3 text-white"
            placeholder="Search expenses..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          className="w-12 h-12 rounded-xl border border-slate-700 bg-emerald-500 justify-center items-center"
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color="#f8fafc" />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(filterOptions.category || filterOptions.dateRange !== 'all') && (
        <View className="px-6 mb-4">
          <Text className="text-slate-400 text-sm mb-2">Active Filters:</Text>
          <View className="flex-row flex-wrap gap-2">
            {filterOptions.category && (
              <View className="bg-slate-700 px-3 py-1 rounded-full flex-row items-center">
                <Text className="text-white text-sm">
                  {filterOptions.category}
                </Text>
                <TouchableOpacity 
                  className="ml-2"
                  onPress={() => setFilterOptions(prev => ({ ...prev, category: undefined }))}
                >
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
            {filterOptions.dateRange !== 'all' && (
              <View className="bg-slate-700 px-3 py-1 rounded-full flex-row items-center">
                <Text className="text-white text-sm">
                  {dateRanges.find(r => r.key === filterOptions.dateRange)?.label}
                </Text>
                <TouchableOpacity 
                  className="ml-2"
                  onPress={() => setFilterOptions(prev => ({ ...prev, dateRange: 'all' }))}
                >
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Total Summary */}
      <View className="px-6 mb-5">
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 items-center">
          <Text className="text-slate-400 mb-2">Total Expenses</Text>
          <Text className="text-rose-500 text-3xl font-bold mb-1">
            ${totalAmount.toFixed(2)}
          </Text>
          <Text className="text-slate-400 text-sm">
            {expenses.length} transactions
          </Text>
        </View>
      </View>

      {/* Expense List */}
      {expenses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-lg mb-2">No expenses found</Text>
          <Text className="text-slate-400 text-center mb-6">
            {searchQuery || filterOptions.category || filterOptions.dateRange !== 'all' 
              ? "Try adjusting your filters or search" 
              : "Start tracking your expenses by adding your first one"}
          </Text>
          <TouchableOpacity 
            className="bg-emerald-500 px-6 py-3 rounded-lg"
            onPress={() => {
              if (searchQuery || filterOptions.category || filterOptions.dateRange !== 'all') {
                clearFilters();
                setSearchQuery('');
              } else {
                router.push('/(expense)/AddExpense');
              }
            }}
          >
            <Text className="text-white font-bold">
              {searchQuery || filterOptions.category || filterOptions.dateRange !== 'all' 
                ? "Clear Filters" 
                : "Add Expense"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="pb-20">
          {Object.entries(groupExpensesByDate()).map(([date, dayExpenses]) => (
            <View key={date} className="mb-6">
              <Text className="text-white font-bold px-6 mb-3">{date}</Text>
              <View className="px-6 gap-2">
                {dayExpenses.map((expense) => {
                  const { icon: Icon, color } = categoryMeta[expense.category as keyof typeof categoryMeta] || 
                    { icon: MoreHorizontal, color: "#64748b" };
                  
                  return (
                    <TouchableOpacity 
                      key={expense.id}
                      className="flex-row bg-slate-800 p-4 rounded-xl border border-slate-700 items-start"
                      onPress={() => router.push(`/expense-detail/${expense.id}`)}
                    >
                      <View 
                        className="w-10 h-10 rounded-full justify-center items-center mr-3"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon size={20} color={color} />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row justify-between items-start mb-1">
                          <View className="flex-1 pr-2">
                            <Text 
                              className="text-white font-medium" 
                              numberOfLines={1}
                            >
                              {expense.description}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-rose-500 font-bold text-right">
                              -${expense.amount.toFixed(2)}
                            </Text>
                            <ChevronRight size={20} color="#64748b" />
                          </View>
                        </View>

                        <View className="flex-row items-center flex-wrap">
                          <Text className="text-slate-500 text-xs">
                            {expense.category}
                          </Text>

                          {expense.is_recurring && (
                            <>
                              <Text className="text-slate-600 mx-2">•</Text>
                              <View className="flex-row items-center bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                <Repeat size={10} color="#10b981" />
                                <Text className="text-emerald-500 text-xs ml-1 font-medium">
                                  Recurring
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide">
        <SafeAreaView className="flex-1 bg-slate-900">
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
            <Text className="text-white text-xl font-bold">Filter Expenses</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6">
            {/* Category Filter */}
            <View className="my-6">
              <Text className="text-white text-lg font-bold mb-4">Category</Text>
              <View className="gap-2">
                {Object.keys(categoryMeta).map((category) => {
                  const isSelected = filterOptions.category === category || 
                    (category === 'All Categories' && !filterOptions.category);
                  return (
                    <TouchableOpacity
                      key={category}
                      className={`flex-row justify-between items-center p-4 rounded-xl border ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-800 border-slate-700'
                      }`}
                      onPress={() => 
                        setFilterOptions(prev => ({
                          ...prev,
                          category: category === 'All Categories' ? undefined : category
                        }))
                      }
                    >
                      <View className="flex-row items-center">
                        <View className="w-6 h-6 rounded-full justify-center items-center mr-3"
                          style={{ backgroundColor: `${categoryMeta[category as keyof typeof categoryMeta].color}20` }}>
                          {React.createElement(categoryMeta[category as keyof typeof categoryMeta].icon, { 
                            size: 14, 
                            color: categoryMeta[category as keyof typeof categoryMeta].color 
                          })}
                        </View>
                        <Text className={`${isSelected ? 'text-white' : 'text-slate-400'}`}>
                          {category}
                        </Text>
                      </View>
                      {isSelected && <Check size={16} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Range Filter */}
            <View className="my-6">
              <Text className="text-white text-lg font-bold mb-4">Date Range</Text>
              <View className="gap-2">
                {dateRanges.map((range) => {
                  const isSelected = filterOptions.dateRange === range.key || 
                    (range.key === 'all' && !filterOptions.dateRange);
                  return (
                    <TouchableOpacity
                      key={range.key}
                      className={`flex-row justify-between items-center p-4 rounded-xl border ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-800 border-slate-700'
                      }`}
                      onPress={() => 
                        setFilterOptions(prev => ({
                          ...prev,
                          dateRange: range.key as FilterOptions['dateRange']
                        }))
                      }
                    >
                      <Text className={`${isSelected ? 'text-white' : 'text-slate-400'}`}>
                        {range.label}
                      </Text>
                      {isSelected && <Check size={16} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sort Options */}
            <View className="my-6">
              <Text className="text-white text-lg font-bold mb-4">Sort By</Text>
              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity 
                  className={`px-3 py-2 rounded-full ${
                    filterOptions.sortBy === 'date' ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  onPress={() => 
                    setFilterOptions(prev => ({
                      ...prev,
                      sortBy: 'date',
                      sortOrder: prev.sortBy === 'date' && prev.sortOrder === 'desc' ? 'asc' : 'desc'
                    }))
                  }
                >
                  <View className="flex-row items-center">
                    <Text className={`mr-1 ${
                      filterOptions.sortBy === 'date' ? 'text-white' : 'text-slate-400'
                    }`}>
                      Date
                    </Text>
                    <ArrowUpDown size={14} color={
                      filterOptions.sortBy === 'date' ? '#fff' : '#94a3b8'
                    } />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  className={`px-3 py-2 rounded-full ${
                    filterOptions.sortBy === 'amount' ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  onPress={() => 
                    setFilterOptions(prev => ({
                      ...prev,
                      sortBy: 'amount',
                      sortOrder: prev.sortBy === 'amount' && prev.sortOrder === 'desc' ? 'asc' : 'desc'
                    }))
                  }
                >
                  <View className="flex-row items-center">
                    <Text className={`mr-1 ${
                      filterOptions.sortBy === 'amount' ? 'text-white' : 'text-slate-400'
                    }`}>
                      Amount
                    </Text>
                    <ArrowUpDown size={14} color={
                      filterOptions.sortBy === 'amount' ? '#fff' : '#94a3b8'
                    } />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Clear and Apply Buttons */}
            <View className="flex-row gap-3 my-6">
              <TouchableOpacity
                className="flex-1 py-4 rounded-xl items-center bg-slate-800 border border-slate-700"
                onPress={clearFilters}
              >
                <Text className="text-white font-bold">Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-4 rounded-xl items-center bg-emerald-500"
                onPress={() => {
                  fetchExpenses();
                  setShowFilterModal(false);
                }}
              >
                <Text className="text-white font-bold">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <AddExpenseOptionsModal
        visible={showAddOptions}
        onClose={() => setShowAddOptions(false)}
      />
    </SafeAreaView>
  );
}