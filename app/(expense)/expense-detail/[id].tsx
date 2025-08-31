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
  Edit3,
  Trash2,
  Calendar,
  Tag,
  CreditCard,
  Repeat,
  ArrowUpRight,
  Receipt,
} from "lucide-react-native";
import { supabase } from "~/lib";
import { format } from "date-fns";
import { useTheme } from "~/lib";

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method: string;
  is_recurring: boolean;
  recurrence_interval?: string;
  is_essential: boolean;
  tags?: string[];
  created_at: string;
  receipt_url?: string;
};

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const theme = useTheme();
  // Fetch expense data
  const fetchExpense = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setExpense(data);
    } catch (error) {
      console.error("Error fetching expense:", error);
      Alert.alert("Error", "Failed to load expense details");
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!id) return;

    // Initial fetch
    fetchExpense();

    // Subscribe to changes
    const subscription = supabase
      .channel("expense_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "expenses",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setExpense(payload.new as Expense);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const handleDelete = async () => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const { error } = await supabase
                .from("expenses")
                .delete()
                .eq("id", id);

              if (error) throw error;
              router.push("/(main)/ExpenseListScreen");
            } catch (error) {
              console.error("Error deleting expense:", error);
              Alert.alert("Error", "Failed to delete expense");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Food: "#10b981",
      Transport: "#3b82f6",
      Utilities: "#f59e0b",
      Entertainment: "#8b5cf6",
      Healthcare: "#ef4444",
      Shopping: "#06b6d4",
      Education: "#84cc16",
      Other: "#64748b",
    };
    return colors[category] || "#64748b";
  };

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      cash: "Cash",
      credit_card: "Credit Card",
      debit_card: "Debit Card",
      digital_wallet: "Digital Wallet",
    };
    return methods[method] || "Unknown";
  };

  const handleViewReceipt = async () => {
    if (!expense?.receipt_url) return;

    try {
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(expense.receipt_url, 60); // 60 second URL expiry

      if (data?.signedUrl) {
        await Linking.openURL(data.signedUrl);
      }
    } catch (error) {
      console.error("Error opening receipt:", error);
      Alert.alert("Error", "Could not open receipt");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <Text className="text-white text-lg">Expense not found</Text>
        <TouchableOpacity
          className="mt-4 bg-emerald-500 px-6 py-3 rounded-lg"
          onPress={() => router.push("/expenses")}
        >
          <Text className="text-white font-bold">Back to Expenses</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        className="flex-row justify-between items-center px-6 py-4 border-b"
        style={{ borderColor: theme.border }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.icon} />
        </TouchableOpacity>
        <View className="flex-row gap-4">
          <TouchableOpacity
            onPress={() => router.push(`/(expense)/edit-expense/${expense.id}`)}
            disabled={deleting}
          >
            <Edit3 size={24} color={theme.icon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <Trash2 size={24} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display */}
        <View className="items-center py-8">
          <Text className="mb-1" style={{ color: theme.textSecondary }}>
            Amount Spent
          </Text>
          <Text className="text-rose-500 text-5xl font-bold">
            -${expense.amount.toFixed(2)}
          </Text>
        </View>

        {/* Main Details */}
        <View style={{ paddingHorizontal: 24, gap: 24, marginBottom: 32 }}>
          {/* Description */}
          <View>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Description
            </Text>
            <Text style={{ color: theme.text, fontSize: 18 }}>
              {expense.description}
            </Text>
          </View>

          {/* Category */}
          <View>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Category
            </Text>
            <View className="flex-row items-center">
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: `${getCategoryColor(expense.category)}20`,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: getCategoryColor(expense.category),
                  }}
                />
              </View>
              <Text style={{ color: theme.text, fontSize: 18 }}>
                {expense.category}
              </Text>
            </View>
          </View>

          {/* Date */}
          <View>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Date
            </Text>
            <View className="flex-row items-center">
              <Calendar size={18} color={theme.textSecondary} />
              <Text style={{ color: theme.text, fontSize: 18, marginLeft: 12 }}>
                {format(new Date(expense.date), "MMMM d, yyyy")}
              </Text>
            </View>
          </View>

          {/* Payment Method */}
          <View>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Payment Method
            </Text>
            <View className="flex-row items-center">
              <CreditCard size={18} color={theme.textSecondary} />
              <Text style={{ color: theme.text, fontSize: 18, marginLeft: 12 }}>
                {getPaymentMethodName(expense.payment_method)}
              </Text>
            </View>
          </View>

          {/* Recurrence */}
          {expense.is_recurring && (
            <View>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                Recurrence
              </Text>
              <View className="flex-row items-center">
                <Repeat size={18} color={theme.textSecondary} />
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 18,
                    marginLeft: 12,
                    textTransform: "capitalize",
                  }}
                >
                  {expense.recurrence_interval}
                </Text>
              </View>
            </View>
          )}

          {/* Type */}
          <View>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Type
            </Text>
            <View className="flex-row items-center">
              <Tag size={18} color={theme.textSecondary} />
              <Text style={{ color: theme.text, fontSize: 18, marginLeft: 12 }}>
                {expense.is_essential ? "Essential" : "Discretionary"}
              </Text>
            </View>
          </View>

          {/* Tags */}
          {expense.tags && expense.tags.length > 0 && (
            <View>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                Tags
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {expense.tags.map((tag, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderColor: theme.border,
                      borderWidth: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 999,
                      marginRight: 6,
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Created At */}
          <View>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Recorded
            </Text>
            <Text style={{ color: theme.textSecondary }}>
              {format(new Date(expense.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
