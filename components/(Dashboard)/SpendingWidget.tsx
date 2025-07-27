import { View, Text } from "react-native";
import { Calendar } from "lucide-react-native";
import { useColorScheme } from "~/lib/useColorScheme";
import { useTheme } from "~/lib/theme";
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
  const theme = useTheme();

  return (
    <View
      className="mx-6 mb-5 mt-5 p-5 rounded-xl border"
      style={{
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
      }}
    >
      <View className="flex-row items-center mb-4">
        <Calendar size={20} color="#10b981" />
        <Text className="font-light ml-2" style={{ color: theme.text }}>
          Today's Spending
        </Text>
      </View>

      <View className="items-center mb-5">
        <Text className="text-emerald-500 text-4xl font-bold">
          ${spent.toFixed(2)}
        </Text>
        <Text style={{ color: theme.textSecondary }}>of ${budget} budget</Text>
      </View>
      <View>
        <View
          className="h-2 rounded-full mb-1"
          style={{ backgroundColor: theme.progressTrack }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </View>
        <Text
          className="text-xs text-center"
          style={{ color: theme.textSecondary }}
        >
          {progress > 100
            ? `${(progress - 100).toFixed(0)}% over budget`
            : `${(100 - progress).toFixed(0)}% remaining`}
        </Text>
      </View>
    </View>
  );
}
