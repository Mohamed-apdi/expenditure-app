// components/TabSwitcher.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface TabSwitcherProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabSwitcher: React.FC<TabSwitcherProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = ["Accounts", "Transfer"];

  return (
    <SafeAreaView className="pt-safe">
      {/* Card wrapper */}
      <View
        style={{
          padding: 20,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
          marginHorizontal: 16,
        }}
      >
        {/* Tab container */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#f1f5f9",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => onTabChange(tab)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 12,
                  backgroundColor: isActive ? "#3b82f6" : "#f1f5f9",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: isActive ? "#ffffff" : "#374151",
                  }}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default TabSwitcher;
