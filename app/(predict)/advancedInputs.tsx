import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { 
  Truck, Briefcase, Heart, CloudRain, CloudLightning, 
  ShoppingBag, Sun, DollarSign, CreditCard, 
  Home, AlertTriangle, AlertCircle, Check, 
  Minus, Plus 
} from "lucide-react-native";
import React from "react";

type InputItem = {
  key: string;
  label: string;
  icon: React.ReactElement;
  type?: "number" | "toggle";
  max?: number;
};

type CardData = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  items: InputItem[];
};

export default function AdvancedInputsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const initialData = params.inputData ? JSON.parse(params.inputData as string) : {};
  const [localData, setLocalData] = useState(initialData);
  const [currentCard, setCurrentCard] = useState(0);

  const updateValue = (key: string, value: number) => {
    setLocalData((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveAndFinish = () => {
    router.push({
      pathname: "/",
      params: { updatedData: JSON.stringify(localData) }
    });
  };

  // Define icons using Lucide components
  const livingConditions: InputItem[] = [
    { key: "liv4_21", label: "Owns Cattle", icon: <Truck size={20} /> },
    { key: "liv4_22", label: "Owns Goats", icon: <Truck size={20} /> },
    { key: "liv4_24", label: "Owns Chickens", icon: <Truck size={20} /> },
    { key: "liv4_25", label: "Owns Pigs", icon: <Truck size={20} /> },
    { key: "liv4_04", label: "Owns Bicycle", icon: <Truck size={20} /> },
    { key: "liv4_12", label: "Owns Motorcycle", icon: <Truck size={20} /> },
    { key: "liv4_13", label: "Owns Car", icon: <Truck size={20} /> },
  ];

  const economicShocks: InputItem[] = [
    { key: "shock10_03", label: "Job Loss", icon: <Briefcase size={20} /> },
    { key: "shock10_04", label: "Illness/Injury", icon: <Heart size={20} /> },
    { key: "shock10_07_21", label: "Crop Failure", icon: <CloudRain size={20} /> },
    { key: "shock10_07_23", label: "Natural Disaster", icon: <CloudLightning size={20} /> },
  ];

  const businessActivities: InputItem[] = [
    { key: "nfe16_33", label: "Small Trading", icon: <ShoppingBag size={20} /> },
    { key: "nfe16_13", label: "Agriculture", icon: <Sun size={20} /> },
  ];

  const creditFinancial: InputItem[] = [
    { key: "cr15_04quantity", label: "Loan Amount 1", icon: <DollarSign size={20} />, type: "number", max: 10000 },
    { key: "cr15_05quantity", label: "Loan Amount 2", icon: <DollarSign size={20} />, type: "number", max: 10000 },
    { key: "cr15_06", label: "Credit Access", icon: <CreditCard size={20} />, type: "toggle" },
    { key: "cr15_10", label: "Financial Services", icon: <Briefcase size={20} />, type: "toggle" },
  ];

  const cards: CardData[] = [
    {
      title: "Living Conditions",
      subtitle: "Assets and possessions",
      icon: <Home size={24} color="#10b981" />,
      color: "#10b981",
      items: livingConditions,
    },
    {
      title: "Economic Shocks",
      subtitle: "Recent challenges faced",
      icon: <AlertTriangle size={24} color="#ef4444" />,
      color: "#ef4444",
      items: economicShocks,
    },
    {
      title: "Business Activities",
      subtitle: "Income generating activities",
      icon: <Briefcase size={24} color="#3b82f6" />,
      color: "#3b82f6",
      items: businessActivities,
    },
    {
      title: "Credit & Finance",
      subtitle: "Loans and financial services",
      icon: <DollarSign size={24} color="#f59e0b" />,
      color: "#f59e0b",
      items: creditFinancial,
    },
  ];

  const renderCard = (card: CardData, index: number) => (
    <View key={index} className="bg-slate-800 rounded-xl p-5 border border-slate-700" style={{ width: width - 48 }}>
      <View className="flex-row items-center mb-5">
        <View className="w-12 h-12 rounded-xl justify-center items-center mr-4" style={{ backgroundColor: `${card.color}20` }}>
          {card.icon}
        </View>
        <View>
          <Text className="text-white text-lg font-bold">{card.title}</Text>
          <Text className="text-slate-400 text-sm">{card.subtitle}</Text>
        </View>
      </View>

      <View className="gap-3">
        {card.items.map((item) => {
          if (item.type === "number") {
            return (
              <View key={item.key} className="flex-row items-center bg-slate-700 p-4 rounded-lg justify-between">
                <View className="flex-row items-center">
                  {item.icon}
                  <Text className="text-white text-sm ml-3">{item.label}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity
                    className="w-8 h-8 rounded-full bg-slate-600 justify-center items-center"
                    onPress={() => updateValue(item.key, Math.max(0, (localData[item.key] || 0) - 100))}
                  >
                    <Minus size={16} color="#f8fafc" />
                  </TouchableOpacity>
                  <Text className="text-emerald-500 font-bold">${localData[item.key] || 0}</Text>
                  <TouchableOpacity
                    className="w-8 h-8 rounded-full bg-slate-600 justify-center items-center"
                    onPress={() => updateValue(item.key, Math.min(item.max || 10000, (localData[item.key] || 0) + 100))}
                  >
                    <Plus size={16} color="#f8fafc" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          } else {
            return (
              <TouchableOpacity
                key={item.key}
                className={`flex-row items-center justify-between p-4 rounded-lg ${localData[item.key] === 1 ? 'bg-emerald-500' : 'bg-slate-700'}`}
                onPress={() => updateValue(item.key, localData[item.key] === 1 ? 0 : 1)}
              >
                <View className="flex-row items-center">
                  {React.cloneElement(item.icon as React.ReactElement<any>, { 
                    color: localData[item.key] === 1 ? "#ffffff" : "#94a3b8" 
                  })}
                  <Text className={`ml-3 ${localData[item.key] === 1 ? 'text-white font-semibold' : 'text-slate-400'}`}>
                    {item.label}
                  </Text>
                </View>
                {localData[item.key] === 1 && <Check size={16} color="#ffffff" />}
              </TouchableOpacity>
            );
          }
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Progress Indicator */}
      <View className="px-6 py-4">
        <View className="h-1 bg-slate-700 rounded-full mb-2">
          <View className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
        </View>
        <Text className="text-slate-400 text-xs text-center">Step 2 of 2</Text>
      </View>

      {/* Header */}
      <View className="px-6 py-4">
        <Text className="text-white text-2xl font-bold mb-2">Advanced Metrics</Text>
        <Text className="text-slate-400 text-base">
          Swipe through cards to provide additional information
        </Text>
      </View>

      {/* Card Indicators */}
      <View className="flex-row justify-center gap-2 py-4">
        {cards.map((_, index) => (
          <View 
            key={index} 
            className={`w-2 h-2 rounded-full ${index === currentCard ? 'bg-emerald-500' : 'bg-slate-700'}`}
          />
        ))}
      </View>

      {/* Swipeable Cards */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const cardIndex = Math.round(event.nativeEvent.contentOffset.x / (width - 48));
          setCurrentCard(cardIndex);
        }}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
      >
        {cards.map(renderCard)}
      </ScrollView>

      {/* Additional Options */}
      <View className="px-6 py-5 gap-4">
        {/* Food Security */}
        <View className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <View className="flex-row items-center mb-3">
            <AlertCircle size={20} color="#f59e0b" />
            <Text className="text-white text-base font-semibold ml-2">Food Security</Text>
          </View>
          <TouchableOpacity
            className={`py-3 rounded-lg ${localData.foodsec7_07 === 1 ? 'bg-red-500' : 'bg-slate-700'}`}
            onPress={() => updateValue("foodsec7_07", localData.foodsec7_07 === 1 ? 0 : 1)}
          >
            <Text className={`text-center font-medium ${localData.foodsec7_07 === 1 ? 'text-white' : 'text-slate-400'}`}>
              {localData.foodsec7_07 === 1 ? "Food Insecure" : "Food Secure"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Remittances */}
        <View className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <View className="flex-row items-center mb-3">
            <DollarSign size={20} color="#10b981" />
            <Text className="text-white text-base font-semibold ml-2">Remittances</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-white text-sm">Monthly Amount: ${localData.remt9_11 || 0}</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-slate-700 justify-center items-center"
                onPress={() => updateValue("remt9_11", Math.max(0, (localData.remt9_11 || 0) - 100))}
              >
                <Minus size={16} color="#f8fafc" />
              </TouchableOpacity>
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-slate-700 justify-center items-center"
                onPress={() => updateValue("remt9_11", (localData.remt9_11 || 0) + 100)}
              >
                <Plus size={16} color="#f8fafc" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Finish Button */}
      <View className="px-6 py-4 bg-slate-900">
        <TouchableOpacity 
          className="bg-emerald-500 flex-row justify-center items-center py-4 rounded-xl"
          onPress={saveAndFinish}
        >
          <Text className="text-white font-bold mr-2">Complete Setup</Text>
          <Check size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}