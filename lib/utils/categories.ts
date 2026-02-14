import {
  Zap,
  Film,
  ShoppingBag,
  Book,
  CreditCard,
  DollarSign,
  Home,
  User,
  Gift,
  HandCoins,
  Laptop,
  RefreshCw,
  Award,
  Dice5,
  Percent,
  TrendingUp,
  Briefcase,
  Clock,
  Utensils,
  Bus,
  HeartPulse,
  GraduationCap,
  Smile,
  Shield,
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
} from "lucide-react-native";

export type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export const getExpenseCategories = (t: any): Category[] => [
  { id: "food", name: t.foodAndDrinks, icon: Utensils, color: "#059669" },
  { id: "rent", name: t.homeAndRent, icon: Home, color: "#0891b2" },
  { id: "transport", name: t.travel, icon: Bus, color: "#3b82f6" },
  { id: "utilities", name: t.bills, icon: Zap, color: "#f97316" },
  { id: "entertainment", name: t.fun, icon: Film, color: "#8b5cf6" },
  { id: "healthcare", name: t.health, icon: HeartPulse, color: "#dc2626" },
  { id: "shopping", name: t.shopping, icon: ShoppingBag, color: "#06b6d4" },
  { id: "education", name: t.learning, icon: GraduationCap, color: "#84cc16" },
  { id: "personal_care", name: t.personalCare, icon: Smile, color: "#ec4899" },
  { id: "insurance", name: t.insurance, icon: Shield, color: "#14b8a6" },
  { id: "debt", name: t.loans, icon: CreditCard, color: "#f97316" },
  { id: "gifts", name: t.gifts, icon: Gift, color: "#8b5cf6" },
  { id: "charity", name: t.donations, icon: HandHeart, color: "#ef4444" },
  { id: "travel", name: t.vacation, icon: Luggage, color: "#3b82f6" },
  { id: "pets", name: t.pets, icon: PawPrint, color: "#f59e0b" },
  { id: "kids", name: t.children, icon: Baby, color: "#ec4899" },
  { id: "subscriptions", name: t.subscriptions, icon: Repeat, color: "#8b5cf6" },
  { id: "fitness", name: t.gymAndSports, icon: Dumbbell, color: "#059669" },
  { id: "electronics", name: t.electronics, icon: Smartphone, color: "#64748b" },
  { id: "furniture", name: t.furniture, icon: Sofa, color: "#f59e0b" },
  { id: "repairs", name: t.repairs, icon: Wrench, color: "#3b82f6" },
  { id: "taxes", name: t.taxes, icon: Receipt, color: "#ef4444" },
];

export const getIncomeCategories = (t: any): Category[] => [
  { id: "salary", name: t.jobSalary, icon: DollarSign, color: "#059669" },
  { id: "bonus", name: t.bonus, icon: Zap, color: "#3b82f6" },
  { id: "part_time", name: t.partTimeWork, icon: Clock, color: "#f97316" },
  { id: "business", name: t.business, icon: Briefcase, color: "#8b5cf6" },
  { id: "investments", name: t.investments, icon: TrendingUp, color: "#ef4444" },
  { id: "interest", name: t.bankInterest, icon: Percent, color: "#06b6d4" },
  { id: "rental", name: t.rentIncome, icon: Home, color: "#84cc16" },
  { id: "sales", name: t.sales, icon: ShoppingBag, color: "#64748b" },
  { id: "gambling", name: t.gambling, icon: Dice5, color: "#f43f5e" },
  { id: "awards", name: t.awards, icon: Award, color: "#8b5cf6" },
  { id: "refunds", name: t.refunds, icon: RefreshCw, color: "#3b82f6" },
  { id: "freelance", name: t.freelance, icon: Laptop, color: "#f97316" },
  { id: "royalties", name: t.royalties, icon: Book, color: "#84cc16" },
  { id: "grants", name: t.grants, icon: HandCoins, color: "#059669" },
  { id: "gifts", name: t.giftsReceived, icon: Gift, color: "#8b5cf6" },
  { id: "pension", name: t.pension, icon: User, color: "#64748b" },
];

// Re-export for backward compatibility
export { getExpenseCategories as expenseCategories, getIncomeCategories as incomeCategories };
