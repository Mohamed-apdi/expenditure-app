import { View, Text } from "react-native";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  ArrowRightCircle,
  PiggyBank,
} from "lucide-react-native";
import { useTheme } from "~/lib";

export default function MonthlyOverview({
  income,
  expense,
  lent,
  debtLoan,
  saving,
}) {
  const theme = useTheme();

  const cards = [
    { label: "Income", value: income, icon: ArrowUpCircle, color: "#10b981" },
    {
      label: "Expense",
      value: expense,
      icon: ArrowDownCircle,
      color: "#ef4444",
    },
    { label: "Lent", value: lent, icon: ArrowRightCircle, color: "#f59e0b" },
    { label: "Debt/Loan", value: debtLoan, icon: DollarSign, color: "#3b82f6" },
    { label: "Saving", value: saving, icon: PiggyBank, color: "#84cc16" },
  ];

  return (
    <View className="px-6 mb-5">
      <Text className="text-lg font-bold mb-4" style={{ color: theme.text }}>
        Monthly Overview
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {cards.map((card, i) => (
          <View
            key={i}
            className="w-[48%] p-4 rounded-xl border items-center"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
          >
            <card.icon size={20} color={card.color} />
            <Text className="text-slate-400 text-xs mt-2 mb-1">
              {card.label}
            </Text>
            <Text
              className="text-lg font-bold"
              style={{ color: theme.primary }}
            >
              ${card.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
