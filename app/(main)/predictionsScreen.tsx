import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { 
  Zap, Home, Users, MapPin, TrendingUp, 
  ShoppingCart, Package,  Check,
  ChevronRight, ChevronLeft, Droplet, 
  Battery, Heart, Shield, Gift, Beef, PiggyBank,
  Activity, AlertTriangle, Crosshair, BarChart2,
  ChevronDown,
} from "lucide-react-native";
import { predictExpenditure } from "~/lib/api";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RNPickerSelect from 'react-native-picker-select';
type FormData = {
  // Basic Info
  hhsize: number;
  region_n: number;
  hh_water_type: number;
  hh_electricity: number;
  
  // Expenditures
  exp_food: number;
  exp_nfnd: number;
  exp_rent: number;
  
  // Economic Indicators
  pce: number;
  pcer: number;
  poor: number;
  foodsec7_07: number;
  remt9_11: number;
  
  // Livestock/Assets
  liv4_04: number;
  liv4_12: number;
  liv4_13: number;
  liv4_21: number;
  liv4_22: number;
  liv4_24: number;
  liv4_25: number;
  
  // Non-Farm Enterprises
  nfe16_13: number;
  nfe16_33: number;
  
  // Shocks
  shock10_03: number;
  shock10_04: number;
  shock10_07_21: number;
  shock10_07_23: number;
  
  // Consumption Quantities
  cr15_04quantity: number;
  cr15_05quantity: number;
  cr15_06: number;
  cr15_10: number;
};


interface FieldOption {
  label: string;
  value: number;
}


interface FormField {
  key: keyof FormData;
  label: string;
  type: "number" | "currency" | "select" | "toggle";
  min?: number;
  max?: number;
  icon?: React.ReactElement;
  options?: FieldOption[];
  step?: number;
}

interface FieldGroup {
  title: string;
  icon: React.ReactElement;
  fields: FormField[];
}

const waterTypeOptions = [
  { label: "Piped water into dwelling", value: 1 },
  { label: "Tubewell/borehole", value: 2 },
  { label: "Tanker-truck", value: 3 },
  { label: "Protected dug well", value: 4 },
  { label: "Piped water to yard/plot", value: 5 },
  { label: "Rainwater collection", value: 6 },
  { label: "Natural surface water (river, dam, lake)", value: 7 },
  { label: "Public tap/standpipe", value: 8 },
  { label: "Unprotected dug well", value: 9 },
  { label: "Cart with small tank/drum", value: 10 },
  { label: "Protected spring", value: 11 },
  { label: "Surface water (pond, stream, canal)", value: 12 },
  { label: "Water catchment", value: 13 },
  { label: "From neighbours", value: 14 },
  { label: "Unprotected spring", value: 15 },
  { label: "Bottled water", value: 16 },
  { label: "Other (specify)", value: 17 }
];

const shockTypeOptions = [
  { label: "None", value: 0 },
  { label: "Drought", value: 1 },
  { label: "Flood", value: 2 },
  { label: "Price Increase", value: 3 },
  { label: "Job Loss", value: 4 }
];

const lossTypeOptions = [
  { label: "None", value: 0 },
  { label: "Income Loss", value: 1 },
  { label: "Asset Loss", value: 2 },
  { label: "Crop Loss", value: 3 }
];

