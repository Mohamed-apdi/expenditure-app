import { useState, useCallback, memo } from "react";
import { router } from "expo-router";
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
  Check,
  Plus,
  Minus,
  Smartphone,
  Github,
  MapPin,
  Home,
  Shield,
  ArrowLeft,
} from "lucide-react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { supabase } from "~/lib/supabase";
import { setItemAsync } from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { ResponseType } from "expo-auth-session";
import * as AuthSession from "expo-auth-session";

// Configure Google Auth
WebBrowser.maybeCompleteAuthSession();

// Memoized Password Input Component
const PasswordInput = memo(
  ({
    label,
    value,
    onChangeText,
    showPassword,
    toggleShowPassword,
    onSubmitEditing,
    returnKeyType = "done",
    inputRef,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    showPassword: boolean;
    toggleShowPassword: () => void;
    onSubmitEditing?: () => void;
    returnKeyType?: "done" | "next" | "go" | "search" | "send";
    inputRef?: React.RefObject<TextInput>;
  }) => (
    <View className="mb-4">
      <Text className="text-slate-200 mb-1">{label}</Text>
      <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-4">
        <Lock size={20} color="#64748b" />
        <TextInput
          ref={inputRef}
          className="flex-1 py-3 px-2 text-white"
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#64748b"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          key={`${label}-input`}
        />
        <Pressable onPress={toggleShowPassword} hitSlop={10}>
          {showPassword ? (
            <EyeOff size={20} color="#64748b" />
          ) : (
            <Eye size={20} color="#64748b" />
          )}
        </Pressable>
      </View>
    </View>
  )
);

// Memoized Step Components
const Step1 = memo(
  ({
    formData,
    updateFormData,
    showPassword,
    toggleShowPassword,
    showConfirmPassword,
    toggleShowConfirmPassword,
    handleSocialSignup,
  }: {
    formData: any;
    updateFormData: (key: string, value: any) => void;
    showPassword: boolean;
    toggleShowPassword: () => void;
    showConfirmPassword: boolean;
    toggleShowConfirmPassword: () => void;
    handleSocialSignup: (provider: "google" | "github") => void;
  }) => (
    <View className="mb-15">
      <View className="items-center mb-6">
        <Text className="text-white text-2xl font-bold mb-2">
          Create Account
        </Text>
        <Text className="text-slate-400 text-center">
          Enter your email and create a secure password
        </Text>
      </View>
      {/* Full Name */}
      <View className="mb-4">
        <Text className="text-slate-200 mb-1">Full Name</Text>
        <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-4">
          <UserPlus size={20} color="#64748b" />
          <TextInput
            className="flex-1 py-3 px-2 text-white"
            placeholder="Enter your full name"
            placeholderTextColor="#64748b"
            value={formData.fullname}
            onChangeText={(value) => updateFormData("fullname", value)}
            autoCapitalize="words"
            key="fullname-input"
          />
        </View>
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
            key="email-input"
          />
        </View>
      </View>

      {/* Password */}
      <PasswordInput
        label="Password"
        value={formData.password}
        onChangeText={(value) => updateFormData("password", value)}
        showPassword={showPassword}
        toggleShowPassword={toggleShowPassword}
      />

      {/* Confirm Password */}
      <PasswordInput
        label="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(value) => updateFormData("confirmPassword", value)}
        showPassword={showConfirmPassword}
        toggleShowPassword={toggleShowConfirmPassword}
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
      {/* Divider */}
      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-slate-700" />
        <Text className="mx-4 text-slate-500 text-sm font-semibold">OR</Text>
        <View className="flex-1 h-px bg-slate-700" />
      </View>
      {/* Social Buttons */}
      <TouchableOpacity
        onPress={() => handleSocialSignup("google")}
        className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl p-4 mb-3"
      >
        <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-4">
          <Text className="text-white font-bold">G</Text>
        </View>
        <Text className="text-white font-medium">Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleSocialSignup("github")}
        className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl p-4"
      >
        <View className="w-8 h-8 rounded-full bg-black items-center justify-center mr-4">
          <Github size={16} color="#ffffff" />
        </View>
        <Text className="text-white font-medium">Continue with Git Hub</Text>
      </TouchableOpacity>
    </View>
  )
);

const Step2 = memo(
  ({
    formData,
    updateFormData,
  }: {
    formData: any;
    updateFormData: (key: string, value: any) => void;
  }) => {
    const regions = [
      { id: 1, name: "Rural", value: 1 },
      { id: 2, name: "Urban", value: 2 },
    ];

    return (
      <View className="mb-10">
        <View className="items-center mb-6">
          <Text className="text-white text-2xl font-bold mb-2">
            Household Profile
          </Text>
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
              <Text className="text-white text-3xl font-bold">
                {formData.hhsize}
              </Text>
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
  }
);

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
    hhsize: 4,
    region_n: 2,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<
    "google" | "github" | null
  >(null);

  // Optimized update function
  const updateFormData = useCallback((key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Optimized toggle functions
  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const handleNextStep = useCallback(() => {
    if (step === 1) {
      // Validate step 1 fields
      if (
        !formData.fullname ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        alert("Please fill in all required fields");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert("Passwords don't match");
        return;
      }

      if (
        formData.password.length < 8 ||
        !/[A-Z]/.test(formData.password) ||
        !/[0-9]/.test(formData.password)
      ) {
        alert(
          "Password must be at least 8 characters, contain an uppercase letter, and a number"
        );
        return;
      }

      setStep(2);
    } else {
      handleSignup();
    }
  }, [step, formData]);

  const handleSignup = async () => {
    setLoading(true);
    const { email, password, fullname, hhsize, region_n } = formData;

    // Create user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    if (data?.user) {
      // Store user metadata in Supabase
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullname,
        hhsize: hhsize,
        region_n: region_n,
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("Error saving profile data:", profileError);
      }
    }

    await setItemAsync("token", data.session?.access_token || "");
    setLoading(false);
    router.push("/login");
  };

  // Google Sign-In
  const handleSocialSignup = async (provider: "google" | "github") => {
    setSocialLoading(provider);

    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        useProxy: true, // required for Expo Go
      } as any);

      console.log("Redirect URI:", redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === "success") {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({ access_token, refresh_token });

            if (sessionError) throw sessionError;

            if (sessionData.session?.access_token) {
              await setItemAsync("token", sessionData.session.access_token);
              router.push("../(main)/Dashboard" as any);
            }
          }
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("Social signup failed.");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 py-4"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
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
          {step === 1 ? (
            <Step1
              formData={formData}
              updateFormData={updateFormData}
              showPassword={showPassword}
              toggleShowPassword={toggleShowPassword}
              showConfirmPassword={showConfirmPassword}
              toggleShowConfirmPassword={toggleShowConfirmPassword}
              handleSocialSignup={handleSocialSignup}
            />
          ) : (
            <Step2 formData={formData} updateFormData={updateFormData} />
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-6 mt-4">
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
              className={`flex-[2] ${step === 1 ? "" : "flex-[2]"} flex-row items-center justify-center bg-emerald-500 rounded-xl p-4 `}
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
          <View className="mt-6 items-center mb-10">
            <Text className="text-slate-400">
              Already have an account?{" "}
              <Text
                className="text-emerald-400 font-bold"
                onPress={() => router.push("/login")}
              >
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
