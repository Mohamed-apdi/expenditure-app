import React, { memo } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { formatDistanceToNow } from "date-fns";
import {
  Utensils,
  Home,
  Bus,
  Zap,
  Ticket,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  MoreHorizontal,
  Smile,
  Shield,
  CreditCard,
  Gift,
  HandHeart,
  Luggage,
  PawPrint,
  Baby,
  Repeat,
  Dumbbell,
  Smartphone,
  Sofa,
  Wrench,
  Receipt,
  Landmark,
  Gem,
  Clock,
  Briefcase,
  LineChart,
  Percent,
  Key,
  Tag,
  Dice5,
  Trophy,
  RefreshCw,
  Laptop,
  Copyright,
  HandCoins,
  User,
} from "lucide-react-native";

type TransactionItemProps = {
  transaction: {
    id: string;
    amount: number;
    category?: string;
    description?: string;
    created_at: string;
    type: "expense" | "income" | "transfer";
  };
  onPress?: () => void;
  getCategoryIcon?: (category: string) => React.ElementType;
  getCategoryColor?: (category: string) => string;
  getCategoryLabel?: (categoryKey: string) => string;
};

// Memoized category icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  // Expense categories
  Food: Utensils,
  Rent: Home,
  Transport: Bus,
  Utilities: Zap,
  Entertainment: Ticket,
  Healthcare: HeartPulse,
  Shopping: ShoppingBag,
  Education: GraduationCap,
  Other: MoreHorizontal,
  PersonalCare: Smile,
  Insurance: Shield,
  Debt: CreditCard,
  Gifts: Gift,
  Charity: HandHeart,
  Travel: Luggage,
  Pets: PawPrint,
  Kids: Baby,
  Subscriptions: Repeat,
  Fitness: Dumbbell,
  Electronics: Smartphone,
  Furniture: Sofa,
  Repairs: Wrench,
  Taxes: Receipt,

  // Income categories
  Salary: Landmark,
  Bonus: Gem,
  PartTime: Clock,
  Business: Briefcase,
  Investments: LineChart,
  Interest: Percent,
  Rental: Key,
  Sales: Tag,
  Gambling: Dice5,
  Awards: Trophy,
  Refunds: RefreshCw,
  Freelance: Laptop,
  Royalties: Copyright,
  Grants: HandCoins,
  Pension: User,
};

// Memoized category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  // Expense colors
  Food: "#10b981",
  Rent: "#f59e0b",
  Transport: "#3b82f6",
  Utilities: "#f59e0b",
  Entertainment: "#8b5cf6",
  Healthcare: "#ef4444",
  Shopping: "#06b6d4",
  Education: "#84cc16",
  Other: "#64748b",
  PersonalCare: "#ec4899",
  Insurance: "#14b8a6",
  Debt: "#f97316",
  Gifts: "#8b5cf6",
  Charity: "#ef4444",
  Travel: "#3b82f6",
  Pets: "#f59e0b",
  Kids: "#ec4899",
  Subscriptions: "#8b5cf6",
  Fitness: "#10b981",
  Electronics: "#64748b",
  Furniture: "#f59e0b",
  Repairs: "#3b82f6",
  Taxes: "#ef4444",

  // Income colors
  Salary: "#10b981",
  Bonus: "#3b82f6",
  PartTime: "#f59e0b",
  Business: "#8b5cf6",
  Investments: "#ef4444",
  Interest: "#06b6d4",
  Rental: "#84cc16",
  Sales: "#64748b",
  Gambling: "#f43f5e",
  Awards: "#8b5cf6",
  Refunds: "#3b82f6",
  Freelance: "#f59e0b",
  Royalties: "#84cc16",
  Grants: "#10b981",
  Pension: "#64748b",
};

const MemoizedTransactionItem = memo<TransactionItemProps>(
  ({
    transaction,
    onPress,
    getCategoryIcon,
    getCategoryColor,
    getCategoryLabel,
  }) => {
    const router = useRouter();

    // Use passed functions if available, otherwise use built-in mappings
    const IconComponent = getCategoryIcon
      ? getCategoryIcon(transaction.category || "")
      : CATEGORY_ICONS[transaction.category || ""] || MoreHorizontal;

    const color = getCategoryColor
      ? getCategoryColor(transaction.category || "")
      : CATEGORY_COLORS[transaction.category || ""] || "#64748b";

    const handlePress = () => {
      if (onPress) {
        onPress();
      } else {
        router.push(`/(transactions)/transaction-detail/${transaction.id}`);
      }
    };

    const categoryLabel = getCategoryLabel
      ? getCategoryLabel(transaction.category || "")
      : transaction.category || "";

    return (
      <TouchableOpacity onPress={handlePress}>
        <View className="flex-row items-center p-4 bg-gray-50 rounded-xl gap-3 mb-2">
          <View
            className="w-11 h-11 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <IconComponent size={20} color={color} />
          </View>
          <View className="flex-1 flex-row justify-between items-center">
            <View className="flex-1 flex-row items-center">
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text
                  className="text-base font-semibold text-gray-900"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {categoryLabel}
                </Text>
                {transaction.description && (
                  <Text
                    className="text-xs text-gray-500"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {transaction.description}
                  </Text>
                )}
              </View>
              <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
                <Text
                  className="text-base font-bold"
                  style={{
                    color:
                      transaction.type === "expense" ? "#DC2626" : "#16A34A",
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {transaction.type === "expense" ? "-" : "+"}$
                  {Math.abs(transaction.amount).toFixed(2)}
                </Text>
                <Text className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(transaction.created_at), {
                    addSuffix: true,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

MemoizedTransactionItem.displayName = "MemoizedTransactionItem";

export default MemoizedTransactionItem;
