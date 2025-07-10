import { View, Text, TouchableOpacity } from "react-native";
import { Layers } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function ScenarioEmptyState() {
  const router = useRouter();
  
  return (
    <View className="items-center py-16 px-10">
      <Layers size={48} color="#64748b" />
      <Text className="text-white text-xl font-bold mt-4 mb-2">
        No Scenarios Yet
      </Text>
      <Text className="text-slate-400 text-base text-center leading-6 mb-6">
        Create your first scenario to start comparing different spending patterns
      </Text>
      <TouchableOpacity
        className="bg-emerald-500 px-6 py-3 rounded-lg"
        onPress={() => router.push("../predict/basicInputs")}
      >
        <Text className="text-white text-base font-semibold">
          Create First Scenario
        </Text>
      </TouchableOpacity>
    </View>
  );
}