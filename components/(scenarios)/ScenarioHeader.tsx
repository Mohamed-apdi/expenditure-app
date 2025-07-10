import { View, Text } from "react-native";

export default function ScenarioHeader() {
  return (
    <View className="px-6 py-5">
      <Text className="text-white text-2xl font-bold mb-2">
        Saved Scenarios
      </Text>
      <Text className="text-slate-400 text-base leading-6">
        Compare different spending scenarios and their predictions
      </Text>
    </View>
  );
}