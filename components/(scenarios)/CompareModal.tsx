import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

interface CompareModalProps {
  visible: boolean;
  onClose: () => void;
  scenarios: Array<{
    id: number;
    name: string;
    prediction: number;
    confidence: number;
    changes: {
      food: number;
      nonFood: number;
      rent: number;
    };
  }>;
}

export default function CompareModal({ visible, onClose, scenarios }: CompareModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
          <Text className="text-white text-xl font-bold">
            Compare Scenarios
          </Text>
          <TouchableOpacity
            className="p-2"
            onPress={onClose}
          >
            <X size={24} color="#f8fafc" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6">
          <View className="py-5 gap-4">
            {scenarios.map((scenario) => (
              <View
                key={scenario.id}
                className="bg-slate-800 rounded-xl p-5 border border-slate-700"
              >
                <Text className="text-white text-lg font-bold mb-4">
                  {scenario.name}
                </Text>

                <View className="flex-row gap-5 mb-4">
                  <View className="flex-1 items-center">
                    <Text className="text-slate-400 text-xs mb-1">
                      Prediction
                    </Text>
                    <Text className="text-emerald-500 text-xl font-bold">
                      ${scenario.prediction}
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-slate-400 text-xs mb-1">
                      Confidence
                    </Text>
                    <Text className="text-emerald-500 text-xl font-bold">
                      {scenario.confidence}%
                    </Text>
                  </View>
                </View>

                <View className="border-t border-slate-700 pt-4">
                  <Text className="text-white text-sm font-semibold mb-3">
                    Breakdown
                  </Text>
                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-300 text-sm">Food</Text>
                      <Text className="text-slate-400 text-sm font-bold">
                        ${scenario.changes.food}
                      </Text>
                    </View>
                    {/* Other breakdown items... */}
                  </View>
                </View>
              </View>
            ))}
          </View>

          {scenarios.length === 2 && (
            <View className="bg-slate-800 rounded-xl p-5 border border-blue-500 mb-6">
              <Text className="text-blue-500 text-lg font-bold mb-3">
                Difference Analysis
              </Text>
              <View className="items-center">
                <Text className="text-slate-300 text-sm text-center leading-5">
                  Scenario "{scenarios[1].name}" costs{" "}
                  <Text className="text-emerald-500 font-bold">
                    $
                    {Math.abs(
                      scenarios[1].prediction - scenarios[0].prediction
                    )}
                  </Text>
                  {scenarios[1].prediction > scenarios[0].prediction
                    ? " more"
                    : " less"}{" "}
                  than "{scenarios[0].name}"
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}