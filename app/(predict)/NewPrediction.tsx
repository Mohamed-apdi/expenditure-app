"use client";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Zap,
  Home,
  Users,
  MapPin,
  TrendingUp,
  ShoppingCart,
  Package,
  Check,
  ChevronRight,
  ChevronLeft,
  Droplet,
  PiggyBank,
  BookOpen,
  Wifi,
  ChevronDown,
  ArrowLeft,
} from "lucide-react-native";
import { predictExpenditure } from "~/lib/api";
import React from "react";
import RNPickerSelect from "react-native-picker-select";

type FormData = {
  // Basic Info
  hhsize: number;
  Region_Name: string;
  Area_Name: string;

  // Expenditures
  exp_food: number;
  exp_rent: number;
  exp_Education: number;
  exp_Water: number;
  exp_Electricity: number;
  Savings_or_Insurance_Payment: number;
  Communication_Exp: number;
};

interface FieldOption {
  label: string;
  value: string | number;
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

const areaOptions = [
  { label: "Urban", value: "Urban" },
  { label: "Rural", value: "Rural" },
];

const regionOptions = [
  { label: "Awdal", value: "Awdal" },
  { label: "Bakool", value: "Bakool" },
  { label: "Banadir", value: "Banadir" },
  { label: "Bari", value: "Bari" },
  { label: "Bay", value: "Bay" },
  { label: "Galgaduud", value: "Galgaduud" },
  { label: "Gedo", value: "Gedo" },
  { label: "Hiraan", value: "Hiraan" },
  { label: "Lower Juba", value: "Lower Juba" },
  { label: "Lower Shabelle", value: "Lower Shabelle" },
  { label: "Waqooyi Galbeed", value: "Waqooyi Galbeed" },
  { label: "Middle Shabelle", value: "Middle Shabelle" },
  { label: "Mudug", value: "Mudug" },
  { label: "Nugaal", value: "Nugaal" },
  { label: "Sanaag", value: "Sanaag" },
  { label: "Sool", value: "Sool" },
  { label: "Togdheer", value: "Togdheer" },
];

// Group fields into logical categories
const fieldGroups: FieldGroup[] = [
  {
    title: "Household Profile",
    icon: <Home size={20} color="#10b981" />,
    fields: [
      {
        key: "hhsize",
        label: "Household Size",
        type: "number",
        min: 1,
        max: 20,
        icon: <Users size={16} />,
      },
      {
        key: "Region_Name",
        label: "Region",
        type: "select",
        options: regionOptions,
        icon: <MapPin size={16} />,
      },
      {
        key: "Area_Name",
        label: "Area Type",
        type: "select",
        options: areaOptions,
        icon: <Home size={16} />,
      },
    ],
  },
  {
    title: "Monthly Expenditures",
    icon: <TrendingUp size={20} color="#3b82f6" />,
    fields: [
      {
        key: "exp_food",
        label: "Food Expenditure",
        type: "currency",
        icon: <ShoppingCart size={16} />,
      },
      {
        key: "exp_rent",
        label: "Rent Expenditure",
        type: "currency",
        icon: <Home size={16} />,
      },
      {
        key: "exp_Education",
        label: "Education Expenditure",
        type: "currency",
        icon: <BookOpen size={16} />,
      },
      {
        key: "exp_Water",
        label: "Water Expenditure",
        type: "currency",
        icon: <Droplet size={16} />,
      },
      {
        key: "exp_Electricity",
        label: "Electricity Expenditure",
        type: "currency",
        icon: <Zap size={16} />,
      },
      {
        key: "Savings_or_Insurance_Payment",
        label: "Savings/Insurance Payment",
        type: "currency",
        icon: <PiggyBank size={16} />,
      },
      {
        key: "Communication_Exp",
        label: "Communication Expenses",
        type: "currency",
        icon: <Wifi size={16} />,
      },
    ],
  },
];

const defaultValues: FormData = {
  // Basic Info
  hhsize: 1,
  Region_Name: "Banadir",
  Area_Name: "Urban",

  // Expenditures
  exp_food: 0,
  exp_rent: 0,
  exp_Education: 0,
  exp_Water: 0,
  exp_Electricity: 0,
  Savings_or_Insurance_Payment: 0,
  Communication_Exp: 0,
};

export default function NewPredictionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [form, setForm] = useState<FormData>(defaultValues);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const isEditMode = params.mode === "edit";
  const predictionId = params.predictionId as string;

