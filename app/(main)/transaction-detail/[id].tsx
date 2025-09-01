import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
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
  ArrowDownLeft,
  ArrowRightLeft,
  Receipt,
  Share2,
  Copy,
  MapPin,
  Clock,
  User,
  Building,
  Wallet,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Hash,
  FileText,
  Heart,
} from "lucide-react-native";
import { supabase } from "~/lib";
import { format, formatDistanceToNow } from "date-fns";
import { useTheme } from "~/lib";
import Toast from "react-native-toast-message";

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
  const [deleting, setDeleting] = useState(false);
  const theme = useTheme();

  // Fetch transaction data
  const fetchTransaction = async () => {
    try {
      setLoading(true);

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

  const handleDelete = async () => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);

              // Delete from appropriate table
              const table =
                transaction?.type === "expense" ? "expenses" : "transactions";
              const { error } = await supabase
                .from(table)
                .delete()
                .eq("id", id);

              if (error) throw error;

              Toast.show({
                type: "success",
                text1: "Transaction Deleted",
                text2: "The transaction has been successfully deleted.",
              });

              router.back();
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert("Error", "Failed to delete transaction");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!transaction) return;

    const shareText = `Transaction Details:
Amount: ${transaction.type === "expense" ? "-" : "+"}$${transaction.amount.toFixed(2)}
Category: ${transaction.category || "N/A"}
Description: ${transaction.description || "N/A"}
Date: ${format(new Date(transaction.date), "MMMM d, yyyy")}
Type: ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}`;

    try {
      await Share.share({
        message: shareText,
        title: "Transaction Details",
      });
    } catch (error) {
      console.error("Error sharing transaction:", error);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      // Note: React Native doesn't have built-in clipboard API
      // You might want to add @react-native-clipboard/clipboard package
      Toast.show({
        type: "success",
        text1: "Copied",
        text2: `${label} copied to clipboard`,
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

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
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            Loading transaction details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <AlertCircle size={48} color={theme.textSecondary} />
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "600",
              marginTop: 16,
            }}
          >
            Transaction Not Found
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            The transaction you're looking for doesn't exist or has been
            deleted.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 24,
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Go Back</Text>
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
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.icon} />
        </TouchableOpacity>

        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>
          Transaction Details
        </Text>

        <View style={{ flexDirection: "row", gap: 16 }}>
          {/*<TouchableOpacity onPress={handleShare}>
            <Share2 size={24} color={theme.icon} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(expense)/edit-expense/${transaction.id}`)}
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
          </TouchableOpacity>*/}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Transaction Header Card */}
        <View
          style={{
            margin: 20,
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            padding: 24,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                backgroundColor: transactionColor + "20",
                borderRadius: 50,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <TransactionIcon size={32} color={transactionColor} />
            </View>

            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              {transaction.type === "expense"
                ? "Amount Spent"
                : transaction.type === "income"
                  ? "Amount Received"
                  : "Amount Transferred"}
            </Text>

            <Text
              style={{
                color: transactionColor,
                fontSize: 42,
                fontWeight: "700",
                marginBottom: 8,
              }}
            >
              {transaction.type === "expense"
                ? "-"
                : transaction.type === "income"
                  ? "+"
                  : ""}
              ${transaction.amount.toFixed(2)}
            </Text>

            <View
              style={{
                backgroundColor: theme.success + "20",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <CheckCircle size={14} color={theme.success} />
              <Text
                style={{
                  color: theme.success,
                  marginLeft: 6,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {transaction.type.charAt(0).toUpperCase() +
                  transaction.type.slice(1)}{" "}
                Completed
              </Text>
            </View>
          </View>
        </View>

        {/* Transaction Details */}
        <View style={{ paddingHorizontal: 20 }}>
          {/* Basic Information */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 16,
              }}
            >
              Transaction Information
            </Text>

            {/* Description */}
            {transaction.description && (
              <View style={{ marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <FileText size={16} color={theme.textSecondary} />
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginLeft: 8,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Description
                  </Text>
                  <TouchableOpacity
                    style={{ marginLeft: "auto" }}
                    onPress={() =>
                      copyToClipboard(
                        transaction.description || "",
                        "Description"
                      )
                    }
                  >
                    <Copy size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: theme.text, fontSize: 16 }}>
                  {transaction.description}
                </Text>
              </View>
            )}

            {/* Category */}
            {transaction.category && (
              <View style={{ marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Tag size={16} color={theme.textSecondary} />
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginLeft: 8,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Category
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      backgroundColor: categoryColor + "20",
                      borderRadius: 8,
                      padding: 8,
                      marginRight: 12,
                    }}
                  >
                    <CategoryIcon size={16} color={categoryColor} />
                  </View>
                  <Text style={{ color: theme.text, fontSize: 16 }}>
                    {transaction.category}
                  </Text>
                </View>
              </View>
            )}

            {/* Date */}
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Calendar size={16} color={theme.textSecondary} />
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginLeft: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Transaction Date
                </Text>
              </View>
              <Text style={{ color: theme.text, fontSize: 16 }}>
                {format(new Date(transaction.date), "EEEE, MMMM d, yyyy")}
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {formatDistanceToNow(new Date(transaction.date), {
                  addSuffix: true,
                })}
              </Text>
            </View>

            {/* Transaction ID */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Hash size={16} color={theme.textSecondary} />
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginLeft: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Transaction ID
                </Text>
                <TouchableOpacity
                  style={{ marginLeft: "auto" }}
                  onPress={() =>
                    copyToClipboard(transaction.id, "Transaction ID")
                  }
                >
                  <Copy size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 14,
                  fontFamily: "monospace",
                }}
              >
                {transaction.id}
              </Text>
            </View>
          </View>

          {/* Account Information */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 16,
              }}
            >
              Account Details
            </Text>

            {transaction.type === "transfer" ? (
              <>
                {/* From Account */}
                {transaction.from_account && (
                  <View style={{ marginBottom: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <ArrowUpRight size={16} color={theme.textSecondary} />
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontSize: 12,
                          marginLeft: 8,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        From Account
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View
                        style={{
                          backgroundColor: theme.primary + "20",
                          borderRadius: 8,
                          padding: 8,
                          marginRight: 12,
                        }}
                      >
                        <Wallet size={16} color={theme.primary} />
                      </View>
                      <View>
                        <Text style={{ color: theme.text, fontSize: 16 }}>
                          {transaction.from_account.name}
                        </Text>
                        <Text
                          style={{ color: theme.textSecondary, fontSize: 14 }}
                        >
                          {transaction.from_account.account_type}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* To Account */}
                {transaction.to_account && (
                  <View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <ArrowDownLeft size={16} color={theme.textSecondary} />
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontSize: 12,
                          marginLeft: 8,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        To Account
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View
                        style={{
                          backgroundColor: theme.success + "20",
                          borderRadius: 8,
                          padding: 8,
                          marginRight: 12,
                        }}
                      >
                        <Wallet size={16} color={theme.success} />
                      </View>
                      <View>
                        <Text style={{ color: theme.text, fontSize: 16 }}>
                          {transaction.to_account.name}
                        </Text>
                        <Text
                          style={{ color: theme.textSecondary, fontSize: 14 }}
                        >
                          {transaction.to_account.account_type}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : (
              // Single Account (Income/Expense)
              transaction.account && (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Wallet size={16} color={theme.textSecondary} />
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 12,
                        marginLeft: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Account
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        backgroundColor: transactionColor + "20",
                        borderRadius: 8,
                        padding: 8,
                        marginRight: 12,
                      }}
                    >
                      <Wallet size={16} color={transactionColor} />
                    </View>
                    <View>
                      <Text style={{ color: theme.text, fontSize: 16 }}>
                        {transaction.account.name}
                      </Text>
                      <Text
                        style={{ color: theme.textSecondary, fontSize: 14 }}
                      >
                        {transaction.account.account_type} • $
                        {transaction.account.amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            )}
          </View>

          {/* Additional Details */}
          {(transaction.is_recurring ||
            transaction.location ||
            transaction.notes) && (
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 16,
                }}
              >
                Additional Information
              </Text>

              {/* Recurring */}
              {transaction.is_recurring && (
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Repeat size={16} color={theme.textSecondary} />
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 12,
                        marginLeft: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Recurring
                    </Text>
                  </View>
                  <Text style={{ color: theme.text, fontSize: 16 }}>
                    {transaction.recurrence_interval?.charAt(0).toUpperCase() +
                      transaction.recurrence_interval?.slice(1) || "Yes"}
                  </Text>
                </View>
              )}

              {/* Location */}
              {transaction.location && (
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <MapPin size={16} color={theme.textSecondary} />
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 12,
                        marginLeft: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Location
                    </Text>
                  </View>
                  <Text style={{ color: theme.text, fontSize: 16 }}>
                    {transaction.location}
                  </Text>
                </View>
              )}

              {/* Notes */}
              {transaction.notes && (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <FileText size={16} color={theme.textSecondary} />
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 12,
                        marginLeft: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Notes
                    </Text>
                  </View>
                  <Text style={{ color: theme.text, fontSize: 16 }}>
                    {transaction.notes}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Metadata */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
              padding: 20,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 16,
              }}
            >
              Metadata
            </Text>

            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Clock size={16} color={theme.textSecondary} />
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginLeft: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Created
                </Text>
              </View>
              <Text style={{ color: theme.text, fontSize: 16 }}>
                {format(
                  new Date(transaction.created_at),
                  "EEEE, MMMM d, yyyy 'at' h:mm a"
                )}
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {formatDistanceToNow(new Date(transaction.created_at), {
                  addSuffix: true,
                })}
              </Text>
            </View>

            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <DollarSign size={16} color={theme.textSecondary} />
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginLeft: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Transaction Type
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: transactionColor + "20",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: transactionColor,
                      fontSize: 12,
                      fontWeight: "600",
                      textTransform: "uppercase",
                    }}
                  >
                    {transaction.type}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
