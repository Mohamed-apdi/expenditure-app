import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type KeyboardEvent,
} from "react-native";
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
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const maxScrollHeight = windowHeight * 0.88 - insets.top;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToNote = useCallback(() => {
    const delay = Platform.OS === "android" ? 120 : 50;
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, delay);
  }, []);

  const keyboardOpen = keyboardHeight > 0;
  const sheetBottomInset = keyboardOpen
    ? Math.max(0, keyboardHeight - insets.bottom)
    : 0;

  useEffect(() => {
    if (noteExpanded || keyboardOpen) {
      scrollToNote();
    }
  }, [noteExpanded, keyboardOpen, scrollToNote]);

  const scrollMaxHeight = keyboardOpen
    ? Math.min(
        maxScrollHeight,
        windowHeight - keyboardHeight - insets.top - 72,
      )
    : maxScrollHeight;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: 20,
            paddingTop: 10,
            marginBottom: sheetBottomInset,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.border,
              marginBottom: 16,
              opacity: 0.85,
            }}
          />
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEnabled={noteExpanded || keyboardOpen}
            style={{ maxHeight: scrollMaxHeight, flexGrow: 0 }}
            contentContainerStyle={{
              flexGrow: 0,
              paddingBottom: keyboardOpen ? 12 : 4,
            }}
          >
            <EvcCategoryChips
              userId={userId}
              transactionId={transactionId}
              normalizedPhone={normalizedPhone}
              compact={false}
              enableOptionalNote
              onNoteExpandedChange={setNoteExpanded}
              onNoteInputFocus={scrollToNote}
              onApplied={() => {
                onApplied?.();
                onClose();
              }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
