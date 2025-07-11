import { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert
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
  MoreHorizontal
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
};

type FilterOptions = {
  category?: string;
  paymentMethod?: string;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
};

export default function ExpenseListScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ElementType> = {
      'Food': ShoppingCart,
      'Transport': Truck,
      'Utilities': Zap,
      'Entertainment': Film,
      'Healthcare': Heart,
      'Shopping': ShoppingBag,
      'Education': Book,
      'Other': MoreHorizontal,
    };
    return icons[category] || MoreHorizontal;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Food': '#10b981',
      'Transport': '#3b82f6',
      'Utilities': '#f59e0b',
      'Entertainment': '#8b5cf6',
      'Healthcare': '#ef4444',
      'Shopping': '#06b6d4',
      'Education': '#84cc16',
      'Other': '#64748b'
    };
    return colors[category] || '#64748b';
  };

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

      // Apply filters
      if (filterOptions.category) {
        query = query.eq('category', filterOptions.category);
      }

      if (filterOptions.paymentMethod) {
        query = query.eq('payment_method', filterOptions.paymentMethod);
      }

      // Apply sorting
      query = query.order(filterOptions.sortBy, { 
        ascending: filterOptions.sortOrder === 'asc' 
      });

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterOptions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const handleSort = (field: 'date' | 'amount') => {
    setFilterOptions(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  const clearFilters = () => {
    setFilterOptions({
      sortBy: 'date',
      sortOrder: 'desc'
    });
    setShowFilters(false);
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
        <Text className="text-white text-2xl font-bold">My Expenses</Text>
        <View className="flex-row gap-4">
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
            <Filter size={24} color={showFilters ? "#10b981" : "#f8fafc"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddOptions(true)}>
            <Plus size={24} color="#f8fafc" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View className="bg-slate-800 p-4 mx-4 my-2 rounded-lg border border-slate-700">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-bold">Filters</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text className="text-emerald-500">Clear All</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity 
              className={`px-3 py-2 rounded-full ${filterOptions.sortBy === 'date' ? 'bg-emerald-500' : 'bg-slate-700'}`}
              onPress={() => handleSort('date')}
            >
              <View className="flex-row items-center">
                <Text className={`mr-1 ${filterOptions.sortBy === 'date' ? 'text-white' : 'text-slate-400'}`}>
                  Date
                </Text>
                <ArrowUpDown size={14} color={filterOptions.sortBy === 'date' ? '#fff' : '#94a3b8'} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              className={`px-3 py-2 rounded-full ${filterOptions.sortBy === 'amount' ? 'bg-emerald-500' : 'bg-slate-700'}`}
              onPress={() => handleSort('amount')}
            >
              <View className="flex-row items-center">
                <Text className={`mr-1 ${filterOptions.sortBy === 'amount' ? 'text-white' : 'text-slate-400'}`}>
                  Amount
                </Text>
                <ArrowUpDown size={14} color={filterOptions.sortBy === 'amount' ? '#fff' : '#94a3b8'} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Expense List */}
      {expenses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-lg mb-2">No expenses yet</Text>
          <Text className="text-slate-400 text-center mb-6">
            Start tracking your expenses by adding your first one
          </Text>
          <TouchableOpacity 
            className="bg-emerald-500 px-6 py-3 rounded-lg"
            onPress={() => router.push('/(expense)/AddExpense')}
          >
            <Text className="text-white font-bold">Add Expense</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const IconComponent = getCategoryIcon(item.category);
            const color = getCategoryColor(item.category);
            
            return (
              <TouchableOpacity 
                className="flex-row items-center bg-slate-800 mx-4 my-2 p-4 rounded-xl border border-slate-700"
                onPress={() => router.push(`/expense-detail/${item.id}`)}
              >
                <View 
                  className="w-10 h-10 rounded-full justify-center items-center mr-3"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <IconComponent size={20} color={color} />
                </View>
                
                <View className="flex-1">
                  <Text className="text-white font-medium">{item.description}</Text>
                  <Text className="text-slate-400 text-sm mt-1">
                    {item.category} • {format(new Date(item.date), 'MMM d, yyyy')}
                  </Text>
                </View>
                
                <View className="items-end">
                  <Text className="text-rose-500 font-bold">-${item.amount.toFixed(2)}</Text>
                  <ChevronRight size={18} color="#64748b" />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Total Summary */}
      {expenses.length > 0 && (
        <View className="bg-slate-800 p-4 mx-4 mt-2 rounded-xl border border-slate-700">
          <Text className="text-slate-400 text-sm mb-1">Total Expenses</Text>
          <Text className="text-white text-xl font-bold">
            ${expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}
          </Text>
        </View>
      )}
      <AddExpenseOptionsModal
        visible={showAddOptions}
        onClose={() => setShowAddOptions(false)}
      />
    </SafeAreaView>
  );
}