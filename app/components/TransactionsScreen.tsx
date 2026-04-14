// screens/TransactionsScreen.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  TextInput,
} from "react-native";
import { Search, ArrowLeft, Plus, X, Layers, Search as SearchIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { getCurrentUserOfflineFirst, getTransactionsGroupedByDate } from "~/lib";
import { useAccount } from "~/lib";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import MemoizedTransactionItem from "~/components/(Dashboard)/MemoizedTransactionItem";
import { CategoryPickerSheet } from "~/components/CategoryPickerSheet";
import type { Category } from "~/lib/utils/categories";
import { getExpenseCategories, getIncomeCategories } from "~/lib/utils/categories";

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  created_at: string;
  date: string;
  type: "expense" | "income" | "transfer";
  account_id: string;
};

type TransactionSection = {
  title: string;
  data: Transaction[];
};

export default function TransactionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();
  const { selectedAccount } = useAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [category, setCategory] = useState<Category | null>(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [transactions, setTransactions] = useState<TransactionSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadedAll, setIsLoadedAll] = useState(false);

  const openRowRef = useRef<(() => void) | null>(null);
  const closeOpenRow = useCallback(() => {
    try {
      openRowRef.current?.();
    } catch {
      // Guard against stale refs
    }
    openRowRef.current = null;
  }, []);
  const clearOpenRow = useCallback(() => {
    openRowRef.current = null;
  }, []);
  const handleRowOpen = useCallback((close: () => void) => {
    openRowRef.current?.();
    openRowRef.current = close;
  }, []);

  // Fetch transactions from database using enhanced local functions
  const fetchUserTransactions = async () => {
    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      // Use the new enhanced function that handles filtering and grouping
      const groupedTransactions = await getTransactionsGroupedByDate(user.id, {
        accountId: selectedAccount?.id,
        type: activeFilter === "all" ? undefined : activeFilter as "expense" | "income" | "transfer",
        searchQuery: searchQuery,
        category: category?.id,
      });

      setTransactions(groupedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const hasAnyFilter =
    searchQuery.trim().length > 0 || !!category || activeFilter !== "all";

  // Load transactions on component mount and when filters change
  useEffect(() => {
    if (!selectedAccount?.id) {
      setTransactions([]);
      return;
    }

    // Don’t load everything by default; only fetch when user searches/filters,
    // or explicitly taps "Load all".
    if (!hasAnyFilter && !isLoadedAll) {
      setTransactions([]);
      setRefreshing(false);
      return;
    }

    fetchUserTransactions();
  }, [selectedAccount?.id, activeFilter, searchQuery, category?.id, isLoadedAll, hasAnyFilter]);

  // Close swipe when navigating away
  useFocusEffect(
    useCallback(() => () => closeOpenRow(), [closeOpenRow])
  );

  // Handle refresh
  const onRefresh = () => {
    if (!hasAnyFilter && !isLoadedAll) return;
    setRefreshing(true);
    fetchUserTransactions();
  };

  // Transactions are already filtered by the service function
  const filteredTransactions = transactions;

  const resultTotals = (() => {
    let expense = 0;
    let income = 0;
    for (const section of filteredTransactions) {
      for (const tx of section.data) {
        if (tx.type === "expense") expense += tx.amount || 0;
        else if (tx.type === "income") income += tx.amount || 0;
      }
    }
    return { expense, income };
  })();

  const categories: Category[] = (() => {
    const exp = getExpenseCategories(t);
    const inc = getIncomeCategories(t);
    if (activeFilter === "expense") return exp;
    if (activeFilter === "income") return inc;
    const map = new Map<string, Category>();
    for (const c of [...exp, ...inc]) map.set(c.id, c);
    return [...map.values()];
  })();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="flex-1">
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                style={{
                  padding: 8,
                  borderRadius: 12,
                  backgroundColor: theme.cardBackground,
                  marginRight: 12,
                }}
                onPress={() => router.back()}
              >
                <ArrowLeft size={22} color={theme.textMuted} />
              </TouchableOpacity>
              <View>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: "bold" }}>
                  {t.transactions || "Transactions"}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {transactions.reduce((sum, section) => sum + section.data.length, 0)} total
                </Text>
              </View>
            </View>
          </View>

          {!hasAnyFilter && !isLoadedAll ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsLoadedAll(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: theme.cardBackground,
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: `${theme.primary}18`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Layers size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "800", fontSize: 14 }}>
                    Load all transactions
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                    Or search to load only matching results
                  </Text>
                </View>
              </View>
              <View
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: theme.primary,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
                  Load
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Search Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 12,
            }}
          >
            <Search size={18} color={theme.textMuted} />
            <TextInput
              style={{
                flex: 1,
                padding: 12,
                color: theme.text,
                fontSize: 15,
                marginLeft: 8,
              }}
              placeholder={(t.searchTransactions || "Search...") + " (notes / description)"}
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Category filter */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t.category || "Category"}
              </Text>
              {category ? (
                <View
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>
                    {category.name}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setCategory(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                  {t.all || "All"}
                </Text>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsCategoryPickerOpen(true)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Filter Chips */}
          <View className="flex-row gap-2">
            {["all", "income", "expense"].map((filter) => (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: activeFilter === filter ? "#00BFFF" : theme.border,
                  backgroundColor: activeFilter === filter ? "#00BFFF" : theme.background,
                }}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={{
                    color: activeFilter === filter ? "#FFFFFF" : theme.textSecondary,
                    fontSize: 13,
                    fontWeight: activeFilter === filter ? "600" : "400",
                  }}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {(hasAnyFilter || isLoadedAll) && filteredTransactions.length > 0 ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                paddingVertical: 10,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: "700" }}>
                {t.summary || "Summary"}
              </Text>
              <Text
                style={{
                  color: theme.textMuted,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.15,
                }}
              >
                {t.expenses || "Expenses"} {resultTotals.expense.toFixed(2)}
                <Text style={{ color: theme.textMuted }}> · </Text>
                {t.income || "Income"} {resultTotals.income.toFixed(2)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Transactions List */}
        <SectionList
          sections={filteredTransactions}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}
          onScrollBeginDrag={closeOpenRow}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 10 }}>
              <MemoizedTransactionItem
                transaction={item}
                onPress={() =>
                  router.push(`/(transactions)/transaction-detail/${item.id}` as any)
                }
                onSwipeOpen={handleRowOpen}
                onSwipeStart={closeOpenRow}
                onSwipeClose={clearOpenRow}
              />
            </View>
          )}
          renderSectionHeader={({ section }) => {
            const expenseTotal = section.data
              .filter((tx) => tx.type === "expense")
              .reduce((sum, tx) => sum + (tx.amount || 0), 0);
            const incomeTotal = section.data
              .filter((tx) => tx.type === "income")
              .reduce((sum, tx) => sum + (tx.amount || 0), 0);

            return (
              <View
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: "600" }}>
                  {section.title}
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 11,
                    fontWeight: "500",
                    letterSpacing: 0.15,
                    flexShrink: 1,
                    textAlign: "right",
                    marginLeft: 12,
                  }}
                  numberOfLines={1}
                >
                  {t.expenses || "Expenses"} {expenseTotal.toFixed(2)}
                  <Text style={{ color: theme.textMuted }}> · </Text>
                  {t.income || "Income"} {incomeTotal.toFixed(2)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View
              style={{
                marginTop: 20,
                paddingVertical: 44,
                paddingHorizontal: 18,
                alignItems: "center",
                backgroundColor: theme.cardBackground,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: `${theme.primary}18`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <SearchIcon size={22} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "800" }}>
                {!hasAnyFilter && !isLoadedAll
                  ? "Start searching"
                  : "No transactions found"}
              </Text>
              <Text
                style={{
                  color: theme.textMuted,
                  fontSize: 13,
                  marginTop: 8,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                {!hasAnyFilter && !isLoadedAll
                  ? "Search by notes or description, or tap Load to see everything"
                  : "Try adjusting your filters"}
              </Text>
            </View>
          }
        />
      </View>

      <CategoryPickerSheet
        visible={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        categories={categories}
        onSelect={(cat) => setCategory(cat)}
        title={t.select_category || "Select category"}
      />
    </SafeAreaView>
  );
}
