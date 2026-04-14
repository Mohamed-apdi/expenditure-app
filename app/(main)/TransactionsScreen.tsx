import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Pressable,
  Platform,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { RectButton } from "react-native-gesture-handler";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Inbox,
} from "lucide-react-native";
import {
  useTheme,
  useLanguage,
  getCurrentUserOfflineFirst,
  useAccount,
} from "~/lib";
import {
  selectTransactions,
  deleteTransactionLocal,
  transactions$,
} from "~/lib/stores/transactionsStore";
import { updateAccountLocal } from "~/lib/stores/accountsStore";
import { updateAccountBalance } from "~/lib/services/accounts";
import { isOfflineGateLocked, triggerSync } from "~/lib/sync/legendSync";
import { deleteTransaction } from "~/lib/services/transactions";
import { useRouter } from "expo-router";
import { Checkbox } from "~/components/ui/checkbox";
import { EvcCategorizeBottomSheet } from "~/components/evc/EvcCategorizeBottomSheet";
import { applyUserEvcCategory } from "~/lib/evc/applyUserEvcCategory";
import { EVC_QUICK_CATEGORY_IDS } from "~/lib/evc/evcQuickCategoryIds";
import {
  formatEvcCategoryChannelSubtitle,
  getTransactionSource,
} from "~/lib/evc/transactionSource";
import {
  categoryColorFromStored,
  categoryLabelFromStored,
  getExpenseCategories,
} from "~/lib/utils/categories";
import { stripLegacyEvcDescriptionForListTitle } from "~/lib/utils/transactionListDisplay";
import {
  hexWithAlpha,
  softenedWarningColor,
} from "~/lib/utils/colorAlpha";

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
  evc_kind?: "merchant" | "transfer" | null;
  evc_counterparty_phone?: string | null;
  source?: "evc";
};

const ACTION_WIDTH = 80;

