import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft,
  Tag,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Receipt,
  MapPin,
  Building,
  Wallet,
  TrendingUp,
  AlertCircle,
  FileText,
  Heart,
} from "lucide-react-native";
import { supabase } from "~/lib";
import { format, formatDistanceToNow } from "date-fns";
import { useTheme } from "~/lib";

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  date: string;
  created_at: string;
  type: "expense" | "income" | "transfer";
  account_id: string;

  is_recurring?: boolean;
  recurrence_interval?: string;
  location?: string;
  tags?: string[];
  receipt_url?: string;
  notes?: string;
  // Account details
  account?: {
    id: string;
    name: string;
    account_type: string;
    amount: number;
  };
  // Transfer specific
  from_account_id?: string;
  to_account_id?: string;
  from_account?: {
    id: string;
    name: string;
    account_type: string;
  };
  to_account?: {
    id: string;
    name: string;
    account_type: string;
  };
};

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  // Fetch transaction data
  const fetchTransaction = async () => {
    try {
      // First, get the basic transaction data
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (transactionError && transactionError.code !== "PGRST116") {
        // If not found in transactions, try expenses table for backward compatibility
        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .select("*")
          .eq("id", id)
          .single();

        if (expenseError) throw expenseError;

        // Get account data for expense
        if (expenseData.account_id) {
          const { data: accountData } = await supabase
            .from("accounts")
            .select("id, name, account_type, amount")
            .eq("id", expenseData.account_id)
            .single();

          setTransaction({
            ...expenseData,
            type: "expense" as const,
            account: accountData,
          });
        } else {
          setTransaction({
            ...expenseData,
            type: "expense" as const,
          });
        }
        return;
      }

      if (transactionData) {
        // Fetch related account data separately
        const accountPromises = [];

        // Main account
        if (transactionData.account_id) {
          accountPromises.push(
            supabase
              .from("accounts")
              .select("id, name, account_type, amount")
              .eq("id", transactionData.account_id)
              .single()
              .then(({ data }) => ({ type: "account", data }))
          );
        }

        // From account (for transfers)
        if (transactionData.from_account_id) {
          accountPromises.push(
            supabase
              .from("accounts")
              .select("id, name, account_type, amount")
              .eq("id", transactionData.from_account_id)
              .single()
              .then(({ data }) => ({ type: "from_account", data }))
          );
        }

        // To account (for transfers)
        if (transactionData.to_account_id) {
          accountPromises.push(
            supabase
              .from("accounts")
              .select("id, name, account_type, amount")
              .eq("id", transactionData.to_account_id)
              .single()
              .then(({ data }) => ({ type: "to_account", data }))
          );
        }

        // Fetch all account data
        const accountResults = await Promise.all(accountPromises);

        // Build the final transaction object
        const enrichedTransaction = { ...transactionData };

        accountResults.forEach((result) => {
          if (result.data) {
            enrichedTransaction[result.type] = result.data;
          }
        });

        setTransaction(enrichedTransaction);
      } else {
        throw new Error("Transaction not found");
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      Alert.alert("Error", "Failed to load transaction details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchTransaction();
  }, [id]);



  const getCategoryIcon = (category: string, type: string) => {
    if (type === "transfer") return ArrowRightLeft;
    if (type === "income") return TrendingUp;

    // Expense categories
    const icons: Record<string, React.ElementType> = {
      "Food & Drinks": Receipt,
      "Home & Rent": Building,
      Travel: MapPin,
      Bills: CreditCard,
      Fun: Wallet,
      Health: Heart,
      Shopping: Tag,
      Learning: FileText,
      // Add more as needed
    };
    return icons[category] || Receipt;
  };

  const getCategoryColor = (category: string, type: string) => {
    if (type === "income") return "#10b981";
    if (type === "transfer") return "#3b82f6";

    const colors: Record<string, string> = {
      "Food & Drinks": "#10b981",
      "Home & Rent": "#f59e0b",
      Travel: "#3b82f6",
      Bills: "#f59e0b",
      Fun: "#8b5cf6",
      Health: "#ef4444",
      Shopping: "#06b6d4",
      Learning: "#84cc16",
    };
    return colors[category] || "#64748b";
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return ArrowDownLeft;
      case "expense":
        return ArrowUpRight;
      case "transfer":
        return ArrowRightLeft;
      default:
        return Receipt;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "income":
        return "#10b981";
      case "expense":
        return "#ef4444";
      case "transfer":
        return "#3b82f6";
      default:
        return "#64748b";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <AlertCircle size={64} color={theme.textMuted} />
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600", marginTop: 16 }}>
            Transaction Not Found
          </Text>
          <Text style={{ color: theme.textSecondary, textAlign: "center", marginTop: 8, marginBottom: 24 }}>
            This transaction doesn't exist or has been deleted
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: theme.primaryText, fontWeight: "600" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const TransactionIcon = getTransactionIcon(transaction.type);
  const transactionColor = getTransactionColor(transaction.type);
  const CategoryIcon = getCategoryIcon(
    transaction.category || "",
    transaction.type
  );
  const categoryColor = getCategoryColor(
    transaction.category || "",
    transaction.type
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          gap: 12,
        }}
      >
        <TouchableOpacity
          style={{
            padding: 8,
            borderRadius: 12,
            backgroundColor: theme.cardBackground,
          }}
          onPress={() => router.back()}
        >
          <ChevronLeft size={22} color={theme.textMuted} />
        </TouchableOpacity>

        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "bold" }}>
          Transaction Details
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
      >
        {/* Amount Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: transactionColor + "20",
              borderRadius: 40,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <TransactionIcon size={28} color={transactionColor} />
          </View>

          <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8 }}>
            {transaction.type === "expense"
              ? "Amount Spent"
              : transaction.type === "income"
                ? "Amount Received"
                : "Amount Transferred"}
          </Text>

          <Text
            style={{
              color: transactionColor,
              fontSize: 36,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            {transaction.type === "expense" ? "-" : transaction.type === "income" ? "+" : ""}
            ${transaction.amount.toFixed(2)}
          </Text>

          <View
            style={{
              backgroundColor: transactionColor + "15",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: transactionColor,
                fontSize: 12,
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {transaction.type}
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "bold", marginBottom: 16 }}>
            Details
          </Text>

          <View style={{ gap: 12 }}>
            {/* Description */}
            {transaction.description && (
              <View>
                <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 4 }}>
                  Description
                </Text>
                <Text style={{ color: theme.text, fontSize: 15 }}>
                  {transaction.description}
                </Text>
              </View>
            )}

            {/* Category */}
            {transaction.category && (
              <View>
                <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 4 }}>
                  Category
                </Text>
                <View
                  style={{
                    backgroundColor: categoryColor + "20",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ color: categoryColor, fontSize: 13, fontWeight: "600" }}>
                    {transaction.category}
                  </Text>
                </View>
              </View>
            )}

            {/* Date */}
            <View>
              <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 4 }}>
                Date
              </Text>
              <Text style={{ color: theme.text, fontSize: 15, marginBottom: 2 }}>
                {format(new Date(transaction.date), "EEEE, MMMM d, yyyy")}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {formatDistanceToNow(new Date(transaction.date), { addSuffix: true })}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Card */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>
            {transaction.type === "transfer" ? "Accounts" : "Account"}
          </Text>

          {transaction.type === "transfer" ? (
            <View style={{ gap: 12 }}>
              {/* From Account */}
              {transaction.from_account && (
                <View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 4 }}>
                    From
                  </Text>
                  <View className="flex-row items-center">
                    <View
                      style={{
                        backgroundColor: '#fee2e2',
                        borderRadius: 20,
                        padding: 6,
                        marginRight: 8,
                      }}
                    >
                      <Wallet size={14} color="#ef4444" />
                    </View>
                    <View>
                      <Text style={{ color: theme.text, fontSize: 15, fontWeight: "500" }}>
                        {transaction.from_account.name}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                        {transaction.from_account.account_type}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* To Account */}
              {transaction.to_account && (
                <View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 4 }}>
                    To
                  </Text>
                  <View className="flex-row items-center">
                    <View
                      style={{
                        backgroundColor: '#dcfce7',
                        borderRadius: 20,
                        padding: 6,
                        marginRight: 8,
                      }}
                    >
                      <Wallet size={14} color="#10b981" />
                    </View>
                    <View>
                      <Text style={{ color: theme.text, fontSize: 15, fontWeight: "500" }}>
                        {transaction.to_account.name}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                        {transaction.to_account.account_type}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            // Single Account
            transaction.account && (
              <View className="flex-row items-center">
                <View
                  style={{
                    backgroundColor: transactionColor + "20",
                    borderRadius: 20,
                    padding: 8,
                    marginRight: 10,
                  }}
                >
                  <Wallet size={16} color={transactionColor} />
                </View>
                <View>
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: "500" }}>
                    {transaction.account.name}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {transaction.account.account_type} • ${transaction.account.amount.toFixed(2)}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>

        {/* Additional Info (if any) */}
        {(transaction.is_recurring || transaction.notes) && (
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View style={{ gap: 12 }}>
              {transaction.is_recurring && (
                <View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 4 }}>
                    Recurring
                  </Text>
                  <View
                    style={{
                      backgroundColor: `${theme.primary}15`,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "600" }}>
                      {transaction.recurrence_interval
                        ? transaction.recurrence_interval.charAt(0).toUpperCase() + transaction.recurrence_interval.slice(1)
                        : "Yes"}
                    </Text>
                  </View>
                </View>
              )}

              {transaction.notes && (
                <View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 4 }}>
                    Notes
                  </Text>
                  <Text style={{ color: theme.text, fontSize: 15 }}>
                    {transaction.notes}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
