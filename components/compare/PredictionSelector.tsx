// components/PredictionSelector.tsx
import { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Modal } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { supabase } from "~/lib/supabase";

export default function PredictionSelector({ selected, onSelect }: {
  selected: any;
  onSelect: (prediction: any) => void;
}) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const userId = await getItemAsync("userId");
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    if (predictions.length === 0) {
      await fetchPredictions();
    }
    setShowModal(true);
  };

  return (
    <View className="mb-6">
      <Text className="text-white text-lg mb-2">Select Prediction:</Text>
      
      <TouchableOpacity
        className="bg-slate-800 p-4 rounded-xl flex-row justify-between items-center"
        onPress={openModal}
      >
        <Text className={`${selected ? "text-white" : "text-slate-500"}`}>
          {selected?.name || "Select a prediction"}
        </Text>
        <ChevronDown size={20} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide">
        <View className="flex-1 bg-slate-900 p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-xl font-bold">Your Predictions</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <X size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text className="text-white text-center">Loading...</Text>
          ) : (
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="p-4 border-b border-slate-800 flex-row items-center"
                  onPress={() => {
                    onSelect(item);
                    setShowModal(false);
                  }}
                >
                  <View className="flex-1">
                    <Text className="text-white">{item.name}</Text>
                    <Text className="text-slate-500 text-sm">
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {selected?.id === item.id && <Check size={20} color="#10b981" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="text-slate-500 text-center mt-8">
                  No predictions found
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}