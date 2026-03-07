import React, { useCallback, useRef } from "react";
import {
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { RectButton } from "react-native-gesture-handler";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react-native";
import { useTheme, useLanguage } from "~/lib";

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

// Mock data for UI-only screen
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    amount: -45.99,
    category: "Food",
    description: "Grocery store",
    created_at: new Date().toISOString(),
    date: new Date().toISOString().split("T")[0],
    type: "expense",
    account_id: "acc1",
  },
  {
    id: "2",
    amount: 2500,
    category: "Salary",
    description: "Monthly salary",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    type: "income",
    account_id: "acc1",
  },
  {
    id: "3",
    amount: -12.5,
    category: "Transport",
    description: "Bus fare",
    created_at: new Date(Date.now() - 172800000).toISOString(),
    date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
    type: "expense",
    account_id: "acc1",
  },
  {
    id: "4",
    amount: -89,
    category: "Utilities",
    description: "Electric bill",
    created_at: new Date(Date.now() - 259200000).toISOString(),
    date: new Date(Date.now() - 259200000).toISOString().split("T")[0],
    type: "expense",
    account_id: "acc1",
  },
  {
    id: "5",
    amount: 150,
    category: "Freelance",
    description: "Project payment",
    created_at: new Date(Date.now() - 345600000).toISOString(),
    date: new Date(Date.now() - 345600000).toISOString().split("T")[0],
    type: "income",
    account_id: "acc1",
  },
];

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
}: {
  transaction: Transaction;
  theme: ReturnType<typeof useTheme>;
  onRowOpen: (close: () => void) => void;
  onRowClose: () => void;
}) {
  const swipeableRef = useRef<React.ComponentRef<typeof Swipeable> | null>(null);

  const handleEdit = useCallback(() => {
    swipeableRef.current?.close();
    // Placeholder - no real logic
  }, []);

  const handleDelete = useCallback(() => {
    swipeableRef.current?.close();
    // Placeholder - no real logic
  }, []);

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
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);
  const openRowRef = useRef<(() => void) | null>(null);

  const closeOpenRow = useCallback(() => {
    openRowRef.current?.();
    openRowRef.current = null;
  }, []);

  const handleRowOpen = useCallback((close: () => void) => {
    openRowRef.current?.();
    openRowRef.current = close;
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        transaction={item}
        theme={theme}
        onRowOpen={handleRowOpen}
        onRowClose={closeOpenRow}
      />
    ),
    [theme, handleRowOpen, closeOpenRow]
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const ListEmptyComponent = (
    <View
      style={{
        paddingVertical: 64,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: theme.textSecondary,
          fontSize: 16,
          fontWeight: "500",
        }}
      >
        {t.noTransactionsForMonth || "No transactions yet"}
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
              {MOCK_TRANSACTIONS.length} total
            </Text>
          </View>
        </View>
      </View>

      {/* FlatList with Swipeable rows */}
      <FlatList
        data={MOCK_TRANSACTIONS}
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
        ListEmptyComponent={ListEmptyComponent}
      />
    </View>
  );
}
