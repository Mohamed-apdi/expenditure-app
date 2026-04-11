/**
 * Category and frequency helpers for expenses/income
 * Provides category lists based on translations
 */
import type { ComponentType } from "react";
import { LANGUAGES } from "../config/language/languages";
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
  Users,
  MoreHorizontal,
  Tag,
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
  { id: "family", name: t.family, icon: Users, color: "#6366f1" },
  { id: "subscriptions", name: t.subscriptions, icon: Repeat, color: "#8b5cf6" },
  { id: "fitness", name: t.gymAndSports, icon: Dumbbell, color: "#059669" },
  { id: "electronics", name: t.electronics, icon: Smartphone, color: "#64748b" },
  { id: "furniture", name: t.furniture, icon: Sofa, color: "#f59e0b" },
  { id: "repairs", name: t.repairs, icon: Wrench, color: "#3b82f6" },
  { id: "taxes", name: t.taxes, icon: Receipt, color: "#ef4444" },
  /** Tag (not MoreHorizontal) so list rows are distinct from unknown / uncategorized fallback. */
  { id: "others", name: t.others, icon: Tag, color: "#64748b" },
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

const EN_LABELS = LANGUAGES.en;

/** Normalize stored English labels so "Food and Drinks" matches "Food & Drinks". */
function normalizeEnglishCategoryLabelForMatch(label: string): string {
  return label
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+and\s+/gi, " & ");
}

/**
 * English labels that never match {@link getExpenseCategories}({@link LANGUAGES}.en)[].name /
 * income names: old PascalCase rows, legacy chart keys, singular/plural, synonyms (e.g. "Utilities" vs "Bills",
 * "Investment" vs "Investments").
 */
const LEGACY_EN_LABEL_TO_CATEGORY_ID: Readonly<Record<string, string>> = {
  // —— Bills / utilities (label is "Bills" in EN) ——
  Utilities: "utilities",
  Utility: "utilities",
  Electric: "utilities",
  Water: "utilities",
  Internet: "utilities",

  // —— Health / healthcare ——
  Healthcare: "healthcare",
  Medical: "healthcare",
  Pharmacy: "healthcare",
  Wellness: "healthcare",

  // —— Fun / entertainment ——
  Entertainment: "entertainment",
  Movies: "entertainment",
  Games: "entertainment",

  // —— Loans / debt ——
  Debt: "debt",
  Loan: "debt",
  Credit: "debt",

  // —— Donations / charity ——
  Charity: "charity",
  Donation: "charity",

  // —— Children ——
  Kids: "kids",
  Child: "kids",

  // —— Gym & sports ——
  Fitness: "fitness",
  Gym: "fitness",
  Sports: "fitness",
  Sport: "fitness",

  // —— Personal care ——
  PersonalCare: "personal_care",

  // —— Food ——
  Food: "food",
  Dining: "food",
  Groceries: "food",

  // —— Rent / housing ——
  Rent: "rent",
  Housing: "rent",
  Mortgage: "rent",

  // —— Transport ——
  Transport: "transport",
  Gas: "transport",
  PublicTransport: "transport",

  // —— Shopping ——
  Shopping: "shopping",
  Clothing: "shopping",

  // —— Education ——
  Education: "education",
  Books: "education",
  Courses: "education",

  // —— Other expense PascalCase / chart ——
  Gifts: "gifts",
  Insurance: "insurance",
  Pets: "pets",
  Family: "family",
  Subscriptions: "subscriptions",
  Subscription: "subscriptions",
  Electronics: "electronics",
  Furniture: "furniture",
  Repairs: "repairs",
  Repair: "repairs",
  Taxes: "taxes",
  Tax: "taxes",
  Others: "others",
  Other: "others",
  Misc: "others",
  Miscellaneous: "others",

  // —— Vacation (id `travel`) vs trip labels ——
  Vacation: "travel",
  Holiday: "travel",
  Hotel: "travel",
  Flight: "travel",

  // —— Income: chart / singular / informal (canonical uses "Investments", "Salary", etc.) ——
  Investment: "investments",
  investment: "investments",
  investing: "investments",
  Salary: "salary",
  Bonus: "bonus",
  PartTime: "part_time",
  Business: "business",
  Investments: "investments",
  Interest: "interest",
  Rental: "rental",
  Sales: "sales",
  Gambling: "gambling",
  Awards: "awards",
  Refunds: "refunds",
  Freelance: "freelance",
  Royalties: "royalties",
  Grants: "grants",
  Pension: "pension",

  // Loose chart / UI keys (only when they do not match a canonical category name)
  Income: "salary",
};

