import React, { memo } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "~/lib";
import {
  Utensils,
  Home,
  Bus,
  Zap,
  Film,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  MoreHorizontal,
  Smile,
  CreditCard,
  Gift,
  HandHeart,
  Luggage,
  Baby,
  Dumbbell,
  Smartphone,
  Sofa,
  Wrench,
  Receipt,
  DollarSign,
  Clock,
  Briefcase,
  Award,
  Laptop,
  User,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
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
};

// Memoized category icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  // Transaction type icons
  income: ArrowUpCircle,
  expense: ArrowDownCircle,
  transfer: ArrowLeftRight,

  // Expense categories
  food: Utensils,
  rent: Home,
  transport: Bus,
  utilities: Zap,
  entertainment: Film,
  healthcare: HeartPulse,
  shopping: ShoppingBag,
  education: GraduationCap,
  personal_care: Smile,
  debt: CreditCard,
  gifts: Gift,
  charity: HandHeart,
  travel: Luggage,
  kids: Baby,
  fitness: Dumbbell,
  electronics: Smartphone,
  furniture: Sofa,
  repairs: Wrench,
  taxes: Receipt,

  // Income categories
  salary: DollarSign,
  bonus: Zap,
  part_time: Clock,
  business: Briefcase,
  rental: Home,
  sales: ShoppingBag,
  awards: Award,
  freelance: Laptop,
  pension: User,

  // Additional mappings for common variations
  "Food & Drinks": Utensils,
  "Home & Rent": Home,
  "Personal Care": Smile,
  "Gym & Sports": Dumbbell,
  "Part-time Work": Clock,
  "Rent Income": Home,
  "Gifts Received": Gift,
  "Initial Balance": DollarSign,
  "Job Salary": DollarSign,

  // Legacy PascalCase mappings
  Food: Utensils,
  Rent: Home,
  Transport: Bus,
  Utilities: Zap,
  Entertainment: Film,
  Healthcare: HeartPulse,
  Shopping: ShoppingBag,
  Education: GraduationCap,
  PersonalCare: Smile,
  Debt: CreditCard,
  Gifts: Gift,
  Charity: HandHeart,
  Travel: Luggage,
  Kids: Baby,
  Fitness: Dumbbell,
  Electronics: Smartphone,
  Furniture: Sofa,
  Repairs: Wrench,
  Taxes: Receipt,
  Salary: DollarSign,
  Bonus: Zap,
  PartTime: Clock,
  Business: Briefcase,
  Rental: Home,
  Sales: ShoppingBag,
  Awards: Award,
  Freelance: Laptop,
  Pension: User,

  // Additional common variations
  Other: MoreHorizontal,
  Transfer: ArrowLeftRight,
};

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  // Transaction type colors
  income: "#16A34A",
  expense: "#DC2626",
  transfer: "#3b82f6",

  // Expense colors
  food: "#059669",
  rent: "#0891b2",
  transport: "#3b82f6",
  utilities: "#f97316",
  entertainment: "#8b5cf6",
  healthcare: "#dc2626",
  shopping: "#06b6d4",
  education: "#84cc16",
  personal_care: "#ec4899",
  debt: "#f97316",
  gifts: "#8b5cf6",
  charity: "#ef4444",
  travel: "#3b82f6",
  kids: "#ec4899",
  fitness: "#059669",
  electronics: "#64748b",
  furniture: "#f59e0b",
  repairs: "#3b82f6",
  taxes: "#ef4444",

  // Income colors
  salary: "#059669",
  bonus: "#3b82f6",
  part_time: "#f97316",
  business: "#8b5cf6",
  rental: "#84cc16",
  sales: "#64748b",
  awards: "#8b5cf6",
  freelance: "#f97316",
  pension: "#64748b",

  // Additional mappings for common variations
  "Food & Drinks": "#059669",
  "Home & Rent": "#0891b2",
  "Personal Care": "#ec4899",
  "Gym & Sports": "#059669",
  "Part-time Work": "#f97316",
  "Rent Income": "#84cc16",
  "Gifts Received": "#8b5cf6",
  "Initial Balance": "#059669",
  "Job Salary": "#059669",

  // Legacy PascalCase mappings
  Food: "#059669",
  Rent: "#0891b2",
  Transport: "#3b82f6",
  Utilities: "#f97316",
  Entertainment: "#8b5cf6",
  Healthcare: "#dc2626",
  Shopping: "#06b6d4",
  Education: "#84cc16",
  PersonalCare: "#ec4899",
  Debt: "#f97316",
  Gifts: "#8b5cf6",
  Charity: "#ef4444",
  Travel: "#3b82f6",
  Kids: "#ec4899",
  Fitness: "#059669",
  Electronics: "#64748b",
  Furniture: "#f59e0b",
  Repairs: "#3b82f6",
  Taxes: "#ef4444",
  Salary: "#059669",
  Bonus: "#3b82f6",
  PartTime: "#f97316",
  Business: "#8b5cf6",
  Rental: "#84cc16",
  Sales: "#64748b",
  Awards: "#8b5cf6",
  Freelance: "#f97316",
  Pension: "#64748b",

  // Additional common variations
  Other: "#64748b",
  Transfer: "#3b82f6",
};