// Group fields into logical categories
const fieldGroups: FieldGroup[] = [
  {
    title: "Household Profile",
    icon: <Home size={20} color="#10b981" />,
    fields: [
      { key: "hhsize", label: "Household Size", type: "number", min: 1, max: 20, icon: <Users size={16} /> },
      {
      key: "region_n", 
      label: "Region", 
      type: "select", 
      options: [
        { label: "Waqooyi Galbeed", value: 1 },
        { label: "Banadir", value: 2 },
        { label: "Togdheer", value: 3 },
        { label: "Mudug", value: 4 },
        { label: "Galgaduud", value: 5 },
        { label: "Middle Shabelle", value: 6 },
        { label: "Gedo", value: 7 },
        { label: "Lower Shabelle", value: 8 },
        { label: "Hiraan", value: 9 },
        { label: "Bay", value: 10 },
        { label: "Nugaal", value: 11 },
        { label: "Bari", value: 12 },
        { label: "Lower Juba", value: 13 },
        { label: "Bakool", value: 14 },
        { label: "Sool", value: 15 },
        { label: "Sanaag", value: 16 },
        { label: "Awdal", value: 17 }
      ],
      icon: <MapPin size={16} />
    },
      { key: "hh_water_type", label: "Water Source", type: "select", options: waterTypeOptions, icon: <Droplet size={16} /> },
      { key: "hh_electricity", label: "Has Electricity", type: "toggle", icon: <Battery size={16} /> },
    ]
  },
  {
    title: "Monthly Expenditures",
    icon: <TrendingUp size={20} color="#3b82f6" />,
    fields: [
      { key: "exp_food", label: "Food Expenses", type: "currency", icon: <ShoppingCart size={16} /> },
      { key: "exp_nfnd", label: "Non-Food Expenses", type: "currency", icon: <Package size={16} /> },
      { key: "exp_rent", label: "Housing Expenses", type: "currency", icon: <Home size={16} /> },
    ]
  },
  {
    title: "Economic Status",
    icon: <BarChart2 size={20} color="#f59e0b" />,
    fields: [
      { key: "pce", label: "Per Capita Expenditure", type: "currency", icon: <Activity size={16} /> },
      { key: "pcer", label: "PCE Rate (%)", type: "number", min: 0, max: 100, step: 5, icon: <TrendingUp size={16} /> },
      { key: "poor", label: "Poverty Status", type: "toggle", icon: <Heart size={16} /> },
      { key: "foodsec7_07", label: "Food Insecurity", type: "toggle", icon: <AlertTriangle size={16} /> },
      { key: "remt9_11", label: "Remittances Received", type: "currency", icon: <Gift size={16} /> },
    ]
  },
  {
    title: "Livestock & Assets",
    icon: <Beef size={20} color="#8b5cf6" />,
    fields: [
      { key: "liv4_04", label: "Cattle Owned", type: "number", min: 0, max: 20, icon: <Beef size={16} /> },
      { key: "liv4_12", label: "Goats Owned", type: "number", min: 0, max: 20, icon: <Beef size={16} /> },
      { key: "liv4_13", label: "Sheep Owned", type: "number", min: 0, max: 20, icon: <Beef size={16} /> },
      { key: "liv4_21", label: "Poultry Owned", type: "number", min: 0, max: 50, icon: <Beef size={16} /> },
      { key: "liv4_22", label: "Pigs Owned", type: "number", min: 0, max: 20, icon: <PiggyBank size={16} /> },
      { key: "liv4_24", label: "Farm Tools", type: "number", min: 0, max: 20, icon: <Shield size={16} /> },
      { key: "liv4_25", label: "Vehicles", type: "number", min: 0, max: 5, icon: <Shield size={16} /> },
    ]
  },
  {
    title: "Non-Farm Enterprises",
    icon: <PiggyBank size={20} color="#ec4899" />,
    fields: [
      { key: "nfe16_13", label: "Small Trade Value", type: "currency", icon: <Activity size={16} /> },
      { key: "nfe16_33", label: "Service Business Value", type: "currency", icon: <Activity size={16} /> },
    ]
  },
  {
    title: "Shocks & Coping",
    icon: <AlertTriangle size={20} color="#ef4444" />,
    fields: [
      { key: "shock10_03", label: "Recent Shock Type", type: "select", options: shockTypeOptions, icon: <Crosshair size={16} /> },
      { key: "shock10_04", label: "Loss Type", type: "select", options: lossTypeOptions, icon: <AlertTriangle size={16} /> },
      { key: "shock10_07_21", label: "Sold Assets", type: "toggle", icon: <Shield size={16} /> },
      { key: "shock10_07_23", label: "Reduced Food", type: "toggle", icon: <ShoppingCart size={16} /> },
    ]
  },
  {
    title: "Consumption",
    icon: <ShoppingCart size={20} color="#14b8a6" />,
    fields: [
      { key: "cr15_04quantity", label: "Staple Food (kg)", type: "number", min: 0, max: 100, step: 5, icon: <Package size={16} /> },
      { key: "cr15_05quantity", label: "Protein Food (kg)", type: "number", min: 0, max: 50, step: 1, icon: <Package size={16} /> },
      { key: "cr15_06", label: "Vegetables (kg)", type: "number", min: 0, max: 50, step: 1, icon: <Package size={16} /> },
      { key: "cr15_10", label: "Other Items", type: "number", min: 0, max: 50, step: 1, icon: <Package size={16} /> },
    ]
  }
];

const defaultValues: FormData = {
  // Basic Info
  hhsize: 4,
  region_n: 1,
  hh_water_type: 1,
  hh_electricity: 0,
  
  // Expenditures
  exp_food: 0,
  exp_nfnd: 0,
  exp_rent: 0,
  
  // Economic Indicators
  pce: 0,
  pcer: 0,
  poor: 0,
  foodsec7_07: 0,
  remt9_11: 0,
  
  // Livestock/Assets
  liv4_04: 0,
  liv4_12: 0,
  liv4_13: 0,
  liv4_21: 0,
  liv4_22: 0,
  liv4_24: 0,
  liv4_25: 0,
  
  // Non-Farm Enterprises
  nfe16_13: 0,
  nfe16_33: 0,
  
  // Shocks
  shock10_03: 0,
  shock10_04: 0,
  shock10_07_21: 0,
  shock10_07_23: 0,
  
  // Consumption Quantities
  cr15_04quantity: 0,
  cr15_05quantity: 0,
  cr15_06: 0,
  cr15_10: 0,
};

