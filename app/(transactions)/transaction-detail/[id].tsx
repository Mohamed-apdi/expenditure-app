import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Receipt,
  Wallet,
  TrendingUp,
  AlertCircle,
} from "lucide-react-native";
import { format, formatDistanceToNow } from "date-fns";
import {
  getCurrentUserOfflineFirst,
  selectTransactionById,
  selectExpenseById,
  selectAccountById,
  supabase,
  updateTransactionLocal,
  updateExpenseLocal,
  isOfflineGateLocked,
  triggerSync,
  useTheme,
  useScreenStatusBar,
  useLanguage,
  setCategoryMemoryForUser,
} from "~/lib";
import { markEvcNoteUserEdited } from "~/lib/evc/evcNoteUserEdited";
import {
  evcDetailViaLabel,
  getTransactionSource,
} from "~/lib/evc/transactionSource";
import { EvcCategoryChips } from "~/components/evc/EvcCategoryChips";
import {
  categoryColorFromStored,
  categoryIconFromStored,
  categoryLabelFromStored,
} from "~/lib/utils/categories";

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  date: string;
  created_at: string;
  type: "expense" | "income" | "transfer";
  account_id: string;
  evc_kind?: "merchant" | "transfer" | null;
  evc_counterparty_phone?: string | null;
  source_expense_id?: string | null;
  source?: "evc";

  is_recurring?: boolean;
  recurrence_interval?: string;
  location?: string;
  tags?: string[];
  receipt_url?: string;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const theme = useTheme();
  const { t } = useLanguage();
  useScreenStatusBar();

  // Fetch transaction data
  const fetchTransaction = async () => {
    try {
      const txId = Array.isArray(id) ? id[0] : id;
      if (!txId || typeof txId !== "string") {
        throw new Error("Invalid transaction id");
      }

      const user = await getCurrentUserOfflineFirst();
      if (!user) throw new Error("Please sign in");
      setCurrentUserId(user.id);

      // 1) Try local transactions store first (offline-first)
      const localTx = selectTransactionById(user.id, txId);
      if (localTx) {
        const mainAccount =
          localTx.account_id &&
          selectAccountById(user.id, localTx.account_id);
        const fromAccount =
          (localTx as any).from_account_id &&
          selectAccountById(user.id, (localTx as any).from_account_id);
        const toAccount =
          (localTx as any).to_account_id &&
          selectAccountById(user.id, (localTx as any).to_account_id);

        const enriched: Transaction = {
          ...(localTx as any),
          account: mainAccount
            ? {
                id: mainAccount.id,
                name: mainAccount.name,
                account_type: mainAccount.account_type,
                amount: mainAccount.amount,
              }
            : undefined,
          from_account: fromAccount
            ? {
                id: fromAccount.id,
                name: fromAccount.name,
                account_type: fromAccount.account_type,
              }
            : undefined,
          to_account: toAccount
            ? {
                id: toAccount.id,
                name: toAccount.name,
                account_type: toAccount.account_type,
              }
            : undefined,
        };

        setTransaction(enriched);
        return;
      }

      // 2) Fallback to local expenses store for legacy expense rows
      const localExpense = selectExpenseById(user.id, txId);
      if (localExpense) {
        const account =
          localExpense.account_id &&
          selectAccountById(user.id, localExpense.account_id);

        const enriched: Transaction = {
          ...(localExpense as any),
          type: "expense",
          account: account
            ? {
                id: account.id,
                name: account.name,
                account_type: account.account_type,
                amount: account.amount,
              }
            : undefined,
        };

        setTransaction(enriched);
        return;
      }

      // 3) Final fallback: fetch from Supabase (transactions → expenses)
      const {
        data: transactionData,
        error: transactionError,
      } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", txId)
        .single();

      if (transactionError) {
        if (transactionError.code !== "PGRST116") {
          throw transactionError;
        }

        // Not found in transactions: try expenses table
        const {
          data: expenseData,
          error: expenseError,
        } = await supabase
          .from("expenses")
          .select("*")
          .eq("id", txId)
          .single();

        if (expenseError) throw expenseError;

        if (expenseData) {
          if (expenseData.account_id) {
            const { data: accountData } = await supabase
              .from("accounts")
              .select("id, name, account_type, amount")
              .eq("id", expenseData.account_id)
              .single();

            setTransaction({
              ...expenseData,
              type: "expense" as const,
              account: accountData ?? undefined,
            });
          } else {
            setTransaction({
              ...expenseData,
              type: "expense" as const,
            });
          }
          return;
        }
      }

      if (transactionData) {
        // Fetch related account data separately
        const accountPromises: Array<
          Promise<{ type: "account" | "from_account" | "to_account"; data: any }>
        > = [];

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

        const accountResults = await Promise.all(accountPromises);

        const enrichedTransaction: any = { ...transactionData };

        accountResults.forEach((result) => {
          if (result.data) {
            enrichedTransaction[result.type] = result.data;
          }
        });

        setTransaction(enrichedTransaction as Transaction);
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

  useEffect(() => {
    if (!transaction) return;
    setNoteText(transaction.description ?? "");
  }, [transaction?.id, transaction?.description]);

  async function saveNoteFromField() {
    if (!transaction) return;
    const user = await getCurrentUserOfflineFirst();
    if (!user) return;

    const trimmed = noteText.trim();
    const prev = (transaction.description ?? "").trim();
    if (trimmed === prev) return;

    const persistEvcNoteMemory = (phoneRaw: string | null | undefined) => {
      if (!phoneRaw?.trim()) return;
      setCategoryMemoryForUser(user.id, {
        phoneRaw,
        note: trimmed,
      });
    };

    const localTx = selectTransactionById(user.id, transaction.id);
    if (localTx) {
      updateTransactionLocal(transaction.id, {
        description: trimmed.length ? trimmed : undefined,
      });
      await markEvcNoteUserEdited(transaction.id);
      if (localTx.source_expense_id) {
        updateExpenseLocal(localTx.source_expense_id, {
          description: trimmed.length ? trimmed : undefined,
        });
        await markEvcNoteUserEdited(localTx.source_expense_id);
      }
      let evcPhone = localTx.evc_counterparty_phone;
      if (!evcPhone?.trim() && localTx.source_expense_id) {
        evcPhone = selectExpenseById(user.id, localTx.source_expense_id)
          ?.evc_counterparty_phone;
      }
      persistEvcNoteMemory(evcPhone);
      if (!(await isOfflineGateLocked())) void triggerSync();
      await fetchTransaction();
      return;
    }

    const localEx = selectExpenseById(user.id, transaction.id);
    if (localEx) {
      updateExpenseLocal(transaction.id, {
        description: trimmed.length ? trimmed : undefined,
      });
      await markEvcNoteUserEdited(transaction.id);
      persistEvcNoteMemory(localEx.evc_counterparty_phone);
      if (!(await isOfflineGateLocked())) void triggerSync();
      await fetchTransaction();
      return;
    }

    const payload = {
      description: trimmed.length ? trimmed : null,
      updated_at: new Date().toISOString(),
    };
    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", transaction.id)
      .eq("user_id", user.id)
      .select("id");
    if (!txErr && txRows && txRows.length > 0) {
      await markEvcNoteUserEdited(transaction.id);
      persistEvcNoteMemory(
        (transaction as { evc_counterparty_phone?: string | null })
          .evc_counterparty_phone,
      );
      if (!(await isOfflineGateLocked())) void triggerSync();
      await fetchTransaction();
      return;
    }
    const { data: exRows, error: exErr } = await supabase
      .from("expenses")
      .update(payload)
      .eq("id", transaction.id)
      .eq("user_id", user.id)
      .select("id");
    if (!exErr && exRows && exRows.length > 0) {
      await markEvcNoteUserEdited(transaction.id);
      persistEvcNoteMemory(
        (transaction as { evc_counterparty_phone?: string | null })
          .evc_counterparty_phone,
      );
      if (!(await isOfflineGateLocked())) void triggerSync();
      await fetchTransaction();
    }
  }

  const getCategoryIcon = (category: string, type: string) => {
    if (type === "transfer") return ArrowRightLeft;
    if (type === "income") return TrendingUp;
    return categoryIconFromStored(t, category);
  };

  const getCategoryColor = (category: string, type: string) => {
    if (type === "income") return "#10b981";
    if (type === "transfer") return "#3b82f6";
    return categoryColorFromStored(t, category);
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
  const evcViaLine =
    getTransactionSource(transaction) === "evc"
      ? evcDetailViaLabel(transaction, {
          sentViaEvc: t.transactionSentViaEvc,
          receivedViaEvc: t.transactionReceivedViaEvc,
        })
      : null;
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
          {evcViaLine ? (
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 12,
                marginTop: 10,
                textAlign: "center",
              }}
            >
              {evcViaLine}
            </Text>
          ) : null}
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
            <View>
              <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 4 }}>
                Note
              </Text>
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                onBlur={() => void saveNoteFromField()}
                placeholder={t.add_note_about_transaction}
                placeholderTextColor={theme.textMuted}
                multiline
                style={{
                  color: theme.text,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  minHeight: 48,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Category */}
            {transaction.category ? (
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
                    {categoryLabelFromStored(t, transaction.category)}
                  </Text>
                </View>
              </View>
            ) : null}

            {transaction.evc_kind === "transfer" &&
            currentUserId &&
            !String(transaction.category ?? "").trim() &&
            transaction.evc_counterparty_phone ? (
              <View style={{ marginTop: 4 }}>
                <EvcCategoryChips
                  userId={currentUserId}
                  transactionId={transaction.id}
                  normalizedPhone={transaction.evc_counterparty_phone}
                  onApplied={() => {
                    void fetchTransaction();
                  }}
                />
              </View>
            ) : null}

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
        {transaction.is_recurring && (
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

            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
