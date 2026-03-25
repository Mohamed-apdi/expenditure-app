import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { observe } from "@legendapp/state";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { RectButton } from "react-native-gesture-handler";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MoreHorizontal, Pencil, Trash2, Inbox } from "lucide-react-native";
import { useTheme, useLanguage, getCurrentUserOfflineFirst, useAccount } from "~/lib";
import { selectTransactions, deleteTransactionLocal, transactions$ } from "~/lib/stores/transactionsStore";
import { updateAccountLocal, updateAccountBalance } from "~/lib/stores/accountsStore";
import { isOfflineGateLocked, triggerSync } from "~/lib/sync/legendSync";
import { deleteTransaction } from "~/lib/services/transactions";
import { useRouter } from "expo-router";

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  date: string;
  type: "expense" | "income" | "transfer";
  account_id: string;
};

const ACTION_WIDTH = 80;

function RightActions({
  onEdit,
  onDelete,
  theme,
}: {
  onEdit: () => void;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        width: ACTION_WIDTH * 2,
        flexDirection: "row",
      }}
    >
      <RectButton
        style={{
          width: ACTION_WIDTH,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.primary,
        }}
        onPress={onEdit}
      >
        <Pencil size={22} color="#FFFFFF" strokeWidth={2} />
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: "600",
            marginTop: 4,
          }}
        >
          Edit
        </Text>
      </RectButton>
      <RectButton
        style={{
          width: ACTION_WIDTH,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.danger,
        }}
        onPress={onDelete}
      >
        <Trash2 size={22} color="#FFFFFF" strokeWidth={2} />
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: "600",
            marginTop: 4,
          }}
        >
          Delete
        </Text>
      </RectButton>
    </View>
  );
}