const LEGACY_LABEL_LOWER = new Map<string, string>();
for (const [label, id] of Object.entries(LEGACY_EN_LABEL_TO_CATEGORY_ID)) {
  LEGACY_LABEL_LOWER.set(label.toLowerCase(), id);
}

/**
 * Resolve a stored transaction/expense `category` value to a stable category id.
 * Accepts ids already, or legacy English display names from {@link getExpenseCategories}(EN) / income.
 */
export function resolveCategoryIdFromStored(
  stored: string | undefined | null,
): string | undefined {
  if (stored == null || !String(stored).trim()) return undefined;
  const s = String(stored).trim();
  const expense = getExpenseCategories(EN_LABELS);
  const income = getIncomeCategories(EN_LABELS);

  if (expense.some((c) => c.id === s)) return s;
  if (income.some((c) => c.id === s)) return s;

  const normalizedAnd = normalizeEnglishCategoryLabelForMatch(s);

  const byName = (list: Category[], label: string) =>
    list.find((c) => c.name === label);

  const ex =
    byName(expense, s) ??
    (normalizedAnd !== s ? byName(expense, normalizedAnd) : undefined);
  if (ex) return ex.id;

  const inc =
    byName(income, s) ??
    (normalizedAnd !== s ? byName(income, normalizedAnd) : undefined);
  if (inc) return inc.id;

  const sLower = s.toLowerCase();
  const normLower = normalizedAnd.toLowerCase();
  const exCi =
    expense.find((c) => c.name.toLowerCase() === sLower) ??
    expense.find((c) => c.name.toLowerCase() === normLower);
  if (exCi) return exCi.id;

  const incCi =
    income.find((c) => c.name.toLowerCase() === sLower) ??
    income.find((c) => c.name.toLowerCase() === normLower);
  if (incCi) return incCi.id;

  const legacyId =
    LEGACY_EN_LABEL_TO_CATEGORY_ID[s] ?? LEGACY_LABEL_LOWER.get(s.toLowerCase());
  if (legacyId) return legacyId;

  return undefined;
}

/** Localized label for UI (id or legacy stored value). */
export function categoryLabelFromStored(
  t: any,
  stored: string | undefined | null,
): string {
  if (stored == null || !String(stored).trim()) return "";
  const id = resolveCategoryIdFromStored(stored) ?? String(stored).trim();
  const ex = getExpenseCategories(t).find((c) => c.id === id);
  if (ex) return ex.name;
  const inc = getIncomeCategories(t).find((c) => c.id === id);
  if (inc) return inc.name;
  return String(stored).trim();
}

export function categoryIconFromStored(
  t: any,
  stored: string | undefined | null,
): ComponentType<{ size: number; color: string }> {
  const id = resolveCategoryIdFromStored(stored ?? "");
  if (!id) return MoreHorizontal;
  const ex = getExpenseCategories(t).find((c) => c.id === id);
  if (ex) return ex.icon;
  const inc = getIncomeCategories(t).find((c) => c.id === id);
  if (inc) return inc.icon;
  return MoreHorizontal;
}

export function categoryColorFromStored(
  t: any,
  stored: string | undefined | null,
): string {
  const id = resolveCategoryIdFromStored(stored ?? "");
  if (!id) return "#64748b";
  const ex = getExpenseCategories(t).find((c) => c.id === id);
  if (ex) return ex.color;
  const inc = getIncomeCategories(t).find((c) => c.id === id);
  if (inc) return inc.color;
  return "#64748b";
}
