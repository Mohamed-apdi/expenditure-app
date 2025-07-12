import { View, Text } from "react-native";
import { Calendar } from "lucide-react-native";

interface SpendingWidgetProps {
  spent: number;
  budget: number;
}

export default function SpendingWidget({ spent, budget }: SpendingWidgetProps) {
  const progress = (spent / budget) * 100;

  const getProgressColor = () => {
    if (progress > 100) return "#ef4444";
    if (progress > 80) return "#f59e0b";
    return "#10b981";
  };

  return (
    <View className="bg-slate-800 mx-6 mb-5 p-5 rounded-xl border border-slate-700">
      <View className="flex-row items-center mb-4">
        <Calendar size={20} color="#10b981" />
        <Text className="text-white font-semibold ml-2">Today's Spending</Text>
      </View>

      <View className="items-center mb-5">
        <Text className="text-emerald-500 text-4xl font-bold">
          ${spent.toFixed(2)}
        </Text>
        <Text className="text-slate-400">of ${budget} budget</Text>
      </View>

      <View>
        <View className="h-2 bg-slate-700 rounded-full mb-1">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </View>
        <Text className="text-slate-400 text-xs text-center">
          {progress > 100
            ? `${(progress - 100).toFixed(0)}% over budget`
            : `${(100 - progress).toFixed(0)}% remaining`}
        </Text>
      </View>
    </View>
  );
}
