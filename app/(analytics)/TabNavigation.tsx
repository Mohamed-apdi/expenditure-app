import { View, Text, TouchableOpacity, ScrollView} from "react-native"
import Icon from "react-native-vector-icons/Feather"

export const TabNavigation = ({ tabs, selectedTab, setSelectedTab }) => (
  <View className="border-b border-slate-700">
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 8 }}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          className={`flex-row items-center py-2 px-4 rounded-full border ${
            selectedTab === tab.key ? "bg-emerald-500 border-emerald-500" : "bg-slate-800 border-slate-700"
          }`}
          onPress={() => setSelectedTab(tab.key)}
        >
          <Icon name={tab.icon} size={16} color={selectedTab === tab.key ? "#ffffff" : "#94a3b8"} />
          <Text className={`ml-2 text-sm font-medium ${selectedTab === tab.key ? "text-white" : "text-slate-400"}`}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
)