function transactionNeedsEvcCategory(t: Transaction): boolean {
  return (
    t.evc_kind === "transfer" &&
    !!t.evc_counterparty_phone &&
    !String(t.category ?? "").trim()
  );
}

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
  t,
  userId,
  selectionMode,
  selected,
  onToggleSelect,
  onRowOpen,
  onRowClose,
  onEdit,
  onDelete,
  onOpenEvcCategorize,
}: {
  transaction: Transaction;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useLanguage>["t"];
  userId: string | null;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onRowOpen: (close: () => void) => void;
  onRowClose: () => void;
  onEdit: (id: string, type: string) => void;
  onDelete: (id: string) => void;
  onOpenEvcCategorize: (transaction: Transaction) => void;
}) {
  const router = useRouter();
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
    [handleEdit, handleDelete, theme],
  );

  const amountColor =
    transaction.type === "expense"
      ? theme.danger
      : transaction.type === "income"
        ? theme.success
        : theme.primary;

  const catTrim = String(transaction.category ?? "").trim();
  const categoryMissing = !catTrim;
  const warningAccent = softenedWarningColor(theme.warning);
  const warningIconBg = hexWithAlpha(theme.warning, 0.125);
  const categoryColor = categoryMissing
    ? warningAccent
    : categoryColorFromStored(t, catTrim);
  const eligible = transactionNeedsEvcCategory(transaction);
  const showCheckbox = selectionMode && eligible;

  const cleanNote = stripLegacyEvcDescriptionForListTitle(
    transaction.description,
  );
  const rowCategoryLabel = categoryMissing
    ? ""
    : categoryLabelFromStored(t, catTrim) || catTrim;
  const fromEvc = getTransactionSource(transaction) === "evc";
  const listTitle = categoryMissing
    ? cleanNote || t.noDescription
    : cleanNote || rowCategoryLabel || "Transaction";

  const evcSubtitle =
    fromEvc && !categoryMissing
      ? formatEvcCategoryChannelSubtitle(
          rowCategoryLabel,
          transaction.type,
          {
            sentViaEvc: t.transactionSentViaEvc,
            receivedViaEvc: t.transactionReceivedViaEvc,
          },
        )
      : null;

  const nonEvcSubtitle =
    !fromEvc && !categoryMissing && cleanNote ? rowCategoryLabel : null;

  const onMainPress = () => {
    if (selectionMode) {
      if (eligible) onToggleSelect();
      return;
    }
    if (eligible && userId) {
      onOpenEvcCategorize(transaction);
      return;
    }
    router.push(`/(transactions)/transaction-detail/${transaction.id}`);
  };

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
      <Pressable
        onPress={onMainPress}
        android_ripple={{
          color: theme.isDark
            ? "rgba(255,255,255,0.14)"
            : "rgba(0,0,0,0.07)",
          foreground: true,
        }}
        style={({ pressed }) => [
          {
            backgroundColor: theme.cardBackground,
            padding: 16,
            paddingLeft: categoryMissing ? 13 : 16,
            borderRadius: 16,
            marginHorizontal: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: selected ? theme.primary : theme.border,
            borderLeftWidth: categoryMissing ? 3 : 1,
            borderLeftColor: categoryMissing
              ? warningAccent
              : selected
                ? theme.primary
                : theme.border,
            overflow: Platform.OS === "android" ? "hidden" : "visible",
          },
          pressed && Platform.OS === "ios" ? { opacity: 0.96 } : null,
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {showCheckbox ? (
            <View style={{ marginRight: 10 }}>
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect()}
              />
            </View>
          ) : null}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: categoryMissing
                ? warningIconBg
                : `${categoryColor}20`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {categoryMissing ? (
              <AlertCircle size={22} color={categoryColor} />
            ) : (
              <MoreHorizontal size={22} color={categoryColor} />
            )}
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
              {listTitle}
            </Text>
            {categoryMissing ? (
              <>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    fontWeight: "600",
                    color: warningAccent,
                  }}
                  numberOfLines={1}
                >
                  {t.transactionNeedsCategory}
                </Text>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: theme.textMuted,
                  }}
                  numberOfLines={1}
                >
                  {t.transactionTapToCategorize}
                </Text>
              </>
            ) : null}
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 12,
                marginTop: categoryMissing ? 4 : 2,
              }}
            >
              {formatDistanceToNow(new Date(transaction.created_at), {
                addSuffix: true,
              })}
            </Text>
            {!categoryMissing && evcSubtitle ? (
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 11,
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {evcSubtitle}
              </Text>
            ) : null}
            {!categoryMissing && nonEvcSubtitle ? (
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 11,
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {nonEvcSubtitle}
              </Text>
            ) : null}
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
            {!categoryMissing ? (
              <Text
                style={{
                  color: theme.textMuted,
                  fontSize: 11,
                  fontWeight: "400",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {categoryLabelFromStored(t, catTrim) || catTrim}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [evcCategorizeTarget, setEvcCategorizeTarget] =
    useState<Transaction | null>(null);
  const openRowRef = useRef<(() => void) | null>(null);
  const { selectedAccount } = useAccount();

  const quickCategoryLabels = useMemo(() => {
    const cats = getExpenseCategories(t);
    const map: Record<string, string> = {};
    for (const id of EVC_QUICK_CATEGORY_IDS) {
      const c = cats.find((x) => x.id === id);
      if (c) map[id] = c.name;
    }
    return map;
  }, [t]);

  const needsCategorization = useMemo(
    () => transactions.filter((x) => transactionNeedsEvcCategory(x)),
    [transactions],
  );

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
        const sorted = data.sort((a, b) => {
          const ad =
            a.date && a.date.length >= 10 ? a.date.slice(0, 10) : "";
          const bd =
            b.date && b.date.length >= 10 ? b.date.slice(0, 10) : "";
          if (ad && bd && ad !== bd) return bd.localeCompare(ad);
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        });
        setTransactions(sorted as Transaction[]);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();

    const unsub = transactions$.onChange(() => {
      void loadTransactions();
    });
    return () => {
      unsub();
    };
  }, [userId]);

  const closeOpenRow = useCallback(() => {
    openRowRef.current?.();
    openRowRef.current = null;
  }, []);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/Dashboard");
    }
  }, [router]);

  const handleRowOpen = useCallback((close: () => void) => {
    openRowRef.current?.();
    openRowRef.current = close;
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
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
      const sorted = data.sort((a, b) => {
        const ad =
          a.date && a.date.length >= 10 ? a.date.slice(0, 10) : "";
        const bd =
          b.date && b.date.length >= 10 ? b.date.slice(0, 10) : "";
        if (ad && bd && ad !== bd) return bd.localeCompare(ad);
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });
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
    [router],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      Alert.alert(
        t.deleteTransaction || "Delete Transaction",
        t.confirmDeleteTransaction ||
          "Are you sure you want to delete this transaction?",
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
                  if (
                    selectedAccount &&
                    transaction.account_id === selectedAccount.id
                  ) {
                    const newBalance =
                      transaction.type === "expense"
                        ? selectedAccount.amount + transaction.amount
                        : selectedAccount.amount - transaction.amount;
                    await updateAccountLocal(selectedAccount.id, {
                      amount: newBalance,
                    });
                  }
                } else {
                  await deleteTransaction(id);
                  if (
                    selectedAccount &&
                    transaction.account_id === selectedAccount.id
                  ) {
                    const newBalance =
                      transaction.type === "expense"
                        ? selectedAccount.amount + transaction.amount
                        : selectedAccount.amount - transaction.amount;
                    await updateAccountBalance(selectedAccount.id, newBalance);
                  }
                }
                setTransactions((prev) => prev.filter((tx) => tx.id !== id));
              } catch (error) {
                console.error("Error deleting transaction:", error);
                Alert.alert(
                  t.error || "Error",
                  t.failedToDeleteTransaction ||
                    "Failed to delete transaction",
                );
              }
            },
          },
        ],
      );
    },
    [transactions, userId, selectedAccount, t],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const openEvcCategorize = useCallback((tx: Transaction) => {
    setEvcCategorizeTarget(tx);
  }, []);

  const applyBulkCategory = useCallback(
    async (categoryId: string) => {
      if (!userId || selectedIds.length === 0) return;
      setBulkBusy(true);
      try {
        for (const txId of selectedIds) {
          await applyUserEvcCategory({
            userId,
            transactionId: txId,
            categoryId,
          });
        }
        exitSelectionMode();
      } finally {
        setBulkBusy(false);
      }
    },
    [userId, selectedIds, exitSelectionMode],
  );

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        transaction={item}
        theme={theme}
        t={t}
        userId={userId}
        selectionMode={selectionMode}
        selected={selectedIds.includes(item.id)}
        onToggleSelect={() => toggleSelect(item.id)}
        onRowOpen={handleRowOpen}
        onRowClose={closeOpenRow}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onOpenEvcCategorize={openEvcCategorize}
      />
    ),
    [
      theme,
      t,
      userId,
      selectionMode,
      selectedIds,
      toggleSelect,
      handleRowOpen,
      closeOpenRow,
      handleEdit,
      handleDelete,
      openEvcCategorize,
    ],
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const ListHeaderComponent = useMemo(() => {
    if (needsCategorization.length === 0 || selectionMode) return null;
    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          padding: 14,
          borderRadius: 14,
          backgroundColor: theme.cardBackground,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 15 }}>
          <Text style={{ fontWeight: "800" }}>
            {needsCategorization.length}
          </Text>
          {` ${t.evcNeedCategoryLine2}`}
        </Text>
        <TouchableOpacity
          onPress={() => setSelectionMode(true)}
          style={{ marginTop: 10, alignSelf: "flex-start" }}
        >
          <Text style={{ color: theme.primary, fontWeight: "700" }}>
            {t.evcSelectMultiple}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [
    needsCategorization.length,
    selectionMode,
    theme,
    t.evcNeedCategoryLine2,
    t.evcSelectMultiple,
  ]);

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
        {t.addYourFirstTransaction ||
          "Add your first transaction to get started"}
      </Text>
    </View>
  );

  const listBottomPad =
    insets.bottom +
    24 +
    (selectionMode && selectedIds.length > 0 ? 120 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
            onPress={handleGoBack}
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: theme.cardBackground,
              marginRight: 12,
            }}
          >
            <ArrowLeft size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
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
          {selectionMode ? (
            <TouchableOpacity onPress={exitSelectionMode}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>
                {t.cancel}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: listBottomPad,
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

      {selectionMode && selectedIds.length > 0 ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: insets.bottom + 12,
            paddingTop: 10,
            paddingHorizontal: 12,
            backgroundColor: theme.cardBackground,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            {t.evcApplyToSelected} ({selectedIds.length})
          </Text>
          {bulkBusy ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {EVC_QUICK_CATEGORY_IDS.map((id) => {
                const label = quickCategoryLabels[id];
                if (!label) return null;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => applyBulkCategory(id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 13 }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {evcCategorizeTarget && userId ? (
        <EvcCategorizeBottomSheet
          key={evcCategorizeTarget.id}
          onClose={() => setEvcCategorizeTarget(null)}
          userId={userId}
          transactionId={evcCategorizeTarget.id}
          normalizedPhone={evcCategorizeTarget.evc_counterparty_phone}
        />
      ) : null}
    </View>
  );
}
