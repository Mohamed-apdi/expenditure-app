import { View, Text } from "react-native";
import { Calendar } from "lucide-react-native";
import { useColorScheme } from "~/lib/useColorScheme";
import { useTheme } from "~/lib/theme";
interface SpendingWidgetProps {
  spent: number;
}

export default function SpendingWidget({ spent }: SpendingWidgetProps) {

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
          Today's Spending Expenses
        </Text>
      </View>

      <View className="items-center mb-5">
        <Text className="text-emerald-500 text-4xl font-bold">
          ${spent.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}
