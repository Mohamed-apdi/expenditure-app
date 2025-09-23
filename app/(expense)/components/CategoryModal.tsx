import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
  title: string;
}

export default function CategoryModal({
  visible,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
  title,
}: CategoryModalProps) {
  const theme = useTheme();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="bg-white rounded-2xl p-6 w-full max-w-md">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="font-bold text-xl text-gray-900">{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[400px]">
            <View className="flex-row flex-wrap justify-between">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <TouchableOpacity
                    key={category.id}
                    className={`w-1/3 p-4 items-center ${
                      selectedCategory?.id === category.id
                        ? "bg-blue-50 rounded-lg"
                        : ""
                    }`}
                    onPress={() => {
                      onSelectCategory(category);
                      onClose();
                    }}
                  >
                    <View
                      className="p-3 rounded-full mb-2"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent size={24} color={category.color} />
                    </View>
                    <Text className="text-xs text-gray-700 text-center">
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