function TransactionRow({
  transaction,
  theme,
  onRowOpen,
  onRowClose,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  theme: ReturnType<typeof useTheme>;
  onRowOpen: (close: () => void) => void;
  onRowClose: () => void;
  onEdit: (id: string, type: string) => void;
  onDelete: (id: string) => void;
}) {
  const swipeableRef = useRef<React.ComponentRef<typeof Swipeable> | null>(null);

  const handleEdit = useCallback(() => {
    swipeableRef.current?.close();
    onEdit(transaction.id, transaction.type);
  }, [transaction.id, transaction.type, onEdit]);

  const handleDelete = useCallback(() => {
    swipeableRef.current?.close();
    onDelete(transaction.id);
  }, [transaction.id, onDelete]);

  const renderRightActions = useCallback(
    () => (
      <RightActions
        onEdit={handleEdit}
        onDelete={handleDelete}
        theme={theme}
      />
    ),
    [handleEdit, handleDelete, theme]
  );

  const amountColor =
    transaction.type === "expense"
      ? theme.danger
      : transaction.type === "income"
        ? theme.success
        : theme.primary;

  const categoryColor = "#64748b";

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
      onSwipeableOpen={(direction) => {
        if (direction === "right") {
          onRowOpen(() => swipeableRef.current?.close());
        }
      }}
      onSwipeableClose={onRowClose}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        style={{
          backgroundColor: theme.cardBackground,
          padding: 16,
          borderRadius: 16,
          marginHorizontal: 16,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: `${categoryColor}20`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MoreHorizontal size={22} color={categoryColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: "600",
            }}
            numberOfLines={1}
          >
            {transaction.description || transaction.category || "Transaction"}
          </Text>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {formatDistanceToNow(new Date(transaction.created_at), {
              addSuffix: true,
            })}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: amountColor,
            }}
          >
            {transaction.type === "expense" ? "-" : "+"}$
            {Math.abs(transaction.amount).toFixed(2)}
          </Text>
          {transaction.category && (
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 11,
                marginTop: 2,
              }}
            >
              {transaction.category}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function TransactionsScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const openRowRef = useRef<(() => void) | null>(null);
  const { account } = useAccount();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUserOfflineFirst();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const loadTransactions = async () => {
      try {
        setLoading(true);
        const data = await selectTransactions(userId);
        const sorted = data.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setTransactions(sorted as Transaction[]);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();

    // Keep the screen in sync with local store changes (e.g. SMS auto-import).
    const dispose = observe(() => transactions$.get(), () => {
      void loadTransactions();
    });
    return () => {
      dispose();
    };
  }, [userId]);

  const closeOpenRow = useCallback(() => {
    openRowRef.current?.();
    openRowRef.current = null;
  }, []);

  const handleRowOpen = useCallback((close: () => void) => {
    openRowRef.current?.();
    openRowRef.current = close;
  }, []);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const offline = await isOfflineGateLocked();
      if (!offline) {
        await triggerSync();
      }
      const data = await selectTransactions(userId);
      const sorted = data.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTransactions(sorted as Transaction[]);
    } catch (error) {
      console.error("Error refreshing transactions:", error);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const handleEdit = useCallback(
    (id: string, _type: string) => {
      router.push(`/(expense)/edit-expense/${id}` as any);
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      Alert.alert(
        t.deleteTransaction || "Delete Transaction",
        t.confirmDeleteTransaction || "Are you sure you want to delete this transaction?",
        [
          { text: t.cancel || "Cancel", style: "cancel" },
          {
            text: t.delete || "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const transaction = transactions.find((tx) => tx.id === id);
                if (!transaction || !userId) return;

                const offline = await isOfflineGateLocked();
                if (offline) {
                  await deleteTransactionLocal(id);
                  if (account && transaction.account_id === account.id) {
                    const newBalance =
                      transaction.type === "expense"
                        ? account.balance + transaction.amount
                        : account.balance - transaction.amount;
                    await updateAccountLocal(account.id, { balance: newBalance });
                  }
                } else {
                  await deleteTransaction(id);
                  if (account && transaction.account_id === account.id) {
                    const newBalance =
                      transaction.type === "expense"
                        ? account.balance + transaction.amount
                        : account.balance - transaction.amount;
                    await updateAccountBalance(account.id, newBalance);
                  }
                }
                setTransactions((prev) => prev.filter((tx) => tx.id !== id));
              } catch (error) {
                console.error("Error deleting transaction:", error);
                Alert.alert(
                  t.error || "Error",
                  t.failedToDeleteTransaction || "Failed to delete transaction"
                );
              }
            },
          },
        ]
      );
    },
    [transactions, userId, account, t]
  );

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        transaction={item}
        theme={theme}
        onRowOpen={handleRowOpen}
        onRowClose={closeOpenRow}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    ),
    [theme, handleRowOpen, closeOpenRow, handleEdit, handleDelete]
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const ListEmptyComponent = (
    <View
      style={{
        paddingVertical: 64,
        alignItems: "center",
      }}
    >
      <Inbox size={48} color={theme.textMuted} style={{ marginBottom: 12 }} />
      <Text
        style={{
          color: theme.textSecondary,
          fontSize: 16,
          fontWeight: "500",
        }}
      >
        {t.noTransactionsForMonth || "No transactions yet"}
      </Text>
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 13,
          marginTop: 4,
        }}
      >
        {t.addYourFirstTransaction || "Add your first transaction to get started"}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.background,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: theme.cardBackground,
              marginRight: 12,
            }}
          >
            <ArrowLeft size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <View>
            <Text
              style={{
                color: theme.text,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              {t.transactions || "Transactions"}
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 13,
                marginTop: 2,
              }}
            >
              {transactions.length} {t.total || "total"}
            </Text>
          </View>
        </View>
      </View>

      {/* FlatList with Swipeable rows */}
      <FlatList
        data={transactions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        onScrollBeginDrag={closeOpenRow}
        ListEmptyComponent={!loading ? ListEmptyComponent : null}
      />
    </View>
  );
}
