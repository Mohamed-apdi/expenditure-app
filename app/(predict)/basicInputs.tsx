import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Slider from "@react-native-community/slider";
import {
  ShoppingCart,
  Package,
  Home,
  UserCheck,
  Percent,
  Users,
  MapPin,
  TrendingDown,
  Zap,
  Minus,
  Plus,
  ArrowRight,
  Check,
} from "lucide-react-native";

type InputData = {
  exp_food: number;
  exp_nfnd: number;
  exp_rent: number;
  pce?: number;
  pcer?: number;
  hhsize: number;
  region_n: number;
  poor?: number;
  hh_electricity: number;
  hh_water_type?: number;
};

export default function BasicInputsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [localData, setLocalData] = useState<InputData>(
    params.inputData ? JSON.parse(params.inputData as string) : {
      exp_food: 500,
      exp_nfnd: 300,
      exp_rent: 0,
      hhsize: 4,
      region_n: 2,
      hh_electricity: 1,
    }
  );

  const updateValue = (key: keyof InputData, value: number) => {
    setLocalData((prev) => ({ ...prev, [key]: value }));
  };

  const saveAndContinue = () => {
    router.push({
      pathname: "../predict/advancedInputs",
      params: { inputData: JSON.stringify(localData) },
    });
  };

  const regions = [
    { id: 1, name: "Rural", value: 1 },
    { id: 2, name: "Urban", value: 2 },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pb-24">
        {/* Progress Indicator */}
        <View className="px-6 py-4">
          <View className="h-1 bg-slate-700 rounded-full mb-2">
            <View className="h-full bg-emerald-500 rounded-full w-1/2" />
          </View>
          <Text className="text-slate-400 text-xs text-center">Step 1 of 2</Text>
        </View>

        {/* Food Expenditure */}
        <View className="bg-slate-800 mx-6 mb-4 p-5 rounded-xl border border-slate-700">
          <View className="flex-row items-center mb-2">
            <ShoppingCart size={24} color="#10b981" />
            <Text className="text-white text-lg font-bold ml-3">Food Expenditure</Text>
          </View>
          <Text className="text-slate-400 text-sm mb-5">
            Monthly spending on food and groceries
          </Text>

          <View className="px-2">
            <Slider
              minimumValue={0}
              maximumValue={2000}
              value={localData.exp_food}
              onValueChange={(value) => updateValue("exp_food", Math.round(value))}
              minimumTrackTintColor="#10b981"
              maximumTrackTintColor="#334155"
              thumbTintColor="#10b981"
            />
            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-slate-500 text-xs">$0</Text>
              <Text className="text-emerald-500 text-lg font-bold">${localData.exp_food}</Text>
              <Text className="text-slate-500 text-xs">$2000</Text>
            </View>
          </View>
        </View>

        {/* Non-Food Expenditure */}
        <View className="bg-slate-800 mx-6 mb-4 p-5 rounded-xl border border-slate-700">
          <View className="flex-row items-center mb-2">
            <Package size={24} color="#3b82f6" />
            <Text className="text-white text-lg font-bold ml-3">Non-Food Expenditure</Text>
          </View>
          <Text className="text-slate-400 text-sm mb-5">
            Monthly spending on non-food items (clothing, household goods, etc.)
          </Text>

          <View className="px-2">
            <Slider
              minimumValue={0}
              maximumValue={1500}
              value={localData.exp_nfnd}
              onValueChange={(value) => updateValue("exp_nfnd", Math.round(value))}
              minimumTrackTintColor="#3b82f6"
              maximumTrackTintColor="#334155"
              thumbTintColor="#3b82f6"
            />
            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-slate-500 text-xs">$0</Text>
              <Text className="text-blue-500 text-lg font-bold">${localData.exp_nfnd}</Text>
              <Text className="text-slate-500 text-xs">$1500</Text>
            </View>
          </View>
        </View>

        {/* Household Size */}
        <View className="bg-slate-800 mx-6 mb-4 p-5 rounded-xl border border-slate-700">
          <View className="flex-row items-center mb-2">
            <Users size={24} color="#f59e0b" />
            <Text className="text-white text-lg font-bold ml-3">Household Size</Text>
          </View>
          <Text className="text-slate-400 text-sm mb-5">
            Number of people living in your household
          </Text>

          <View className="flex-row items-center justify-center gap-5">
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-slate-700 justify-center items-center"
              onPress={() => updateValue("hhsize", Math.max(1, localData.hhsize - 1))}
            >
              <Minus size={20} color="#f8fafc" />
            </TouchableOpacity>

            <View className="items-center min-w-[80px]">
              <Text className="text-white text-3xl font-bold">{localData.hhsize}</Text>
              <Text className="text-slate-400 text-xs mt-1">people</Text>
            </View>

            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-slate-700 justify-center items-center"
              onPress={() => updateValue("hhsize", Math.min(20, localData.hhsize + 1))}
            >
              <Plus size={20} color="#f8fafc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Region Selection */}
        <View className="bg-slate-800 mx-6 mb-4 p-5 rounded-xl border border-slate-700">
          <View className="flex-row items-center mb-2">
            <MapPin size={24} color="#ef4444" />
            <Text className="text-white text-lg font-bold ml-3">Region Type</Text>
          </View>
          <Text className="text-slate-400 text-sm mb-5">Select your area type</Text>

          <View className="flex-row gap-3">
            {regions.map((region) => (
              <TouchableOpacity
                key={region.id}
                className={`flex-1 py-4 px-5 rounded-lg items-center ${
                  localData.region_n === region.value ? "bg-emerald-500" : "bg-slate-700"
                }`}
                onPress={() => updateValue("region_n", region.value)}
              >
                <Text
                  className={`text-base font-medium ${
                    localData.region_n === region.value ? "text-white font-bold" : "text-slate-400"
                  }`}
                >
                  {region.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Utilities */}
        <View className="bg-slate-800 mx-6 mb-4 p-5 rounded-xl border border-slate-700">
          <View className="flex-row items-center mb-2">
            <Zap size={24} color="#06b6d4" />
            <Text className="text-white text-lg font-bold ml-3">Utilities</Text>
          </View>

          <View className="gap-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-base font-medium">Electricity Access</Text>
              <TouchableOpacity
                className={`w-12 h-7 rounded-full justify-center ${
                  localData.hh_electricity === 1 ? "bg-emerald-500" : "bg-slate-700"
                }`}
                onPress={() => updateValue("hh_electricity", localData.hh_electricity === 1 ? 0 : 1)}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white ${
                    localData.hh_electricity === 1 ? "self-end" : "self-start"
                  }`}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View className="px-6 py-4 bg-slate-900">
        <TouchableOpacity
          className="bg-emerald-500 flex-row items-center justify-center py-4 rounded-lg"
          onPress={saveAndContinue}
        >
          <Text className="text-white text-base font-bold mr-2">Continue to Advanced</Text>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}