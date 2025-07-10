import { TouchableOpacity, View, Text } from "react-native";
import { ChevronRight, Zap as Lightning } from "lucide-react-native";

interface PredictionTeaserProps {
  onPress: () => void;
}

export default function PredictionTeaser({ onPress }: PredictionTeaserProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center bg-slate-800 mx-6 mb-8 p-5 rounded-xl border border-emerald-500"
      onPress={onPress}
    >
      <Lightning size={24} color="#10b981" />
      <View className="ml-3 flex-1">
        <Text className="text-white font-semibold">Next Month Prediction</Text>
        <Text className="text-slate-400 text-sm">
          Get AI-powered spending forecast
        </Text>
      </View>
      <ChevronRight size={20} color="#64748b" />
    </TouchableOpacity>
  );
}