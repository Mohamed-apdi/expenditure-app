import { View, Text } from "react-native";
import { useTheme } from "~/lib/theme";

interface TransactionItemProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  description: string;
  category: string;
  time: string;
  amount: number;
  color: string;
  entryType?: "Income" | "Expense" | "Lent" | "Debt/Loan" | "Saving";
}

export default function TransactionItem({
  icon: Icon,
  description,
  category,
  time,
  amount,
  color,
  entryType,
}: TransactionItemProps) {
  const theme = useTheme();

  const isIncome = entryType === "Income";
  const isExpense = entryType === "Expense";

  // Color by type
  const amountColor = isIncome
    ? "#10b981" // emerald
    : isExpense
      ? "#ef4444" // red
      : theme.text; // neutral for others

  // Format by type
  const amountText = isExpense
    ? `-$${amount.toFixed(2)}`
    : `$${amount.toFixed(2)}`; // Income and others: no minus

  return (
    <View
      className="flex-row items-center p-4 rounded-xl border"
      style={{
        borderColor: theme.border,
        backgroundColor: theme.cardBackground,
      }}
    >
      <View
        className="w-10 h-10 rounded-full justify-center items-center mr-3"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={20} color={color} />
      </View>

      <View className="flex-1">
        <Text className="font-medium" style={{ color: theme.text }}>
          {description}
        </Text>
        <Text className="text-slate-400 text-xs">
          {category} • {time}
        </Text>
      </View>

      <Text style={{ color: amountColor }} className="font-bold">
        {amountText}
      </Text>
    </View>
  );
}