  useEffect(() => {
    if (isEditMode && params.predictionData) {
      try {
        const predictionData = JSON.parse(params.predictionData as string);
        setForm(predictionData.input_data);
        setResult(predictionData.predicted_exp);
      } catch (error) {
        console.error("Error parsing prediction data:", error);
      }
    }
  }, [isEditMode, params.predictionData]);

  const handleChange = <K extends keyof FormData>(
    key: K,
    value: FormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      console.log("Submitting form data:", form);
      const res = await predictExpenditure(form);
      console.log("Prediction result:", res);
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
                  {React.cloneElement(field.icon as React.ReactElement<any>, {
                    color: "#64748b",
                  })}
                </View>
              )}
              <Text className="text-white">{field.label}</Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-slate-700 justify-center items-center"
                onPress={() =>
                  handleChange(
                    field.key,
                    Math.max(
                      field.min || 0,
                      (form[field.key] as number) - (field.step || 1)
                    )
                  )
                }
              >
                <Text className="text-white text-lg">-</Text>
              </TouchableOpacity>
              <Text className="text-white mx-4 min-w-[30px] text-center">
                {form[field.key]}
              </Text>
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-slate-700 justify-center items-center"
                onPress={() =>
                  handleChange(
                    field.key,
                    Math.min(
                      field.max || 100,
                      (form[field.key] as number) + (field.step || 1)
                    )
                  )
                  }
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
                  {React.cloneElement(field.icon as React.ReactElement<any>, {
                    color: "#64748b",
                  })}
                </View>
              )}
              <Text className="text-white">{field.label}</Text>
            </View>
            <View className="flex-row items-center border-b border-slate-700 pb-2">
              <Text className="text-slate-400 mr-1">$</Text>
              <TextInput
                className="flex-1 text-white text-lg"
                value={form[field.key].toString()}
                onChangeText={(val) =>
                  handleChange(field.key, Number.parseFloat(val) || 0)
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>
        );

      case "select":
        return (
          <View className="bg-slate-800 p-4 rounded-lg">
            <View className="flex-row items-center mb-3">
              {field.icon && (
                <View className="mr-3">
                  {React.cloneElement(field.icon as React.ReactElement<any>, {
                    color: "#64748b",
                  })}
                </View>
              )}
              <Text className="text-white text-sm font-medium">
                {field.label}
              </Text>
            </View>
            <View className="bg-slate-700 rounded-lg overflow-hidden">
              <RNPickerSelect
                placeholder={{
                  label: `Select ${field.label}`,
                  value: null,
                  color: "#a3a3a3",
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
                  color: "#000",
                }))}
                style={{
                  inputIOS: {
                    color: "white",
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    fontSize: 16,
                  },
                  inputAndroid: {
                    color: "white",
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    fontSize: 16,
                    paddingRight: 30,
                  },
                  placeholder: {
                    color: "#a3a3a3",
                  },
                  iconContainer: {
                    top: 7,
                    right: 12,
                  },
                }}
                useNativeAndroidPickerStyle={false}
                Icon={() => (
                  <ChevronDown
                    size={25}
                    color="#64748b"
                    style={{ marginTop: 5 }}
                  />
                )}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
  <SafeAreaView className="flex-1 bg-slate-900">
    {/* Fixed Header */}
    <View className="px-6 py-5 border-b border-slate-800 bg-slate-900 z-10">
      <View className="flex-row items-center">
        <TouchableOpacity
          className="mr-4 p-2 -ml-2"
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-2xl font-bold">
            {result
              ? "Prediction Result"
              : isEditMode
              ? "Edit Prediction"
              : "New Prediction"}
          </Text>
          <Text className="text-slate-400">
            {result
              ? "Your household expenditure prediction"
              : `Step ${currentStep + 1} of ${fieldGroups.length}`}
          </Text>
        </View>
      </View>
    </View>

    {/* Scrollable Content */}
    <KeyboardAwareScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 80, paddingHorizontal: 24 }}
      enableOnAndroid
      extraScrollHeight={80}
      keyboardShouldPersistTaps="handled"
    >
      {result ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 20 }}
          className="flex-1"
        >
          <View className="bg-slate-800 p-6 rounded-2xl border border-emerald-500 mb-8 shadow-md">
          {/* Prediction Result */}
          <View className="items-center mb-6">
            <Text className="text-emerald-400 text-5xl font-extrabold tracking-tight">
              ${result.toFixed(2)}
            </Text>
            <Text className="text-slate-400 mt-2 text-base">
              Predicted Yearly Expenditure
            </Text>
          </View>

          {/* Key Expenditures */}
          <View className="bg-slate-700 rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <TrendingUp size={18} color="#60a5fa" className="mr-2" />
              <Text className="text-white font-semibold text-lg">
                Key Expenditures
              </Text>
            </View>
            <View className="gap-2">
              {[
                { label: "Food", value: form.exp_food },
                { label: "Rent", value: form.exp_rent },
                { label: "Education", value: form.exp_Education },
                { label: "Water", value: form.exp_Water },
                { label: "Electricity", value: form.exp_Electricity },
                { label: "Savings/Insurance", value: form.Savings_or_Insurance_Payment },
                { label: "Communication", value: form.Communication_Exp },
              ].map((item) => (
                <View key={item.label} className="flex-row justify-between">
                  <Text className="text-slate-300">{item.label}</Text>
                  <Text className="text-white font-semibold">${item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Household Profile */}
          <View className="bg-slate-700 rounded-xl p-4 mb-6">
            <View className="flex-row items-center mb-3">
              <Home size={18} color="#10b981" className="mr-2" />
              <Text className="text-white font-semibold text-lg">
                Household Profile
              </Text>
            </View>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-slate-300">Household Size</Text>
                <Text className="text-white font-semibold">{form.hhsize}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-300">Region</Text>
                <Text className="text-white font-semibold">{form.Region_Name}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-300">Area Type</Text>
                <Text className="text-white font-semibold">{form.Area_Name}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-emerald-500 py-3 rounded-xl flex-row justify-center items-center"
              onPress={() => {
                setResult(null);
                setCurrentStep(0);
              }}
            >
              <Text className="text-white font-bold mr-2">New Prediction</Text>
              <Zap size={18} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-blue-500 py-3 rounded-xl flex-row justify-center items-center"
              onPress={() => router.back()}
            >
              <Text className="text-white font-bold">Save & Return</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      ) : (
        <View className="flex-1">
          {/* Progress Steps */}
          <View className="py-4">
            <View className="flex-row justify-between mb-2">
              {fieldGroups.map((_, index) => (
                <View key={index} className="items-center">
                  <View
                    className={`w-8 h-8 rounded-full justify-center items-center ${
                      currentStep === index ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  >
                    {currentStep > index ? (
                      <Check size={16} color="#ffffff" />
                    ) : (
                      <Text
                        className={`${
                          currentStep === index
                            ? "text-white font-bold"
                            : "text-slate-400"
                        }`}
                      >
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
                style={{
                  width: `${((currentStep + 1) / fieldGroups.length) * 100}%`,
                }}
              />
            </View>
          </View>

          {/* Field Form */}
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
                <View key={field.key} className="w-full">{/* Add w-full here */}
                  {renderField(field)}
                </View>
              ))}
            </View>
          </View>

          {/* Navigation Buttons */}
          <View className="py-4 flex-row justify-between border-t border-slate-800">
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
                currentStep === fieldGroups.length - 1
                  ? "bg-emerald-500"
                  : "bg-blue-500"
              }`}
              onPress={handleNext}
              disabled={loading}
            >
              <Text className="text-white font-bold mr-2">
                {loading
                  ? "Processing..."
                  : currentStep === fieldGroups.length - 1
                  ? isEditMode
                    ? "Update Prediction"
                    : "Create Prediction"
                  : "Continue"}
              </Text>
              {!loading &&
                (currentStep === fieldGroups.length - 1 ? (
                  <Zap size={18} color="#ffffff" />
                ) : (
                  <ChevronRight size={18} color="#ffffff" />
                ))}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAwareScrollView>
  </SafeAreaView>
);

}