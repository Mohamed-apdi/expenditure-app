import React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/lib";
import { EvcCategoryChips } from "~/components/evc/EvcCategoryChips";

export type EvcCategorizeBottomSheetProps = {
  onClose: () => void;
  userId: string;
  transactionId: string;
  normalizedPhone?: string | null;
  /** Called after a category is applied successfully (before onClose). */
  onApplied?: () => void;
};

/**
 * Bottom sheet that wraps {@link EvcCategoryChips} for list flows (no inline chips in rows).
 * Mount only when open; unmount on close.
 */
export function EvcCategorizeBottomSheet({
  onClose,
  userId,
  transactionId,
  normalizedPhone,
  onApplied,
}: EvcCategorizeBottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            maxHeight: "88%",
            backgroundColor: theme.cardBackground,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: 16,
            paddingTop: 8,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              alignSelf: "center",
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.border,
              marginBottom: 12,
            }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <EvcCategoryChips
              userId={userId}
              transactionId={transactionId}
              normalizedPhone={normalizedPhone}
              compact={false}
              onApplied={() => {
                onApplied?.();
                onClose();
              }}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
