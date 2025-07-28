"use client";

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  Plus,
  DollarSign,
  Users,
  MapPin,
  Home,
  Trash2,
  Edit3,
  TrendingUp,
  BarChart3,
  Clock,
} from "lucide-react-native";
import { supabase } from "~/lib/supabase";

interface PredictionData {
  id: string;
  user_id: string;
  input_data: {
    Region: string;
    Residence_Type: string;
    Business_Revenue: number;
    Food_Expenditure: number;
    Number_of_Members: number;
    Housing_Expenditure: number;
    NonFood_Expenditure: number;
    Transport_Expenditure: number;
    Utilities_Expenditure: number;
    Livestock_Byproducts_Value: number;
    General_NonFood_Expenditure: number;
    Spent_on_Food_Drink_Outside: number;
  };
  predicted_exp: number;
  model_used: string;
  created_at: string;
}

export default function PredictScreen() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);

  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_KEY = process.env.SUPABASE_KEY!;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const loadUserPredictions = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");

      const { data, error: fetchError } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setPredictions(data || []);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Could not load predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let channel;

    const setupChannel = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      channel = supabase
        .channel("predictions_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "predictions",
            filter: `user_id=eq.${user?.id}`,
          },
          (payload) => {
            console.log("Change received:", payload);
            if (payload.eventType === "INSERT") {
              setPredictions((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setPredictions((prev) =>
                prev.map((p) => (p.id === payload.new.id ? payload.new : p))
              );
            } else if (payload.eventType === "DELETE") {
              setPredictions((prev) =>
                prev.filter((p) => p.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        if (channel) supabase.removeChannel(channel);
      };
    };

    setupChannel();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserPredictions();
      return () => {};
    }, [])
  );

  const handleDeletePrediction = (id: string) => {
    Alert.alert(
      "Delete Prediction",
      "Are you sure you want to delete this prediction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // 1) delete from Supabase
            const { error } = await supabase
              .from("predictions")
              .delete() // ← delete operation
              .eq("id", id); // ← match on id :contentReference[oaicite:0]{index=0}

            if (error) {
              return Alert.alert("Error deleting", error.message);
            }

            // 2) update local list
            setPredictions((prev) => prev.filter((p) => p.id !== id));
          },
        },
      ]
    );
  };

  const handleEditPrediction = (prediction: PredictionData) => {
    router.push({
      pathname: "/(predict)/NewPrediction",
      params: {
        mode: "edit",
        predictionId: prediction.id,
        predictionData: JSON.stringify(prediction),
      },
    });
  };

  const handleAddNewPrediction = () => {
    router.push("/(predict)/NewPrediction");
  };

  // Show a spinner while loading
  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-900">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-slate-400 mt-2">Loading predictions…</Text>
      </SafeAreaView>
    );
  }

  const PredictionCard = ({ prediction }: { prediction: PredictionData }) => {
    const totalInputs =
      prediction.input_data.Food_Expenditure +
      prediction.input_data.NonFood_Expenditure +
      prediction.input_data.Housing_Expenditure +
      prediction.input_data.Transport_Expenditure +
      prediction.input_data.Utilities_Expenditure;

    return (
      <TouchableOpacity
        className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700"
        onPress={() => handleEditPrediction(prediction)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <BarChart3 size={16} color="#10b981" />
              <Text className="text-emerald-500 font-bold text-lg ml-2">
                {formatCurrency(prediction.predicted_exp)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Clock size={12} color="#64748b" />
              <Text className="text-slate-400 text-xs ml-1">
                {formatDate(prediction.created_at)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="bg-blue-500/20 p-2 rounded-lg"
              onPress={() => handleEditPrediction(prediction)}
            >
              <Edit3 size={16} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-500/20 p-2 rounded-lg"
              onPress={() => handleDeletePrediction(prediction.id)}
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Household Info */}
        <View className="flex-row justify-between mb-3">
          <View className="flex-row items-center">
            <MapPin size={14} color="#64748b" />
            <Text className="text-slate-300 text-sm ml-1">
              {prediction.input_data.Region}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Home size={14} color="#64748b" />
            <Text className="text-slate-300 text-sm ml-1">
              {prediction.input_data.Residence_Type}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Users size={14} color="#64748b" />
            <Text className="text-slate-300 text-sm ml-1">
              {prediction.input_data.Number_of_Members} members
            </Text>
          </View>
        </View>

        {/* Expenditure Breakdown */}
        <View className="bg-slate-700/50 rounded-lg p-3">
          <Text className="text-slate-300 text-xs font-medium mb-2">
            Input Breakdown
          </Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-slate-400 text-xs">Food</Text>
              <Text className="text-white text-sm font-bold">
                {formatCurrency(prediction.input_data.Food_Expenditure)}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-slate-400 text-xs">Housing</Text>
              <Text className="text-white text-sm font-bold">
                {formatCurrency(prediction.input_data.Housing_Expenditure)}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-slate-400 text-xs">Transport</Text>
              <Text className="text-white text-sm font-bold">
                {formatCurrency(prediction.input_data.Transport_Expenditure)}
              </Text>
            </View>
          </View>
        </View>

        {/* Model Info */}
        <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-700">
          <View className="flex-row items-center">
            <View className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
            <Text className="text-slate-400 text-xs">
              Model: {prediction.model_used}
            </Text>
          </View>
          <View className="flex-row items-center">
            <TrendingUp size={12} color="#64748b" />
            <Text className="text-slate-400 text-xs ml-1">
              {((prediction.predicted_exp / totalInputs - 1) * 100).toFixed(1)}%
              variance
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="px-6 py-5 border-b border-slate-800">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-2xl font-bold">Predictions</Text>
            <Text className="text-slate-400 mt-1">
              {predictions.length} prediction
              {predictions.length !== 1 ? "s" : ""} saved
            </Text>
          </View>
          <TouchableOpacity
            className="bg-emerald-500 px-4 py-2 rounded-xl flex-row items-center"
            onPress={handleAddNewPrediction}
          >
            <Plus size={18} color="#ffffff" />
            <Text className="text-white font-bold ml-2">New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Overview */}
      <View className="px-6 py-4">
        <View className="flex-row gap-4">
          <View className="flex-1 bg-slate-800 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <DollarSign size={16} color="#10b981" />
              <Text className="text-slate-400 text-sm ml-2">
                Avg Prediction
              </Text>
            </View>
            <Text className="text-white text-lg font-bold">
              {formatCurrency(
                predictions.reduce((sum, p) => sum + p.predicted_exp, 0) /
                  predictions.length || 0
              )}
            </Text>
          </View>

          <View className="flex-1 bg-slate-800 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <TrendingUp size={16} color="#3b82f6" />
              <Text className="text-slate-400 text-sm ml-2">Highest</Text>
            </View>
            <Text className="text-white text-lg font-bold">
              {formatCurrency(
                Math.max(...predictions.map((p) => p.predicted_exp))
              )}
            </Text>
          </View>
        </View>
      </View>

      {/* Predictions List */}
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {predictions.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <View className="bg-slate-800 w-20 h-20 rounded-full justify-center items-center mb-4">
              <BarChart3 size={32} color="#64748b" />
            </View>
            <Text className="text-slate-300 text-lg font-bold mb-2">
              No Predictions Yet
            </Text>
            <Text className="text-slate-400 text-center mb-6 px-8">
              Create your first household expenditure prediction to get started
            </Text>
            <TouchableOpacity
              className="bg-emerald-500 px-6 py-3 rounded-xl flex-row items-center"
              onPress={handleAddNewPrediction}
            >
              <Plus size={18} color="#ffffff" />
              <Text className="text-white font-bold ml-2">
                Create Prediction
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="pb-6">
            {predictions.map((prediction) => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