export default function PredictScreen() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(defaultValues);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  // inside your PredictScreen component
  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  const handleChange = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < fieldGroups.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        ...form,
        log_exp_food: Math.log1p(form.exp_food),
        log_exp_nfnd: Math.log1p(form.exp_nfnd),
        log_exp_rent: Math.log1p(form.exp_rent),
      };
      const res = await predictExpenditure(payload);
      setResult(res.predicted_expenditure);
    } catch (err: any) {
      console.error("Prediction error:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "number":
        return (
          <View className="flex-row items-center justify-between bg-slate-800 p-4 rounded-lg">
            <View className="flex-row items-center">
              {field.icon && (
                <View className="mr-3">
                  {React.cloneElement(field.icon as React.ReactElement<any>, { color: "#64748b" })}
                </View>
              )}
              <Text className="text-white">{field.label}</Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity 
                className="w-8 h-8 rounded-full bg-slate-700 justify-center items-center"
                onPress={() => handleChange(field.key, Math.max(field.min || 0, form[field.key] - (field.step || 1)))}
              >
                <Text className="text-white text-lg">-</Text>
              </TouchableOpacity>
              <Text className="text-white mx-4 min-w-[30px] text-center">
                {form[field.key]}
              </Text>
              <TouchableOpacity 
                className="w-8 h-8 rounded-full bg-slate-700 justify-center items-center"
                onPress={() => handleChange(field.key, Math.min(field.max || 100, form[field.key] + (field.step || 1)))}
              >
                <Text className="text-white text-lg">+</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      
      case "currency":
        return (
          <View className="bg-slate-800 p-4 rounded-lg">
            <View className="flex-row items-center mb-2">
              {field.icon && (
                <View className="mr-3">
                  {React.cloneElement(field.icon as React.ReactElement<any>, { color: "#64748b" })}
                </View>
              )}
              <Text className="text-white">{field.label}</Text>
            </View>
            <View className="flex-row items-center border-b border-slate-700 pb-2">
              <Text className="text-slate-400 mr-1">$</Text>
              <TextInput
                className="flex-1 text-white text-lg"
                value={form[field.key].toString()}
                onChangeText={(val) => handleChange(field.key, parseFloat(val) || 0)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        );
      
      // Update the renderField function for select type:
      case "select":
        return (
          <View className="bg-slate-800 p-4 rounded-lg">
            <View className="flex-row items-center mb-3">
              {field.icon && (
                <View className="mr-3">
                  {React.cloneElement(field.icon as React.ReactElement<any>, { color: "#64748b" })}
                </View>
              )}
              <Text className="text-white text-sm font-medium">{field.label}</Text>
            </View>

            <View className="bg-slate-700 rounded-lg overflow-hidden">
              <RNPickerSelect
                placeholder={{
                  label: `Select ${field.label}`,
                  value: null,
                  color: '#a3a3a3',
                }}
                value={form[field.key]}
                onValueChange={(value) => {
                  if (value !== null) {
                    handleChange(field.key, value);
                  }
                }}
                items={(field.options || []).map((option) => ({
                  label: option.label,
                  value: option.value,
                  color: '#000',
                  
                }))}
                style={{
                  inputIOS: {
                    color: 'white',
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    fontSize: 16,
                  },
                  inputAndroid: {
                    color: 'white',
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    fontSize: 16,
                  },
                  placeholder: {
                    color: '#a3a3a3',
                  },
                }}
                useNativeAndroidPickerStyle={false}
                Icon={() => <ChevronDown size={16} color="#64748b" />}
              />
            </View>
          </View>
        );
      
      case "toggle":
        return (
          <View className="flex-row justify-between items-center bg-slate-800 p-4 rounded-lg">
            <View className="flex-row items-center">
              {field.icon && (
                <View className="mr-3">
                  {React.cloneElement(field.icon as React.ReactElement<any>, { color: "#64748b" })}
                </View>
              )}
              <Text className="text-white">{field.label}</Text>
            </View>
            <TouchableOpacity
              className={`w-12 h-6 rounded-full justify-center ${
                form[field.key] === 1 ? "bg-emerald-500" : "bg-slate-700"
              }`}
              onPress={() => handleChange(field.key, form[field.key] === 1 ? 0 : 1)}
            >
              <View
                className={`w-5 h-5 rounded-full bg-white ${
                  form[field.key] === 1 ? "self-end mr-1" : "self-start ml-1"
                }`}
              />
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="px-6 py-5">
        <Text className="text-white text-2xl font-bold mb-2">
          {result ? "Prediction Result" : "Household Expenditure Predictor"}
        </Text>
        <Text className="text-slate-400">
          {result ? "Your household expenditure prediction" : `Step ${currentStep + 1} of ${fieldGroups.length}`}
        </Text>
      </View>

      {result ? (
        /* Result View */
        <View className="flex-1 px-6">
          <View className="bg-slate-800 p-6 rounded-xl border border-emerald-500 mb-6">
            <View className="items-center mb-4">
              <Text className="text-emerald-500 text-4xl font-bold">${result.toFixed(2)}</Text>
              <Text className="text-slate-400 mt-2">Predicted Monthly Expenditure</Text>
            </View>
            
            <View className="bg-slate-700 p-4 rounded-lg mb-4">
              <Text className="text-white font-semibold mb-2">Key Expenditures</Text>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Food</Text>
                  <Text className="text-slate-400 font-bold">${form.exp_food}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Non-Food</Text>
                  <Text className="text-slate-400 font-bold">${form.exp_nfnd}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Housing</Text>
                  <Text className="text-slate-400 font-bold">${form.exp_rent}</Text>
                </View>
              </View>
            </View>

            <View className="bg-slate-700 p-4 rounded-lg mb-4">
              <Text className="text-white font-semibold mb-2">Household Profile</Text>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Household Size</Text>
                  <Text className="text-slate-400 font-bold">{form.hhsize}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Region</Text>
                  <Text className="text-slate-400 font-bold">
                    {form.region_n === 1 ? "Rural" : "Urban"}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Poverty Status</Text>
                  <Text className="text-slate-400 font-bold">
                    {form.poor === 1 ? "Poor" : "Not Poor"}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              className="bg-emerald-500 py-3 rounded-lg flex-row justify-center items-center"
              onPress={() => {
                setResult(null);
                setCurrentStep(0);
              }}
            >
              <Text className="text-white font-bold mr-2">New Prediction</Text>
              <Zap size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Form View */
        <View className="flex-1">
          {/* Progress Steps */}
          <View className="px-6 py-4">
            <View className="flex-row justify-between mb-2">
              {fieldGroups.map((_, index) => (
                <View key={index} className="items-center">
                  <View className={`w-8 h-8 rounded-full justify-center items-center ${
                    currentStep === index ? "bg-emerald-500" : "bg-slate-700"
                  }`}>
                    {currentStep > index ? (
                      <Check size={16} color="#ffffff" />
                    ) : (
                      <Text className={`${
                        currentStep === index ? "text-white font-bold" : "text-slate-400"
                      }`}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
            <View className="h-1 bg-slate-700 rounded-full">
              <View 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${(currentStep + 1) / fieldGroups.length * 100}%` }}
              />
            </View>
          </View>

          {/* Form Fields */}
          <ScrollView className="px-6 mb-4" contentContainerStyle={{ paddingBottom: 20 }}>
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-lg bg-emerald-500/20 justify-center items-center mr-3">
                  {fieldGroups[currentStep].icon}
                </View>
                <Text className="text-white text-xl font-bold">
                  {fieldGroups[currentStep].title}
                </Text>
              </View>

              <View className="gap-4">
                {fieldGroups[currentStep].fields.map((field) => (
                  <View key={field.key}>
                    {renderField(field)}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Navigation Buttons */}
          <View className="px-6 py-4 flex-row justify-between bg-slate-900 border-t border-slate-800">
            {currentStep > 0 ? (
              <TouchableOpacity
                className="flex-row items-center px-6 py-3 rounded-lg bg-slate-800"
                onPress={handlePrev}
              >
                <ChevronLeft size={18} color="#ffffff" />
                <Text className="text-white ml-2">Back</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-1" />
            )}

            <TouchableOpacity
              className={`flex-row items-center px-6 py-3 rounded-lg ${
                currentStep === fieldGroups.length - 1 ? "bg-emerald-500" : "bg-blue-500"
              }`}
              onPress={handleNext}
              disabled={loading}
            >
              <Text className="text-white font-bold mr-2">
                {loading ? "Processing..." : 
                 currentStep === fieldGroups.length - 1 ? "Predict Expenditure" : "Continue"}
              </Text>
              {!loading && (
                currentStep === fieldGroups.length - 1 ? 
                <Zap size={18} color="#ffffff" /> : 
                <ChevronRight size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}