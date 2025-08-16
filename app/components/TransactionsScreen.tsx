// screens/TransactionsScreen.tsx
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SectionList, TextInput } from 'react-native';
import { Filter, Search, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TransactionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const transactions = [
    {
      title: 'Today',
      data: [
        { id: '1', description: 'Grocery Store', amount: -45.32, category: 'Food', type: 'expense' },
        { id: '2', description: 'Salary Deposit', amount: 2500.00, category: 'Income', type: 'income' },
      ],
    },
    {
      title: 'Yesterday',
      data: [
        { id: '3', description: 'Gas Station', amount: -35.00, category: 'Transport', type: 'expense' },
        { id: '4', description: 'Freelance Work', amount: 350.00, category: 'Income', type: 'income' },
      ],
    },
    {
      title: 'Last Week',
      data: [
        { id: '5', description: 'Netflix Subscription', amount: -14.99, category: 'Entertainment', type: 'expense' },
        { id: '6', description: 'Electric Bill', amount: -85.00, category: 'Utilities', type: 'expense' },
      ],
    },
  ];

  const filteredTransactions = transactions.map((section) => ({
    ...section,
    data: section.data.filter((item) => {
      const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
      return matchesSearch && matchesFilter;
    }),
  })).filter((section) => section.data.length > 0);

  return (
    <SafeAreaView className="flex-1 py-safe">
    <View className="flex-1 bg-gray-50">
      <View className="p-4 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Search size={18} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2"
            placeholder="Search transactions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View className="flex-row space-x-2">
          {['all', 'income', 'expense'].map((filter) => (
            <TouchableOpacity
              key={filter}
              className={`px-3 py-1 rounded-full ${activeFilter === filter ? 'bg-blue-500' : 'bg-gray-200'}`}
              onPress={() => setActiveFilter(filter)}
            >
              <Text className={activeFilter === filter ? 'text-white' : 'text-gray-800'}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <SectionList
        className="flex-1"
        sections={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity className="bg-white p-4 border-b border-gray-100">
            <View className="flex-row justify-between">
              <View>
                <Text className="font-medium">{item.description}</Text>
                <Text className="text-gray-500 text-sm">{item.category}</Text>
              </View>
              <Text className={`font-medium ${item.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {item.amount < 0 ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
              </Text>
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
              No transactions found{searchQuery ? ` for "${searchQuery}"` : ''}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full justify-center items-center shadow-lg"
        onPress={() => navigation.navigate('AddTransaction')}
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}