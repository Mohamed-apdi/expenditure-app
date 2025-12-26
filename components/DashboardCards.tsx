// components/DashboardCards.tsx
import { View, Text } from 'react-native';
import { TrendingUp, Wallet, PiggyBank } from 'lucide-react-native';
import { View, Text } from "react-native";
import { TrendingUp, Wallet, PiggyBank } from "lucide-react-native";

export const NetWorthCard = ({ netWorth }: { netWorth: number }) => (
  <View className="bg-blue-50 p-4 rounded-xl">
    <View className="flex-row justify-between items-center mb-2">
      <Text className="text-blue-800 font-medium">Net Worth</Text>
      <Wallet size={20} color="#1e40af" />
    </View>
    <Text className="text-2xl font-bold text-blue-900">
      ${netWorth.toLocaleString()}
    </Text>
    <View className="flex-row items-center mt-1">
      <TrendingUp size={16} color="#16a34a" />
      <Text className="text-green-600 ml-1 text-sm">2.5% from last month</Text>
    </View>
  </View>
);

export const BudgetCard = ({ spent, budget }: { spent: number; budget: number }) => {
export const BudgetCard = ({
  spent,
  budget,
}: {
  spent: number;
  budget: number;
}) => {
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  return (
    <View className="bg-purple-50 p-4 rounded-xl">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-purple-800 font-medium">Monthly Budget</Text>
        <PiggyBank size={20} color="#6b21a8" />
      </View>
      <View className="mb-2">
        <View className="flex-row justify-between mb-1">
          <Text className="text-purple-900">${spent.toFixed(2)}</Text>
          <Text className="text-purple-900">${budget.toFixed(2)}</Text>
        </View>
        <View className="h-2 bg-purple-100 rounded-full overflow-hidden">
          <View
            className="h-full bg-purple-600"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </View>
      </View>
      <Text className="text-purple-700 text-sm">
        {percentage > 100 ? "Over budget by " : "Remaining: "}$
        {Math.abs(budget - spent).toFixed(2)}
      </Text>
    </View>
  );
};
