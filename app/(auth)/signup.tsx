import { useState } from "react";
import { router } from "expo-router";
import {
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Home,
  MapPin,
  Shield,
  Check,
  X,
  Plus,
  Minus,
} from "lucide-react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { supabase } from "~/lib/supabase";
import { setItemAsync } from "expo-secure-store";

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    hhsize: 4,
    region_n: 2,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateFormData = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else {
      handleSignup();
    }
  };

  const handleSignup = async () => {
  setLoading(true);
  const { email, password } = formData;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  setLoading(false);

  if (error) {
    alert(error.message);
    return;
  }
  

  // Optional: store user info if needed
  // await setItemAsync("user", JSON.stringify(data));
  await setItemAsync("token", data.session?.access_token || ""); // Save token for API

  router.push("/login"); // redirect to login or dashboard
};


  const regions = [
    { id: 1, name: "Rural", value: 1 },
    { id: 2, name: "Urban", value: 2 },
  ];

  // Reusable Password Input Component
  const PasswordInput = ({
    label,
    value,
    onChangeText,
    showPassword,
    toggleShowPassword,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    showPassword: boolean;
    toggleShowPassword: () => void;
  }) => (
    <View className="mb-4">
      <Text className="text-slate-200 mb-1">{label}</Text>
      <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-4">
        <Lock size={20} color="#64748b" />
        <TextInput
          className="flex-1 py-3 px-2 text-white"
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#64748b"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <Pressable onPress={toggleShowPassword}>
          {showPassword ? (
            <EyeOff size={20} color="#64748b" />
          ) : (
            <Eye size={20} color="#64748b" />
          )}
        </Pressable>
      </View>
    </View>
  );

  // Step 1: Email & Password
  const renderStep1 = () => (
    <View className="mb-10">
      <View className="items-center mb-6">
        <Text className="text-white text-2xl font-bold mb-2">Create Account</Text>
        <Text className="text-slate-400 text-center">
          Enter your email and create a secure password
        </Text>
      </View>

      {/* Email */}
      <View className="mb-4">
        <Text className="text-slate-200 mb-1">Email Address</Text>
        <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-4">
          <Mail size={20} color="#64748b" />
          <TextInput
            className="flex-1 py-3 px-2 text-white"
            placeholder="Enter your email"
            placeholderTextColor="#64748b"
            value={formData.email}
            onChangeText={(value) => updateFormData("email", value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Password */}
      <PasswordInput
        label="Password"
        value={formData.password}
        onChangeText={(value) => updateFormData("password", value)}
        showPassword={showPassword}
        toggleShowPassword={() => setShowPassword(!showPassword)}
      />

      {/* Confirm Password */}
      <PasswordInput
        label="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(value) => updateFormData("confirmPassword", value)}
        showPassword={showConfirmPassword}
        toggleShowPassword={() => setShowConfirmPassword(!showConfirmPassword)}
      />

      {/* Password Requirements */}
      <View className="bg-slate-800 border border-slate-700 rounded-lg p-4 mt-4">
        <Text className="text-slate-400 mb-2">Password must contain:</Text>
        <View className="flex-row items-center mb-1">
          <Check
            size={14}
            color={formData.password.length >= 8 ? "#10b981" : "#ef4444"}
          />
          <Text className="text-slate-300 ml-2">At least 8 characters</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <Check
            size={14}
            color={/[A-Z]/.test(formData.password) ? "#10b981" : "#ef4444"}
          />
          <Text className="text-slate-300 ml-2">One uppercase letter</Text>
        </View>
        <View className="flex-row items-center">
          <Check
            size={14}
            color={/[0-9]/.test(formData.password) ? "#10b981" : "#ef4444"}
          />
          <Text className="text-slate-300 ml-2">One number</Text>
        </View>
      </View>
    </View>
  );

  // Step 2: Household Info
  const renderStep2 = () => (
    <View className="mb-10">
      <View className="items-center mb-6">
        <Text className="text-white text-2xl font-bold mb-2">Household Profile</Text>
        <Text className="text-slate-400 text-center">
          Tell us about your household to improve predictions
        </Text>
      </View>

      {/* Household Size */}
      <View className="mb-6">
        <Text className="text-slate-200 mb-1">Household Size</Text>
        <Text className="text-slate-400 mb-3">
          Number of people living in your household
        </Text>
        <View className="flex-row items-center justify-center gap-5">
          <Pressable
            className="w-12 h-12 bg-slate-700 rounded-full items-center justify-center"
            onPress={() =>
              updateFormData("hhsize", Math.max(1, formData.hhsize - 1))
            }
          >
            <Minus size={20} color="#f8fafc" />
          </Pressable>
          <View className="items-center min-w-20">
            <Text className="text-white text-3xl font-bold">{formData.hhsize}</Text>
            <Text className="text-slate-400 text-xs">people</Text>
          </View>
          <Pressable
            className="w-12 h-12 bg-slate-700 rounded-full items-center justify-center"
            onPress={() =>
              updateFormData("hhsize", Math.min(20, formData.hhsize + 1))
            }
          >
            <Plus size={20} color="#f8fafc" />
          </Pressable>
        </View>
      </View>

      {/* Region Selection */}
      <View className="mb-6">
        <Text className="text-slate-200 mb-1">Region Type</Text>
        <Text className="text-slate-400 mb-3">
          Select your area type for better predictions
        </Text>
        <View className="gap-3">
          {regions.map((region) => (
            <Pressable
              key={region.id}
              className={`p-5 border rounded-xl items-center ${
                formData.region_n === region.value
                  ? "bg-emerald-500 border-emerald-500"
                  : "bg-slate-800 border-slate-700"
              }`}
              onPress={() => updateFormData("region_n", region.value)}
            >
              {region.value === 1 ? (
                <Home
                  size={24}
                  color={
                    formData.region_n === region.value ? "#ffffff" : "#94a3b8"
                  }
                />
              ) : (
                <MapPin
                  size={24}
                  color={
                    formData.region_n === region.value ? "#ffffff" : "#94a3b8"
                  }
                />
              )}
              <Text
                className={`mt-2 text-lg font-bold ${
                  formData.region_n === region.value
                    ? "text-white"
                    : "text-slate-400"
                }`}
              >
                {region.name}
              </Text>
              <Text
                className={`text-xs ${
                  formData.region_n === region.value
                    ? "text-slate-100"
                    : "text-slate-500"
                }`}
              >
                {region.value === 1 ? "Countryside, farms" : "Cities, towns"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Privacy Notice */}
      <View className="bg-slate-800 border border-emerald-500 rounded-lg p-4 flex-row">
        <Shield size={20} color="#10b981" />
        <Text className="text-slate-200 ml-3 flex-1 text-sm">
          Your data is encrypted and stored securely. We never share personal
          information.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
        className="flex-1 px-6 py-4"
        // keyboardShouldPersistTaps="always" // 👈 this is key
        >
          {/* Progress Bar */}
          <View className="mb-6">
            <View className="h-1 bg-slate-700 rounded-full mb-2">
              <View
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </View>
            <Text className="text-slate-400 text-center text-xs">
              Step {step} of 2
            </Text>
          </View>

          {/* Header Icon */}
          <View className="items-center mb-6">
            <View className="bg-emerald-500/20 p-4 rounded-full">
              <UserPlus size={32} color="#10b981" />
            </View>
          </View>

          {/* Step Content */}
          {step === 1 ? renderStep1() : renderStep2()}

          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-6">
            {step === 2 && (
              <Pressable
                className="flex-1 flex-row items-center justify-center py-4 bg-slate-800 border border-slate-700 rounded-xl"
                onPress={() => setStep(1)}
              >
                <ArrowLeft size={20} color="#94a3b8" />
                <Text className="text-slate-400 ml-2 font-medium">Back</Text>
              </Pressable>
            )}
            <Button
              className={`flex-[2] ${step === 1 ? "" : "flex-[2]"}`}
              onPress={handleNextStep}
              disabled={loading}
            >
              <Text className="text-white font-bold mr-2">
                {loading
                  ? "Creating Account..."
                  : step === 1
                  ? "Continue"
                  : "Create Account"}
              </Text>
              <ArrowRight size={20} color="#ffffff" />
            </Button>
          </View>

          {/* Footer */}
          <View className="items-center mb-4">
            <Text className="text-slate-400">
              Already have an account?{" "}
              <Pressable onPress={() => router.push("/login")}>
                <Text className="text-emerald-400 font-bold">Sign In</Text>
              </Pressable>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}