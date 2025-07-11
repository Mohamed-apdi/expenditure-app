import { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ChevronLeft,
  Edit3,
  Trash2,
  Calendar,
  Tag,
  CreditCard,
  Repeat,
  ArrowUpRight,
  Receipt
} from 'lucide-react-native';
import { supabase } from '~/lib/supabase';
import { format } from 'date-fns';

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method: string;
  is_recurring: boolean;
  recurrence_interval?: string;
  is_essential: boolean;
  tags?: string[];
  created_at: string;
  receipt_url?: string;
};

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Fetch expense data
  const fetchExpense = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setExpense(data);
    } catch (error) {
      console.error('Error fetching expense:', error);
      Alert.alert('Error', 'Failed to load expense details');
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!id) return;

    // Initial fetch
    fetchExpense();

    // Subscribe to changes
    const subscription = supabase
      .channel('expense_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expenses',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setExpense(payload.new as Expense);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const handleDelete = async () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

              if (error) throw error;
              router.push('/expenses');
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'Cash',
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'digital_wallet': 'Digital Wallet'
    };
    return methods[method] || 'Unknown';
  };

  const handleViewReceipt = async () => {
    if (!expense?.receipt_url) return;
    
    try {
      const { data } = await supabase
        .storage
        .from('receipts')
        .createSignedUrl(expense.receipt_url, 60); // 60 second URL expiry
      
      if (data?.signedUrl) {
        await Linking.openURL(data.signedUrl);
      }
    } catch (error) {
      console.error('Error opening receipt:', error);
      Alert.alert('Error', 'Could not open receipt');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <Text className="text-white text-lg">Expense not found</Text>
        <TouchableOpacity 
          className="mt-4 bg-emerald-500 px-6 py-3 rounded-lg"
          onPress={() => router.push('/expenses')}
        >
          <Text className="text-white font-bold">Back to Expenses</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <View className="flex-row gap-4">
          <TouchableOpacity 
            onPress={() => router.push(`/(expense)/edit-expense/${expense.id}`)}
            disabled={deleting}
          >
            <Edit3 size={24} color={deleting ? "#64748b" : "#f8fafc"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator size="small" color="#64748b" />
            ) : (
              <Trash2 size={24} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Amount Display */}
        <View className="items-center py-8">
          <Text className="text-slate-400 mb-1">Amount Spent</Text>
          <Text className="text-rose-500 text-5xl font-bold">
            -${expense.amount.toFixed(2)}
          </Text>
        </View>

        {/* Main Details */}
        <View className="px-6 gap-6 mb-8">
          {/* Description */}
          <View>
            <Text className="text-slate-400 text-sm mb-2">Description</Text>
            <Text className="text-white text-lg">{expense.description}</Text>
          </View>

          {/* Category */}
          <View>
            <Text className="text-slate-400 text-sm mb-2">Category</Text>
            <View className="flex-row items-center">
              <View 
                className="w-6 h-6 rounded-full mr-3 justify-center items-center"
                style={{ backgroundColor: `${getCategoryColor(expense.category)}20` }}
              >
                <View 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getCategoryColor(expense.category) }} 
                />
              </View>
              <Text className="text-white text-lg">{expense.category}</Text>
            </View>
          </View>

          {/* Date */}
          <View>
            <Text className="text-slate-400 text-sm mb-2">Date</Text>
            <View className="flex-row items-center">
              <Calendar size={18} color="#64748b" className="mr-3" />
              <Text className="text-white text-lg  ml-3">
                {format(new Date(expense.date), 'MMMM d, yyyy')}
              </Text>
            </View>
          </View>

          {/* Payment Method */}
          <View>
            <Text className="text-slate-400 text-sm mb-2">Payment Method</Text>
            <View className="flex-row items-center">
              <CreditCard size={18} color="#64748b" className="mr-3" />
              <Text className="text-white text-lg  ml-3">
                {getPaymentMethodName(expense.payment_method)}
              </Text>
            </View>
          </View>

          {/* Recurring */}
          {expense.is_recurring && (
            <View>
              <Text className="text-slate-400 text-sm mb-2">Recurrence</Text>
              <View className="flex-row items-center">
                <Repeat size={18} color="#64748b" className="mr-3" />
                <Text className="text-white text-lg capitalize  ml-3">
                  {expense.recurrence_interval}
                </Text>
              </View>
            </View>
          )}

          {/* Essential */}
          <View>
            <Text className="text-slate-400 text-sm mb-2">Type</Text>
            <View className="flex-row items-center">
              <Tag size={18} color="#64748b" className="mr-3" />
              <Text className="text-white text-lg ml-3">
                {expense.is_essential ? 'Essential' : 'Discretionary'}
              </Text>
            </View>
          </View>

          {/* Tags */}
          {expense.tags && expense.tags.length > 0 && (
            <View>
              <Text className="text-slate-400 text-sm mb-2">Tags</Text>
              <View className="flex-row flex-wrap gap-2">
                {expense.tags.map((tag, index) => (
                  <View 
                    key={index} 
                    className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700"
                  >
                    <Text className="text-slate-400 text-sm">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Created At */}
          <View>
            <Text className="text-slate-400 text-sm mb-2">Recorded</Text>
            <Text className="text-slate-400">
              {format(new Date(expense.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}