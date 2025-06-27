import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, GitCompare, Plus, X, Edit3, Copy, Trash2, Layers } from "lucide-react-native";

export default function ScenariosScreen() {
  const router = useRouter();
  const [scenarios] = useState([
    {
      id: 1,
      name: "Current Budget",
      prediction: 1200,
      confidence: 85,
      date: "2024-01-15",
      isActive: true,
      changes: {
        food: 500,
        nonFood: 300,
        rent: 400,
      },
    },
    {
      id: 2,
      name: "Reduced Food Spending",
      prediction: 1050,
      confidence: 78,
      date: "2024-01-14",
      isActive: false,
      changes: {
        food: 350,
        nonFood: 300,
        rent: 400,
      },
    },
    {
      id: 3,
      name: "Emergency Scenario",
      prediction: 1500,
      confidence: 72,
      date: "2024-01-13",
      isActive: false,
      changes: {
        food: 600,
        nonFood: 500,
        rent: 400,
      },
    },
  ]);

  const [compareMode, setCompareMode] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const toggleScenarioSelection = (scenarioId: any) => {
    if (selectedScenarios.includes(scenarioId)) {
      setSelectedScenarios(selectedScenarios.filter((id) => id !== scenarioId));
    } else if (selectedScenarios.length < 2) {
      setSelectedScenarios([...selectedScenarios, scenarioId]);
    }
  };

  const getConfidenceColor = (confidence: any) => {
    if (confidence >= 80) return "#10b981";
    if (confidence >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const formatDate = (dateString: any) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderScenarioCard = (scenario: any) => (
    <TouchableOpacity
      key={scenario.id}
      className={`bg-slate-800 rounded-xl p-5 border ${
        scenario.isActive
          ? "border-emerald-500"
          : compareMode && selectedScenarios.includes(scenario.id)
          ? "border-blue-500"
          : "border-slate-700"
      } relative`}
      onPress={() => {
        if (compareMode) {
          toggleScenarioSelection(scenario.id);
        }
      }}
    >
      {compareMode && (
        <View className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full justify-center items-center z-10">
          {selectedScenarios.includes(scenario.id) && <Check size={16} color="#ffffff" />}
        </View>
      )}

      <View className="mb-4">
        <View className="flex-row items-center mb-1">
          <Text className="text-white text-lg font-bold mr-3">{scenario.name}</Text>
          {scenario.isActive && (
            <View className="bg-emerald-500 px-2 py-1 rounded">
              <Text className="text-white text-xs font-bold uppercase">Active</Text>
            </View>
          )}
        </View>
        <Text className="text-slate-500 text-xs">{formatDate(scenario.date)}</Text>
      </View>

      <View className="items-center mb-5">
        <Text className="text-emerald-500 text-3xl font-bold">${scenario.prediction}</Text>
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
          <Text className="text-slate-400 text-sm font-bold">${scenario.changes.food}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-blue-500 mr-3" />
            <Text className="text-slate-300 text-sm">Non-Food</Text>
          </View>
          <Text className="text-slate-400 text-sm font-bold">${scenario.changes.nonFood}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-purple-500 mr-3" />
            <Text className="text-slate-300 text-sm">Rent</Text>
          </View>
          <Text className="text-slate-400 text-sm font-bold">${scenario.changes.rent}</Text>
        </View>
      </View>

      {!compareMode && (
        <View className="flex-row justify-around border-t border-slate-700 pt-4">
          <TouchableOpacity className="flex-row items-center px-3 py-2">
            <Edit3 size={16} color="#94a3b8" />
            <Text className="text-slate-400 text-xs ml-1.5">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center px-3 py-2">
            <Copy size={16} color="#94a3b8" />
            <Text className="text-slate-400 text-xs ml-1.5">Duplicate</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center px-3 py-2">
            <Trash2 size={16} color="#ef4444" />
            <Text className="text-red-500 text-xs ml-1.5">Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const CompareModal = () => {
    const selectedScenariosData = scenarios.filter((s) => selectedScenarios.includes(s.id));

    return (
      <Modal visible={showCompareModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-slate-900">
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
            <Text className="text-white text-xl font-bold">Compare Scenarios</Text>
            <TouchableOpacity className="p-2" onPress={() => setShowCompareModal(false)}>
              <X size={24} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6">
            <View className="py-5 gap-4">
              {selectedScenariosData.map((scenario) => (
                <View key={scenario.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <Text className="text-white text-lg font-bold mb-4">{scenario.name}</Text>

                  <View className="flex-row gap-5 mb-4">
                    <View className="flex-1 items-center">
                      <Text className="text-slate-400 text-xs mb-1">Prediction</Text>
                      <Text className="text-emerald-500 text-xl font-bold">${scenario.prediction}</Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-slate-400 text-xs mb-1">Confidence</Text>
                      <Text className="text-emerald-500 text-xl font-bold">{scenario.confidence}%</Text>
                    </View>
                  </View>

                  <View className="border-t border-slate-700 pt-4">
                    <Text className="text-white text-sm font-semibold mb-3">Breakdown</Text>
                    <View className="gap-2">
                      <View className="flex-row justify-between">
                        <Text className="text-slate-300 text-sm">Food</Text>
                        <Text className="text-slate-400 text-sm font-bold">${scenario.changes.food}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-slate-300 text-sm">Non-Food</Text>
                        <Text className="text-slate-400 text-sm font-bold">${scenario.changes.nonFood}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-slate-300 text-sm">Rent</Text>
                        <Text className="text-slate-400 text-sm font-bold">${scenario.changes.rent}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {selectedScenariosData.length === 2 && (
              <View className="bg-slate-800 rounded-xl p-5 border border-blue-500 mb-6">
                <Text className="text-blue-500 text-lg font-bold mb-3">Difference Analysis</Text>
                <View className="items-center">
                  <Text className="text-slate-300 text-sm text-center leading-5">
                    Scenario "{selectedScenariosData[1].name}" costs{" "}
                    <Text className="text-emerald-500 font-bold">
                      ${Math.abs(selectedScenariosData[1].prediction - selectedScenariosData[0].prediction)}
                    </Text>
                    {selectedScenariosData[1].prediction > selectedScenariosData[0].prediction ? " more" : " less"} than
                    "{selectedScenariosData[0].name}"
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-6 py-5">
        <Text className="text-white text-2xl font-bold mb-2">Saved Scenarios</Text>
        <Text className="text-slate-400 text-base leading-6">
          Compare different spending scenarios and their predictions
        </Text>
      </View>

      <View className="flex-row justify-between items-center px-6 pb-4">
        <TouchableOpacity
          className={`flex-row items-center px-4 py-2 rounded-lg border ${
            compareMode ? "bg-emerald-500 border-emerald-500" : "bg-slate-800 border-slate-700"
          }`}
          onPress={() => {
            setCompareMode(!compareMode);
            setSelectedScenarios([]);
          }}
        >
          <GitCompare size={16} color={compareMode ? "#ffffff" : "#94a3b8"} />
          <Text className={`ml-2 text-sm ${compareMode ? "text-white" : "text-slate-400"}`}>
            {compareMode ? "Exit Compare" : "Compare"}
          </Text>
        </TouchableOpacity>

        {compareMode && selectedScenarios.length === 2 && (
          <TouchableOpacity
            className="bg-blue-500 px-4 py-2 rounded-lg"
            onPress={() => setShowCompareModal(true)}
          >
            <Text className="text-white text-sm font-semibold">Compare Selected</Text>
          </TouchableOpacity>
        )}

        {!compareMode && (
          <TouchableOpacity
            className="flex-row items-center bg-emerald-500 px-4 py-2 rounded-lg"
            onPress={() => router.push("../predict/basicInputs" as never)}
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white text-sm font-semibold ml-2">New Scenario</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 gap-4 pb-6">
          {scenarios.map(renderScenarioCard)}
        </View>

        {scenarios.length === 0 && (
          <View className="items-center py-16 px-10">
            <Layers size={48} color="#64748b" />
            <Text className="text-white text-xl font-bold mt-4 mb-2">No Scenarios Yet</Text>
            <Text className="text-slate-400 text-base text-center leading-6 mb-6">
              Create your first scenario to start comparing different spending patterns
            </Text>
            <TouchableOpacity
              className="bg-emerald-500 px-6 py-3 rounded-lg"
              onPress={() => router.push("../predict/basicInputs" as never)}
            >
              <Text className="text-white text-base font-semibold">Create First Scenario</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CompareModal />
    </SafeAreaView>
  );
}