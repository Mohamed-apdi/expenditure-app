import { View, Text } from "react-native";
import { DollarSign, TrendingDown, Target } from "lucide-react-native";

interface MonthlyOverviewProps {
  spent: number;
  budget: number;
}

export default function MonthlyOverview({ spent, budget }: MonthlyOverviewProps) {
  return (
    <View className="px-6 mb-5">
      <Text className="text-white text-lg font-bold mb-4">Monthly Overview</Text>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700 items-center">
          <DollarSign size={20} color="#10b981" />
          <Text className="text-slate-400 text-xs mt-2 mb-1">Spent</Text>
          <Text className="text-white text-lg font-bold">${spent}</Text>
          <Text className="text-slate-500 text-xs">of ${budget}</Text>
        </View>

        <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700 items-center">
          <TrendingDown size={20} color="#3b82f6" />
          <Text className="text-slate-400 text-xs mt-2 mb-1">Remaining</Text>
          <Text className="text-white text-lg font-bold">
            ${budget - spent}
          </Text>
          <Text className="text-slate-500 text-xs">
            {Math.round(((budget - spent) / budget) * 100)}% left
          </Text>
        </View>

        <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700 items-center">
          <Target size={20} color="#8b5cf6" />
          <Text className="text-slate-400 text-xs mt-2 mb-1">Avg/Day</Text>
          <Text className="text-white text-lg font-bold">
            ${Math.round(spent / new Date().getDate())}
          </Text>
          <Text className="text-slate-500 text-xs">this month</Text>
        </View>
      </View>
    </View>
  );
}

function getProgressColor(progress: number) {
  if (progress > 100) return "#ef4444";
  if (progress > 80) return "#f59e0b";
  return "#10b981";
}