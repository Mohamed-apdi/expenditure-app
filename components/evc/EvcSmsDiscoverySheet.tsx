import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, MessageSquareText } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage, useTheme } from "~/lib";

export type EvcSmsDiscoverySheetProps = {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onDontShowAgain: () => void;
};

function Bullet({
  text,
  theme,
}: {
  text: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 10,
          backgroundColor: `${theme.primary}18`,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        <Check size={16} color={theme.primary} strokeWidth={2.5} />
      </View>
      <Text
        style={{
          flex: 1,
          color: theme.textSecondary,
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

/**
 * One-time style post-login sheet: explains EVC SMS import + optional SIM1/SIM2 mapping.
 */
export function EvcSmsDiscoverySheet({
  visible,
  onClose,
  onOpenSettings,
  onDontShowAgain,
}: EvcSmsDiscoverySheetProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            maxHeight: "88%",
            backgroundColor: theme.cardBackground,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: 20,
            paddingTop: 10,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.border,
              marginBottom: 16,
            }}
          />

          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: `${theme.primary}22`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <MessageSquareText size={26} color={theme.primary} />
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: theme.text,
              letterSpacing: -0.3,
              marginBottom: 8,
            }}
          >
            {t.evcDiscoveryTitle}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textMuted,
              lineHeight: 20,
              marginBottom: 18,
            }}
          >
            {t.evcDiscoverySubtitle}
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 280 }}
          >
            <Bullet text={t.evcDiscoveryBullet1} theme={theme} />
            <Bullet text={t.evcDiscoveryBullet2} theme={theme} />
            <Bullet text={t.evcDiscoveryBullet3} theme={theme} />
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              onOpenSettings();
            }}
            style={{
              marginTop: 20,
              backgroundColor: theme.primary,
              paddingVertical: 15,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              {t.evcDiscoveryOpenSettings}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            style={{
              marginTop: 10,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.background,
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: "700" }}>
              {t.evcDiscoveryMaybeLater}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onDontShowAgain}
            style={{ marginTop: 14, paddingVertical: 8, alignItems: "center" }}
          >
            <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: "600" }}>
              {t.evcDiscoveryDontShowAgain}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
