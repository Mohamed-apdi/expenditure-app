import React, { memo, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { formatDistanceToNow } from "date-fns";
import { useLanguage, useTheme } from "~/lib";
import { EvcCategorizeBottomSheet } from "~/components/evc/EvcCategorizeBottomSheet";
import {
  formatEvcCategoryChannelSubtitle,
  getTransactionSource,
} from "~/lib/evc/transactionSource";
import {
  categoryColorFromStored,
  categoryIconFromStored,
  categoryLabelFromStored,
} from "~/lib/utils/categories";
import { stripLegacyEvcDescriptionForListTitle } from "~/lib/utils/transactionListDisplay";
import {
  hexWithAlpha,
  softenedWarningColor,
} from "~/lib/utils/colorAlpha";
import { AlertCircle } from "lucide-react-native";

const ACTIONS_WIDTH = 160;

type TransactionItemProps = {
  transaction: {
    id: string;
    amount: number;
    category?: string;
    description?: string;
    created_at: string;
    updated_at?: string;
    type: "expense" | "income" | "transfer";
    evc_kind?: "merchant" | "transfer" | null;
    evc_counterparty_phone?: string | null;
    source?: "evc";
  };
  /** Required to show EVC P2P category picker */
  userId?: string | null;
  onPress?: () => void;
  getCategoryIcon?: (category: string) => React.ElementType;
  getCategoryColor?: (category: string) => string;
  getCategoryLabel?: (categoryKey: string) => string;
  onSwipeOpen?: (close: () => void) => void;
  onSwipeStart?: () => void;
  onSwipeClose?: () => void;
  onEdit?: (transactionId: string, type: "expense" | "income" | "transfer") => void;
  onDelete?: (transactionId: string) => void;
};

const springConfig = {
  damping: 20,
  stiffness: 300,
};

const MemoizedTransactionItem = memo<TransactionItemProps>(
  ({
    transaction,
    userId,
    onPress,
    getCategoryIcon,
    getCategoryColor,
    getCategoryLabel,
    onSwipeOpen,
    onSwipeStart,
    onSwipeClose,
    onEdit,
    onDelete,
  }) => {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useLanguage();
    const translateX = useSharedValue(0);
    const isOpenRef = useRef(false);
    const [evcSheetOpen, setEvcSheetOpen] = useState(false);

    const categoryMissing = !String(transaction.category ?? "").trim();

    const needsEvcCategory =
      transaction.evc_kind === "transfer" &&
      userId &&
      categoryMissing;

    const cat = transaction.category || "";

    const IconComponent = categoryMissing
      ? AlertCircle
      : getCategoryIcon
        ? getCategoryIcon(cat)
        : categoryIconFromStored(t, cat);

    const warningAccent = softenedWarningColor(theme.warning);
    const warningIconBg = hexWithAlpha(theme.warning, 0.125);

    const color = categoryMissing
      ? warningAccent
      : getCategoryColor
        ? getCategoryColor(cat)
        : categoryColorFromStored(t, cat);

    const handlePress = () => {
      if (isOpenRef.current) {
        close();
        return;
      }
      if (needsEvcCategory && userId) {
        setEvcSheetOpen(true);
        return;
      }
      if (onPress) {
        onPress();
      } else {
        router.push(`/(transactions)/transaction-detail/${transaction.id}`);
      }
    };

    const categoryLabel = categoryMissing
      ? ""
      : getCategoryLabel
        ? getCategoryLabel(cat) || categoryLabelFromStored(t, cat) || cat
        : categoryLabelFromStored(t, cat) || cat;

    const cleanNote = stripLegacyEvcDescriptionForListTitle(
      transaction.description,
    );
    const fromEvc = getTransactionSource(transaction) === "evc";
    /** List title: name when uncategorized; name or category when categorized (no "Categorize this transaction" here). */
    const titleLine = categoryMissing
      ? cleanNote || t.noDescription
      : cleanNote || categoryLabel;

    const evcSubtitle =
      fromEvc && !categoryMissing
        ? formatEvcCategoryChannelSubtitle(
            categoryLabel,
            transaction.type,
            {
              sentViaEvc: t.transactionSentViaEvc,
              receivedViaEvc: t.transactionReceivedViaEvc,
            },
          )
        : null;

    const nonEvcSubtitle =
      !fromEvc && !categoryMissing && cleanNote
        ? categoryLabel
        : null;

    const close = useCallback(() => {
      isOpenRef.current = false;
      translateX.value = withSpring(0, springConfig);
    }, []);

    const setOpen = useCallback(() => {
      isOpenRef.current = true;
    }, []);
    const setClosed = useCallback(() => {
      isOpenRef.current = false;
    }, []);

    const closePrevious = useCallback(() => {
      if (onSwipeStart) {
        setTimeout(() => onSwipeStart(), 0);
      }
    }, [onSwipeStart]);

    const handleEdit = useCallback(() => {
      close();
      if (onEdit) {
        onEdit(transaction.id, transaction.type);
      } else {
        if (transaction.type === "expense") {
          router.push(`/(expense)/edit-expense/${transaction.id}` as any);
        } else {
          router.push(`/(transactions)/transaction-detail/${transaction.id}` as any);
        }
      }
    }, [transaction.id, transaction.type, onEdit, close]);

    const handleDelete = useCallback(() => {
      close();
      if (onDelete) onDelete(transaction.id);
    }, [transaction.id, onDelete, close]);

    const panGesture = Gesture.Pan()
      .activeOffsetX([-15, 15])
      .failOffsetY([-15, 15])
      .onStart(() => {
        if (onSwipeStart) runOnJS(closePrevious)();
      })
      .onUpdate((e) => {
        if (e.translationX > 0) return;
        translateX.value = Math.max(e.translationX, -ACTIONS_WIDTH);
      })
      .onEnd((e) => {
        const shouldOpen =
          e.translationX < -ACTIONS_WIDTH / 2 || e.velocityX < -500;
        translateX.value = withSpring(
          shouldOpen ? -ACTIONS_WIDTH : 0,
          springConfig
        );
        if (shouldOpen) {
          if (onSwipeOpen) runOnJS(onSwipeOpen)(close);
          runOnJS(setOpen)();
        } else {
          if (onSwipeClose) runOnJS(onSwipeClose)();
          runOnJS(setClosed)();
        }
      });

    const composedGesture = panGesture;

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    return (
      <View style={styles.wrapper}>
        {evcSheetOpen && needsEvcCategory && userId ? (
          <EvcCategorizeBottomSheet
            key={transaction.id}
            onClose={() => setEvcSheetOpen(false)}
            userId={userId}
            transactionId={transaction.id}
            normalizedPhone={transaction.evc_counterparty_phone}
          />
        ) : null}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[
              styles.content,
              animatedStyle,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <Pressable
              onPress={handlePress}
              android_ripple={{
                color: theme.isDark
                  ? "rgba(255,255,255,0.14)"
                  : "rgba(0,0,0,0.07)",
                foreground: true,
              }}
              style={({ pressed }) => [
                styles.pressable,
                {
                  borderRadius: 12,
                  overflow: Platform.OS === "android" ? "hidden" : "visible",
                },
                pressed && Platform.OS === "ios" ? { opacity: 0.96 } : null,
              ]}
            >
              <View
                className="flex-row items-center rounded-xl gap-3"
                style={{
                  backgroundColor: theme.cardBackground,
                  borderLeftWidth: categoryMissing ? 3 : 0,
                  borderLeftColor: categoryMissing
                    ? warningAccent
                    : "transparent",
                  paddingVertical: 16,
                  paddingRight: 16,
                  paddingLeft: categoryMissing ? 13 : 16,
                }}
              >
                <View
                  className="w-11 h-11 rounded-xl items-center justify-center"
                  style={{
                    backgroundColor: categoryMissing
                      ? warningIconBg
                      : `${color}20`,
                  }}
                >
                  <IconComponent size={20} color={color} />
                </View>
                <View className="flex-1 flex-row justify-between items-center">
                  <View className="flex-1 flex-row items-center">
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text
                        className="text-base font-semibold"
                        style={{
                          color: theme.text,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {titleLine}
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
                      ) : evcSubtitle ? (
                        <Text
                          className="text-xs"
                          style={{
                            color: theme.textSecondary,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {evcSubtitle}
                        </Text>
                      ) : nonEvcSubtitle ? (
                        <Text
                          className="text-xs"
                          style={{
                            color: theme.textSecondary,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {nonEvcSubtitle}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
                      <Text
                        className="text-base font-bold"
                        style={{
                          color:
                            transaction.type === "expense"
                              ? "#DC2626"
                              : "#16A34A",
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {transaction.type === "expense" ? "-" : "+"}$
                        {Math.abs(transaction.amount).toFixed(2)}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ color: theme.textMuted }}
                      >
                        {formatDistanceToNow(
                          new Date(transaction.created_at),
                          { addSuffix: true },
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 2,
    overflow: "hidden",
    borderRadius: 12,
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    width: ACTIONS_WIDTH,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#ffab00",
  },
  deleteButton: {
    backgroundColor: "#ff1744",
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
  },
  content: {
    borderRadius: 12,
    overflow: "hidden",
  },
  pressable: {
    borderRadius: 12,
  },
});

MemoizedTransactionItem.displayName = "MemoizedTransactionItem";

export default MemoizedTransactionItem;
