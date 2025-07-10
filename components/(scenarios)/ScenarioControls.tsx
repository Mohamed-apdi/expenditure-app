import { TouchableOpacity, Text, View } from "react-native";
import { GitCompare, Plus } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function ScenarioControls({
  compareMode,
  setCompareMode,
  selectedScenarios,
  setSelectedScenarios,
  setShowCompareModal,
}: {
  compareMode: boolean;
  setCompareMode: (value: boolean) => void;
  selectedScenarios: number[];
  setSelectedScenarios: (value: number[]) => void;
  setShowCompareModal: (value: boolean) => void;
}) {
  const router = useRouter();

  return (
    <View className="flex-row justify-between items-center px-6 pb-4">
      <TouchableOpacity
        className={`flex-row items-center px-4 py-2 rounded-lg border ${
          compareMode
            ? "bg-emerald-500 border-emerald-500"
            : "bg-slate-800 border-slate-700"
        }`}
        onPress={() => {
          setCompareMode(!compareMode);
          setSelectedScenarios([]);
        }}
      >
        <GitCompare size={16} color={compareMode ? "#ffffff" : "#94a3b8"} />
        <Text
          className={`ml-2 text-sm ${compareMode ? "text-white" : "text-slate-400"}`}
        >
          {compareMode ? "Exit Compare" : "Compare"}
        </Text>
      </TouchableOpacity>

      {compareMode && selectedScenarios.length === 2 && (
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={() => setShowCompareModal(true)}
        >
          <Text className="text-white text-sm font-semibold">
            Compare Selected
          </Text>
        </TouchableOpacity>
      )}

      {!compareMode && (
        <TouchableOpacity
          className="flex-row items-center bg-emerald-500 px-4 py-2 rounded-lg"
          onPress={() => router.push("/(predict)/basicInputs")}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white text-sm font-semibold">New Scenario</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}