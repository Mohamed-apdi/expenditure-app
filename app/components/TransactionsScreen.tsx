// screens/TransactionsScreen.tsx
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SectionList, TextInput, ActivityIndicator } from 'react-native';
import { Filter, Search, Plus, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { fetchTransactions } from '~/lib/transactions';
import { useAccount } from '~/lib/AccountContext';
import { formatDistanceToNow } from 'date-fns';

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  created_at: string;
  date: string;
  type: 'expense' | 'income' | 'transfer';
  account_id: string;
};

type TransactionSection = {
  title: string;
  data: Transaction[];
};

export default function TransactionsScreen() {
  const router = useRouter();
  const { selectedAccount } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [transactions, setTransactions] = useState<TransactionSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch transactions from database
  const fetchUserTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('User not authenticated');
        return;
      }

      // Fetch all transactions for the user
      let allTransactions = await fetchTransactions(user.id);
      
      // Filter by selected account if one is selected
      if (selectedAccount) {
        allTransactions = allTransactions.filter(t => t.account_id === selectedAccount.id);
      }

      // Group transactions by date
      const groupedTransactions = groupTransactionsByDate(allTransactions);
      setTransactions(groupedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Group transactions by date for section list
  const groupTransactionsByDate = (transactions: Transaction[]): TransactionSection[] => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const lastWeekStr = lastWeek.toISOString().split('T')[0];

    const todayTransactions = transactions.filter(t => t.date === todayStr);
    const yesterdayTransactions = transactions.filter(t => t.date === yesterdayStr);
    const lastWeekTransactions = transactions.filter(t => 
      t.date < yesterdayStr && t.date >= lastWeekStr
    );
    const olderTransactions = transactions.filter(t => t.date < lastWeekStr);

    const sections: TransactionSection[] = [];

    if (todayTransactions.length > 0) {
      sections.push({ title: 'Today', data: todayTransactions });
    }
    if (yesterdayTransactions.length > 0) {
      sections.push({ title: 'Yesterday', data: yesterdayTransactions });
    }
    if (lastWeekTransactions.length > 0) {
      sections.push({ title: 'Last Week', data: lastWeekTransactions });
    }
    if (olderTransactions.length > 0) {
      sections.push({ title: 'Older', data: olderTransactions });
    }

    return sections;
  };

  // Load transactions on component mount
  useEffect(() => {
    fetchUserTransactions();
  }, [selectedAccount?.id]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserTransactions();
  };

  // Filter transactions based on search and filter
  const filteredTransactions = transactions.map((section) => ({
    ...section,
    data: section.data.filter((item) => {
      const matchesSearch = item.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           false;
      const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
      return matchesSearch && matchesFilter;
    }),
  })).filter((section) => section.data.length > 0);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 py-safe">
        <View className="flex-1 bg-gray-50 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600">Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 py-safe">
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="p-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center mb-3">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Transactions</Text>
          </View>
          
          {/* Search Bar */}
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
            <Search size={18} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2"
              placeholder="Search transactions..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {/* Filter Buttons */}
          <View className="flex-row space-x-2">
            {['all', 'income', 'expense', 'transfer'].map((filter) => (
              <TouchableOpacity
                key={filter}
                className={`px-3 py-1 rounded-full ${activeFilter === filter ? 'bg-blue-500' : 'bg-gray-200'}`}
                onPress={() => setActiveFilter(filter)}
              >
                <Text className={`${activeFilter === filter ? 'text-white' : 'text-gray-800'}`}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transactions List */}
        <SectionList
          className="flex-1"
          sections={filteredTransactions}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="bg-white p-4 border-b border-gray-100"
              onPress={() => router.push(`/expense-detail/${item.id}`)}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="font-medium text-gray-900" numberOfLines={1}>
                    {item.description || item.category || 'No description'}
                  </Text>
                  <Text className="text-gray-500 text-sm">{item.category}</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className={`font-bold text-lg ${
                    item.type === 'expense' ? 'text-red-500' : 
                    item.type === 'income' ? 'text-green-500' : 'text-blue-500'
                  }`}>
                    {item.type === 'expense' ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
                  </Text>
                  <Text className="text-gray-400 text-xs capitalize">{item.type}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View className="bg-gray-50 px-4 py-2">
              <Text className="font-bold text-gray-500">{title}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center p-8">
              <Text className="text-gray-500 text-center">
                {searchQuery || activeFilter !== 'all' 
                  ? `No transactions found${searchQuery ? ` for "${searchQuery}"` : ''}${activeFilter !== 'all' ? ` in ${activeFilter}` : ''}`
                  : 'No transactions yet'
                }
              </Text>
              {!searchQuery && activeFilter === 'all' && (
                <Text className="text-gray-400 text-center mt-2">
                  Start by adding your first transaction
                </Text>
              )}
            </View>
          }
        />

        {/* Add Transaction Button */}
        <TouchableOpacity
          className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full justify-center items-center shadow-lg"
          onPress={() => router.push('/(expense)/AddExpense')}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}