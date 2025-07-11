import { useState, useCallback, memo } from "react";
import axios from "axios";
import { API_URL } from "~/lib/api";
import { router } from "expo-router";
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  TouchableOpacity,
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
  Github,
} from "lucide-react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { supabase } from "~/lib/supabase";
import { setItemAsync } from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import Toast from "react-native-toast-message";

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
const SignUp = memo(
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

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<
    "google" | "github" | null
  >(null);

  const updateFormData = useCallback((key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const handleSignup = async () => {
    setLoading(true);

    // Validate inputs
    if (formData.password !== formData.confirmPassword) {
      Toast.show({ type: "error", text1: "Passwords do not match" });
      setLoading(false);
      return;
    }

    try {
      // 1. Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullname,
          },
        },
      });
      if (error) throw error;

      router.push("/(auth)/login");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Signup failed",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = useCallback(async () => {
    if (
      !formData.fullname ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      Toast.show({
        type: "error",
        text1: "Please fill in all required fields",
      });
      return;
    }

    if (/^\d+$/.test(formData.fullname)) {
      Toast.show({
        type: "error",
        text1: "Full name cannot contain only numbers",
      });
      return;
    }

    // Check in auth.users table
    const { data: existingAuthUser } = await supabase
      .from("auth.users")
      .select("id")
      .eq("raw_user_meta_data->>full_name", formData.fullname)
      .maybeSingle();

    if (existingProfileName || existingAuthUser) {
      Toast.show({
        type: "error",
        text1: "Full name already taken",
      });
      return;
    }

    const { data: existingName, error: nameError } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", formData.fullname)
      .maybeSingle();

    if (existingName) {
      Toast.show({
        type: "error",
        text1: "Full name already taken",
      });
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    if (!isValidEmail) {
      Toast.show({
        type: "error",
        text1: "Invalid email format",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Passwords do not match",
      });
      return;
    }

    if (
      formData.password.length < 8 ||
      !/[A-Z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password)
    ) {
      Toast.show({
        type: "error",
        text1:
          "Password must be at least 8 characters, contain an uppercase letter, and a number",
      });
      return;
    }

    handleSignup();
  }, [formData]);

  const handleSocialSignup = async (provider: "google" | "github") => {
    setSocialLoading(provider);

    try {
      const redirectUrl = AuthSession.makeRedirectUri({ useProxy: true });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl },
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
          {/* Progress Info */}
          <View className="mb-6">
            <View className="h-1 bg-slate-700 rounded-full mb-2">
              <View
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `100%` }}
              />
            </View>
            <Text className="text-slate-400 text-center text-xs">
              Account Creation
            </Text>
          </View>

          {/* Header Icon */}
          <View className="items-center mb-6">
            <View className="bg-emerald-500/20 p-4 rounded-full">
              <UserPlus size={32} color="#10b981" />
            </View>
          </View>

          {/* Step 1 */}
          <SignUp
            formData={formData}
            updateFormData={updateFormData}
            showPassword={showPassword}
            toggleShowPassword={toggleShowPassword}
            showConfirmPassword={showConfirmPassword}
            toggleShowConfirmPassword={toggleShowConfirmPassword}
            handleSocialSignup={handleSocialSignup}
          />

          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-6 mt-4">
            <Button
              className="flex-1 flex-row items-center justify-center bg-emerald-500 rounded-xl p-4"
              onPress={handleCreate}
              disabled={loading}
            >
              <Text className="text-white font-bold mr-2">
                {loading ? "Creating Account..." : "Sign Up"}
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
