import { useState, useRef } from "react";
import { router } from "expo-router";
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard
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
} from "lucide-react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { supabase } from "~/lib/supabase";
import { setItemAsync } from "expo-secure-store";
import AntDesign from '@expo/vector-icons/AntDesign';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';


export default function SignupScreen() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const updateFormData = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
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
    
    await setItemAsync("token", data.session?.access_token || "");
    router.push("/login");
  };

  const handleSocialSignup = async (provider: 'google' | 'github') => {
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
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

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


  const PasswordInput = ({
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
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
          keyboardType="default"
          importantForAutofill="yes"
          underlineColorAndroid="transparent"
        />
        <Pressable 
          onPress={toggleShowPassword}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {showPassword ? (
            <EyeOff size={20} color="#64748b" />
          ) : (
            <Eye size={20} color="#64748b" />
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <ScrollView 
            className="flex-1 px-6 py-4"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* Header */}
            <View className="items-center mb-6">
              <View className="bg-emerald-500/20 p-4 rounded-full">
                <UserPlus size={32} color="#10b981" />
              </View>
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
                  ref={emailRef}
                  className="flex-1 py-3 px-2 text-white"
                  placeholder="Enter your email"
                  placeholderTextColor="#64748b"
                  value={formData.email}
                  onChangeText={(value) => updateFormData("email", value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
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
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />

            {/* Confirm Password */}
            <PasswordInput
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData("confirmPassword", value)}
              showPassword={showConfirmPassword}
              toggleShowPassword={() => setShowConfirmPassword(!showConfirmPassword)}
              returnKeyType="done"
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

{/* Google Sign Up */}
<Pressable
  className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl p-4 mb-2"
  onPress={() => handleSocialSignup('google')}
  disabled={socialLoading !== null || loading}
>
  {socialLoading === 'google' ? (
    <View className="w-8 h-8 justify-center items-center mr-4">
      <AntDesign name="loading1" size={24} color="#ffffff" />
    </View>
  ) : (
    <View className="w-8 h-8 bg-white rounded-full justify-center items-center mr-4">
      <AntDesign name="google" size={24} color="black" />
    </View>
  )}
  <Text className="text-white font-medium flex-1">Sign Up with Google</Text>
</Pressable>

{/* GitHub Sign Up */}
<Pressable
  className="flex-row items-center bg-slate-800 border border-slate-700 rounded-xl p-4"
  onPress={() => handleSocialSignup('github')}
  disabled={socialLoading !== null || loading}
>
  {socialLoading === 'github' ? (
    <View className="w-8 h-8 justify-center items-center mr-4">
      <AntDesign name="loading1" size={24} color="#ffffff" />
    </View>
  ) : (
    <View className="w-8 h-8 bg-white rounded-full justify-center items-center mr-4">
      <AntDesign name="github" size={24} color="black" />
    </View>
  )}
  <Text className="text-white font-medium flex-1">Sign Up with GitHub</Text>
</Pressable>


            {/* Sign Up Button */}
            <Button
              className="w-full mt-6 mb-4"
              onPress={handleSignup}
              disabled={loading}
            >
              <Text className="text-white font-bold mr-2">
                {loading ? "Creating Account..." : "Create Account"}
              </Text>
              <ArrowRight size={20} color="#ffffff" />
            </Button>

            {/* Login Link */}
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
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}