import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import { useLanguage, useTheme } from "~/lib";
import type { Category } from "~/lib/utils/categories";

export type CategoryPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  onSelect: (category: Category) => void;
  /** Defaults to translated "Select category" */
  title?: string;
};

/**
 * Same category list UI as Add Transaction (expense/income forms): modal bottom sheet with full scrollable list.
 */
export function CategoryPickerSheet({
  visible,
  onClose,
  categories,
  onSelect,
  title,
}: CategoryPickerSheetProps) {
  const theme = useTheme();
  const { t } = useLanguage();

  const header = title ?? t.select_category ?? "Select category";

  const pick = (category: Category) => {
    onSelect(category);
    onClose();
  };

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
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            maxHeight: "75%",
            backgroundColor: theme.cardBackground,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              paddingTop: 12,
              paddingBottom: 8,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
              }}
            />
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: theme.text,
                marginBottom: 16,
              }}
            >
              {header}
            </Text>
            <ScrollView
              style={{ maxHeight: 320 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {categories
                .filter((cat) => cat.name && cat.name !== "undefined")
                .map((category) => {
                  const CategoryIcon = category.icon;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      activeOpacity={0.7}
                      onPress={() => pick(category)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: theme.background,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: `${category.color}18`,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <CategoryIcon size={20} color={category.color} />
                      </View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                          flex: 1,
                        }}
                      >
                        {category.name}
                      </Text>
                      <View style={{ transform: [{ rotate: "-90deg" }] }}>
                        <ChevronDown size={18} color={theme.textMuted} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
