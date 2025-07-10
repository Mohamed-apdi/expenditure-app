import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScenarioHeader from "~/components/(scenarios)/ScenarioHeader";
import ScenarioControls from "~/components/(scenarios)/ScenarioControls";
import ScenarioCard from "~/components/(scenarios)/ScenarioCard";
import ScenarioEmptyState from "~/components/(scenarios)/ScenarioEmptyState";
import CompareModal from "~/components/(scenarios)/CompareModal";

export default function ScenariosScreen() {
  const [scenarios] = useState([{
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
    },]); // Your existing scenarios data
  const [compareMode, setCompareMode] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const toggleScenarioSelection = (scenarioId: number) => {
    if (selectedScenarios.includes(scenarioId)) {
      setSelectedScenarios(selectedScenarios.filter((id) => id !== scenarioId));
    } else if (selectedScenarios.length < 2) {
      setSelectedScenarios([...selectedScenarios, scenarioId]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScenarioHeader />
      
      <ScenarioControls
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        selectedScenarios={selectedScenarios}
        setSelectedScenarios={setSelectedScenarios}
        setShowCompareModal={setShowCompareModal}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 gap-4 pb-6">
          {scenarios.length > 0 ? (
            scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                compareMode={compareMode}
                isSelected={selectedScenarios.includes(scenario.id)}
                onPress={() => {
                  if (compareMode) {
                    toggleScenarioSelection(scenario.id);
                  }
                }}
              />
            ))
          ) : (
            <ScenarioEmptyState />
          )}
        </View>
      </ScrollView>

      <CompareModal
        visible={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        scenarios={scenarios.filter((s) => selectedScenarios.includes(s.id))}
      />
    </SafeAreaView>
  );
}