// Category label mapping
const getCategoryLabelMapping = (t: any) => ({
  // Expense categories
  food: t.foodAndDrinks,
  rent: t.homeAndRent,
  transport: t.travel,
  utilities: t.bills,
  entertainment: t.fun,
  healthcare: t.health,
  shopping: t.shopping,
  education: t.learning,
  personal_care: t.personalCare,
  debt: t.loans,
  gifts: t.gifts,
  charity: t.donations,
  travel: t.vacation,
  kids: t.children,
  fitness: t.gymAndSports,
  electronics: t.electronics,
  furniture: t.furniture,
  repairs: t.repairs,
  taxes: t.taxes,

  // Income categories
  salary: t.jobSalary,
  bonus: t.bonus,
  part_time: t.partTimeWork,
  business: t.business,
  rental: t.rentIncome,
  sales: t.sales,
  awards: t.awards,
  freelance: t.freelance,
  pension: t.pension,

  // Additional mappings for common variations
  "Food & Drinks": t.foodAndDrinks,
  "Home & Rent": t.homeAndRent,
  "Personal Care": t.personalCare,
  "Gym & Sports": t.gymAndSports,
  "Part-time Work": t.partTimeWork,
  "Rent Income": t.rentIncome,
  "Gifts Received": t.giftsReceived,
  "Initial Balance": t.initialBalance,
  "Job Salary": t.jobSalary,

  // Legacy PascalCase mappings
  Food: t.foodAndDrinks,
  Rent: t.homeAndRent,
  Transport: t.travel,
  Utilities: t.bills,
  Entertainment: t.fun,
  Healthcare: t.health,
  Shopping: t.shopping,
  Education: t.learning,
  PersonalCare: t.personalCare,
  Debt: t.loans,
  Gifts: t.gifts,
  Charity: t.donations,
  Travel: t.vacation,
  Kids: t.children,
  Fitness: t.gymAndSports,
  Electronics: t.electronics,
  Furniture: t.furniture,
  Repairs: t.repairs,
  Taxes: t.taxes,
  Salary: t.jobSalary,
  Bonus: t.bonus,
  PartTime: t.partTimeWork,
  Business: t.business,
  Rental: t.rentIncome,
  Sales: t.sales,
  Awards: t.awards,
  Freelance: t.freelance,
  Pension: t.pension,

  // Additional common variations
  Other: t.other || "Other",
  Transfer: t.transfer,
});

// Internal category functions
const getCategoryIcon = (category: string): React.ElementType => {
  return CATEGORY_ICONS[category] || MoreHorizontal;
};

const getCategoryColor = (category: string): string => {
  return CATEGORY_COLORS[category] || "#64748b";
};

const getCategoryLabel = (categoryKey: string, t: any): string => {
  const labelMapping = getCategoryLabelMapping(t);
  return (labelMapping as any)[categoryKey] || categoryKey || "Other";
};

const MemoizedTransactionItem = memo<TransactionItemProps>(
  ({ transaction, onPress }) => {
    const router = useRouter();
    const { t } = useLanguage();

    // Use internal functions to get icon and color
    const categoryKey = transaction.category || transaction.type;

    const IconComponent = getCategoryIcon(categoryKey);
    const color = getCategoryColor(categoryKey);

    const handlePress = () => {
      if (onPress) {
        onPress();
      } else {
        router.push(`/(transactions)/transaction-detail/${transaction.id}`);
      }
    };

    const categoryLabel = getCategoryLabel(
      transaction.category || transaction.type,
      t
    );

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
