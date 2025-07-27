"use client";

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
  Beef,
  PiggyBank,
  Activity,
  BarChart2,
  ChevronDown,
  ArrowLeft,
} from "lucide-react-native";
import { predictExpenditure } from "~/lib/api";
import React from "react";
import RNPickerSelect from "react-native-picker-select";

type FormData = {
  // Basic Info
  Number_of_Members: number;
  Region: string;
  Residence_Type: string;

  // Expenditures
  Food_Expenditure: number;
  NonFood_Expenditure: number;
  Housing_Expenditure: number;
  Utilities_Expenditure: number;
  Transport_Expenditure: number;

  // Additional Economic Indicators
  Spent_on_Food_Drink_Outside: number;
  General_NonFood_Expenditure: number;
  Livestock_Byproducts_Value: number;
  Business_Revenue: number;
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

const residenceTypeOptions = [
  { label: "Urban", value: "Urban" },
  { label: "Rural", value: "Rural" },
  { label: "Nomadic", value: "Nomadic" },
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
        key: "Number_of_Members",
        label: "Number of Household Members",
        type: "number",
        min: 1,
        max: 20,
        icon: <Users size={16} />,
      },
      {
        key: "Region",
        label: "Region",
        type: "select",
        options: regionOptions,
        icon: <MapPin size={16} />,
      },
      {
        key: "Residence_Type",
        label: "Residence Type",
        type: "select",
        options: residenceTypeOptions,
        icon: <Home size={16} />,
      },
    ],
  },
  {
    title: "Monthly Expenditures",
    icon: <TrendingUp size={20} color="#3b82f6" />,
    fields: [
      {
        key: "Food_Expenditure",
        label: "Food Expenditure",
        type: "currency",
        icon: <ShoppingCart size={16} />,
      },
      {
        key: "NonFood_Expenditure",
        label: "Non-Food Expenditure",
        type: "currency",
        icon: <Package size={16} />,
      },
      {
        key: "Housing_Expenditure",
        label: "Housing Expenditure",
        type: "currency",
        icon: <Home size={16} />,
      },
      {
        key: "Utilities_Expenditure",
        label: "Utilities Expenditure",
        type: "currency",
        icon: <Droplet size={16} />,
      },
      {
        key: "Transport_Expenditure",
        label: "Transport Expenditure",
        type: "currency",
        icon: <Activity size={16} />,
      },
    ],
  },
  {
    title: "Additional Economic Data",
    icon: <BarChart2 size={20} color="#f59e0b" />,
    fields: [
      {
        key: "Spent_on_Food_Drink_Outside",
        label: "Spent on Food/Drink Outside",
        type: "currency",
        icon: <ShoppingCart size={16} />,
      },
      {
        key: "General_NonFood_Expenditure",
        label: "General Non-Food Expenditure",
        type: "currency",
        icon: <Package size={16} />,
      },
      {
        key: "Livestock_Byproducts_Value",
        label: "Livestock Byproducts Value",
        type: "currency",
        icon: <Beef size={16} />,
      },
      {
        key: "Business_Revenue",
        label: "Business Revenue",
        type: "currency",
        icon: <PiggyBank size={16} />,
      },
    ],
  },
];

const defaultValues: FormData = {
  // Basic Info
  Number_of_Members: 1,
  Region: "Banadir",
  Residence_Type: "Urban",

  // Expenditures
  Food_Expenditure: 0,
  NonFood_Expenditure: 0,
  Housing_Expenditure: 0,
  Utilities_Expenditure: 0,
  Transport_Expenditure: 0,

  // Additional Economic Indicators
  Spent_on_Food_Drink_Outside: 0,
  General_NonFood_Expenditure: 0,
  Livestock_Byproducts_Value: 0,
  Business_Revenue: 0,
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
      {/* Header */}
      <View className="px-6 py-5 border-b border-slate-800">
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

      {result ? (
        /* Result View */
        <ScrollView className="flex-1 px-6 py-6">
          <View className="bg-slate-800 p-6 rounded-xl border border-emerald-500 mb-6">
            <View className="items-center mb-4">
              <Text className="text-emerald-500 text-4xl font-bold">
                ${result.toFixed(2)}
              </Text>
              <Text className="text-slate-400 mt-2">
                Predicted Monthly Expenditure
              </Text>
            </View>

            <View className="bg-slate-700 p-4 rounded-lg mb-4">
              <Text className="text-white font-semibold mb-2">
                Key Expenditures
              </Text>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Food</Text>
                  <Text className="text-slate-400 font-bold">
                    ${form.Food_Expenditure}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Non-Food</Text>
                  <Text className="text-slate-400 font-bold">
                    ${form.NonFood_Expenditure}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Housing</Text>
                  <Text className="text-slate-400 font-bold">
                    ${form.Housing_Expenditure}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Utilities</Text>
                  <Text className="text-slate-400 font-bold">
                    ${form.Utilities_Expenditure}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Transport</Text>
                  <Text className="text-slate-400 font-bold">
                    ${form.Transport_Expenditure}
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-slate-700 p-4 rounded-lg mb-4">
              <Text className="text-white font-semibold mb-2">
                Household Profile
              </Text>
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Household Members</Text>
                  <Text className="text-slate-400 font-bold">
                    {form.Number_of_Members}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Region</Text>
                  <Text className="text-slate-400 font-bold">
                    {form.Region}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-300">Residence Type</Text>
                  <Text className="text-slate-400 font-bold">
                    {form.Residence_Type}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-emerald-500 py-3 rounded-lg flex-row justify-center items-center"
                onPress={() => {
                  setResult(null);
                  setCurrentStep(0);
                }}
              >
                <Text className="text-white font-bold mr-2">
                  New Prediction
                </Text>
                <Zap size={18} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-blue-500 py-3 rounded-lg flex-row justify-center items-center"
                onPress={() => router.back()}
              >
                <Text className="text-white font-bold">Save & Return</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* Form View */
        <View className="flex-1">
          {/* Progress Steps */}
          <View className="px-6 py-4">
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
                        className={`${currentStep === index ? "text-white font-bold" : "text-slate-400"}`}
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

          {/* Form Fields */}
          <ScrollView
            className="px-6 mb-4"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
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
                  <View key={field.key}>{renderField(field)}</View>
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
    </SafeAreaView>
  );
}
