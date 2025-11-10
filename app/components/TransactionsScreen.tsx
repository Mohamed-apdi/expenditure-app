// screens/TransactionsScreen.tsx
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  TextInput,
} from "react-native";
import { Search, ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "~/lib";
import { getTransactionsGroupedByDate } from "~/lib";
import { useAccount } from "~/lib";
import { formatDistanceToNow } from "date-fns";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

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
  const [transactions, setTransactions] = useState<TransactionSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch transactions from database using enhanced local functions
  const fetchUserTransactions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      // Use the new enhanced function that handles filtering and grouping
      const groupedTransactions = await getTransactionsGroupedByDate(user.id, {
        accountId: selectedAccount?.id,
        type: activeFilter === "all" ? undefined : activeFilter as "expense" | "income" | "transfer",
        searchQuery: searchQuery,
      });

      setTransactions(groupedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setRefreshing(false);
    }
  };


  // Load transactions on component mount and when filters change
  useEffect(() => {
    fetchUserTransactions();
  }, [selectedAccount?.id, activeFilter, searchQuery]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserTransactions();
  };

  // Transactions are already filtered by the service function
  const filteredTransactions = transactions;

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
              placeholder={t.searchTransactions || "Search..."}
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filter Chips */}
          <View className="flex-row gap-2">
            {["all", "income", "expense"].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: activeFilter === filter ? theme.primary : theme.border,
                  backgroundColor: activeFilter === filter ? `${theme.primary}20` : theme.background,
                }}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={{
                    color: activeFilter === filter ? theme.primary : theme.textSecondary,
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

        {/* Transactions List */}
        <SectionList
          sections={filteredTransactions}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                backgroundColor: theme.cardBackground,
                padding: 16,
                borderRadius: 16,
                marginBottom: 12,
              }}
              onPress={() => router.push(`/(transactions)/transaction-detail/${item.id}` as any)}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text
                    style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}
                    numberOfLines={1}
                  >
                    {item.description || item.category || "No description"}
                  </Text>
                  <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
                    {item.category && (
                      <View
                        style={{
                          backgroundColor: item.type === "expense"
                            ? '#fee2e2'
                            : item.type === "income"
                              ? '#dcfce7'
                              : '#dbeafe',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: item.type === "expense"
                              ? '#dc2626'
                              : item.type === "income"
                                ? '#16a34a'
                                : '#3b82f6',
                            fontSize: 11,
                            fontWeight: "600"
                          }}
                        >
                          {item.category}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      color: item.type === "expense"
                        ? "#ef4444"
                        : item.type === "income"
                          ? "#10b981"
                          : "#3b82f6",
                    }}
                  >
                    {item.type === "expense" ? "-" : "+"}${Math.abs(item.amount).toFixed(2)}
                  </Text>
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontSize: 11,
                      marginTop: 2,
                      textTransform: "capitalize",
                    }}
                  >
                    {item.type}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: "600" }}>
                {title}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View
              style={{
                paddingVertical: 64,
                alignItems: "center",
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
                marginTop: 20,
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: "500" }}>
                {searchQuery || activeFilter !== "all"
                  ? "No transactions found"
                  : "No transactions yet"}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}>
                {searchQuery || activeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Start by adding your first transaction"}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
