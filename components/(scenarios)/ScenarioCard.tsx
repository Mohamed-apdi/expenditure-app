import { View, Text, TouchableOpacity } from "react-native";
import { Check, Edit3, Copy, Trash2 } from "lucide-react-native";
import ScenarioActions from "./ScenarioActions";

export default function ScenarioCard({
  scenario,
  compareMode,
  isSelected,
  onPress,
}: {
  scenario: any;
  compareMode: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "#10b981";
    if (confidence >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <TouchableOpacity
      className={`bg-slate-800 rounded-xl p-5 border ${
        scenario.isActive
          ? "border-emerald-500"
          : compareMode && isSelected
          ? "border-blue-500"
          : "border-slate-700"
      } relative`}
      onPress={onPress}
    >
      {compareMode && (
        <View className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full justify-center items-center z-10">
          {isSelected && <Check size={16} color="#ffffff" />}
        </View>
      )}

      <View className="mb-4">
        <View className="flex-row items-center mb-1">
          <Text className="text-white text-lg font-bold mr-3">
            {scenario.name}
          </Text>
          {scenario.isActive && (
            <View className="bg-emerald-500 px-2 py-1 rounded">
              <Text className="text-white text-xs font-bold uppercase">
                Active
              </Text>
            </View>
          )}
        </View>
        <Text className="text-slate-500 text-xs">
          {new Date(scenario.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </View>

      <View className="items-center mb-5">
        <Text className="text-emerald-500 text-3xl font-bold">
          ${scenario.prediction}
        </Text>
        <View className="w-full mt-2">
          <View className="h-1 bg-slate-700 rounded-full mb-1">
            <View
              className="h-full rounded-full"
              style={{
                width: `${scenario.confidence}%`,
                backgroundColor: getConfidenceColor(scenario.confidence),
              }}
            />
          </View>
          <Text className="text-slate-500 text-xs text-center">
            {scenario.confidence}% confidence
          </Text>
        </View>
      </View>

      <View className="gap-2 mb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-emerald-500 mr-3" />
            <Text className="text-slate-300 text-sm">Food</Text>
          </View>
          <Text className="text-slate-400 text-sm font-bold">
            ${scenario.changes.food}
          </Text>
        </View>
        {/* Other expense items... */}
      </View>

      {!compareMode && <ScenarioActions />}
    </TouchableOpacity>
  );
}