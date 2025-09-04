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
import {
  fetchAllTransactionsAndTransfers,
  deleteTransactionWithBalanceUpdate,
} from "~/lib";
import { format, formatDistanceToNow } from "date-fns";
import { useTheme } from "~/lib";
import Toast from "react-native-toast-message";
import { useAccount } from "~/lib";

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
  const { refreshBalances } = useAccount();
  const [transaction, setTransaction] = useState<
    | (Transaction & {
        isTransfer?: boolean;
        transferId?: string;
        from_account_id?: string;
        to_account_id?: string;
        transferDirection?: "from" | "to";
      })
    | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const theme = useTheme();

  // Fetch transaction data
  const fetchTransaction = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "Please log in first");
        router.back();
        return;
      }

      // Fetch all transactions and transfers to find the one we're viewing
      const allTransactions = await fetchAllTransactionsAndTransfers(user.id);
      const targetTransaction = allTransactions.find((t) => t.id === id);

      if (!targetTransaction) {
        Alert.alert("Error", "Transaction/Transfer not found");
        router.back();
        return;
      }

      // Check if this is a transfer
      if (targetTransaction.isTransfer) {
        // Extract the original transfer ID from the composite ID
        const transferId = targetTransaction.transferId || id;

        // Load the actual transfer data with account details
        const { data: transferData } = await supabase
          .from("transfers")
          .select(
            `
            *,
            from_account:accounts!transfers_from_account_id_fkey(id, name, account_type, amount),
            to_account:accounts!transfers_to_account_id_fkey(id, name, account_type, amount)
          `
          )
          .eq("id", transferId)
          .single();

        if (transferData) {
          setTransaction({
            ...transferData,
            type: "transfer", // Always set type to transfer for transfer transactions
            account:
              targetTransaction.transferDirection === "from"
                ? transferData.from_account
                : transferData.to_account,
            from_account: transferData.from_account,
            to_account: transferData.to_account,
            // Override the ID to match the composite ID for proper navigation
            id: targetTransaction.id,
            isTransfer: true,
            transferId: transferId,
            transferDirection: targetTransaction.transferDirection,
          });
        }
      } else {
        // Handle regular transaction
        // Fetch account data
        const { data: accountData } = await supabase
          .from("accounts")
          .select("id, name, account_type, amount")
          .eq("id", targetTransaction.account_id)
          .single();

        setTransaction({
          ...targetTransaction,
          account: accountData || undefined,
        });
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
    if (!transaction) return;

    const transactionType = transaction.isTransfer
      ? "transfer"
      : transaction.type;
    const transactionDescription =
      transaction.description || transaction.category || "this transaction";

    Alert.alert(
      "Delete Transaction",
      `Are you sure you want to delete ${transactionDescription}? This action cannot be undone and will update your account balance accordingly.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);

              // Use the comprehensive delete function with balance updates
              await deleteTransactionWithBalanceUpdate(
                transaction.id,
                transaction.isTransfer || false,
                transaction.transferId
              );

              // Refresh account balances
              await refreshBalances();

              Toast.show({
                type: "success",
                text1: "Transaction Deleted",
                text2: `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} has been successfully deleted and account balances updated.`,
              });

              router.back();
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert(
                "Error",
                `Failed to delete ${transactionType}. Please try again.`
              );
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

    let shareText = "";

    if (
      transaction.type === "transfer" &&
      transaction.from_account &&
      transaction.to_account
    ) {
      shareText = `Transfer Details:
        Amount Transferred: $${transaction.amount.toFixed(2)}
        From Account: ${transaction.from_account.name} (${transaction.from_account.account_type})
        To Account: ${transaction.to_account.name} (${transaction.to_account.account_type})
        Description: ${transaction.description || "N/A"}
        Date: ${format(new Date(transaction.date), "MMMM d, yyyy")}
        Type: Transfer`;
    } else {
      shareText = `Transaction Details:
        Amount: ${transaction.type === "expense" ? "-" : "+"}$${transaction.amount.toFixed(2)}
        Category: ${transaction.category || "N/A"}
        Description: ${transaction.description || "N/A"}
        Date: ${format(new Date(transaction.date), "MMMM d, yyyy")}
        Type: ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}`;
    }

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
          {transaction.type === "transfer"
            ? "Transfer Details"
            : "Transaction Details"}
        </Text>

        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={handleShare}>
            <Share2 size={24} color={theme.icon} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.push(`/(transactions)/edit-transaction/${transaction.id}`)
            }
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
              {transaction.type === "transfer"
                ? "Amount Transferred"
                : transaction.type === "expense"
                  ? "Amount Spent"
                  : "Amount Received"}
            </Text>

            <Text
              style={{
                color:
                  transaction.type === "transfer"
                    ? transaction.transferDirection === "from"
                      ? "#ef4444"
                      : "#10b981"
                    : transactionColor,
                fontSize: 42,
                fontWeight: "700",
                marginBottom: 8,
              }}
            >
              {transaction.type === "transfer"
                ? (transaction.transferDirection === "from" ? "-" : "+") +
                  "$" +
                  transaction.amount.toFixed(2)
                : (transaction.type === "expense" ? "-" : "+") +
                  "$" +
                  transaction.amount.toFixed(2)}
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
                  marginLeft: 5,
                  fontSize: 10,
                  fontWeight: "600",
                }}
              >
                {transaction.type === "transfer"
                  ? "Transfer Completed"
                  : transaction.type.charAt(0).toUpperCase() +
                    transaction.type.slice(1) +
                    " Completed"}
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
              {transaction.type === "transfer"
                ? "Transfer Details"
                : "Account Details"}
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
          {transaction.is_recurring && (
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
                  {transaction.recurrence_interval
                    ? transaction.recurrence_interval.charAt(0).toUpperCase() +
                      transaction.recurrence_interval.slice(1)
                    : "Yes"}
                </Text>
              </View>
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
                      fontSize: 10,
                      fontWeight: "500",
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
