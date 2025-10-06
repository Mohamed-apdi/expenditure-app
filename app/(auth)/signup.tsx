import { useState, useCallback } from "react";
import { router } from "expo-router";
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StatusBar,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
} from "lucide-react-native";
import { supabase } from "~/lib";
import Toast from "react-native-toast-message";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

export default function SignupScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullname,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        if (data.user.email_confirmed_at) {
          router.replace("/(onboarding)/post-signup-setup");
        } else {
            Toast.show({
              type: "success",
            text1: "Account created!",
            text2: "Please check your email to confirm your account.",
          });
          router.push("/(auth)/login");
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      Toast.show({
        type: "error",
        text1: "Signup failed",
        text2: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = useCallback(async () => {
    try {
      if (
        !formData.fullname ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        Toast.show({
          type: "error",
          text1: "Please fill in all fields",
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

      if (formData.password.length < 6) {
        Toast.show({
          type: "error",
          text1: "Password must be at least 6 characters",
        });
        return;
      }

      await handleSignup();
    } catch (error) {
      console.error("Signup error:", error);
      Toast.show({
        type: "error",
        text1: "Signup failed",
        text2: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }, [formData]);

  return (
    <>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1 px-8 py-8"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* Header */}
            <View className="items-center mb-12">
              <View
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: theme.primary,
                  borderRadius: 40,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <UserPlus size={32} color={theme.primaryText} />
              </View>

              <Text
                style={{
                  color: theme.text,
                  fontSize: 28,
                  fontWeight: "bold",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Create Account
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 16,
                  textAlign: "center",
                  lineHeight: 24,
                }}
              >
                Join us and start managing your finances
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4 mb-8">
              {/* Full Name */}
              <View>
                <Text style={{ color: theme.text, marginBottom: 8, fontSize: 16, fontWeight: "500" }}>
                  Full Name
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                  }}
                >
                  <UserPlus size={20} color={theme.textMuted} />
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      color: theme.text,
                      fontSize: 16,
                    }}
                    placeholder="Enter your full name"
                    placeholderTextColor={theme.textMuted}
                    value={formData.fullname}
                    onChangeText={(value) => updateFormData("fullname", value)}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email */}
              <View>
                <Text style={{ color: theme.text, marginBottom: 8, fontSize: 16, fontWeight: "500" }}>
                  Email Address
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                  }}
                >
                  <Mail size={20} color={theme.textMuted} />
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      color: theme.text,
                      fontSize: 16,
                    }}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.textMuted}
                    value={formData.email}
                    onChangeText={(value) => updateFormData("email", value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password */}
              <View>
                <Text style={{ color: theme.text, marginBottom: 8, fontSize: 16, fontWeight: "500" }}>
                  Password
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                  }}
                >
                  <Lock size={20} color={theme.textMuted} />
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      color: theme.text,
                      fontSize: 16,
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.textMuted}
                    value={formData.password}
                    onChangeText={(value) => updateFormData("password", value)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={toggleShowPassword} hitSlop={10}>
                    {showPassword ? (
                      <EyeOff size={20} color={theme.textMuted} />
                    ) : (
                      <Eye size={20} color={theme.textMuted} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View>
                <Text style={{ color: theme.text, marginBottom: 8, fontSize: 16, fontWeight: "500" }}>
                  Confirm Password
                </Text>
              <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                  }}
                >
                  <Lock size={20} color={theme.textMuted} />
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      color: theme.text,
                      fontSize: 16,
                    }}
                    placeholder="Confirm your password"
                    placeholderTextColor={theme.textMuted}
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateFormData("confirmPassword", value)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={toggleShowConfirmPassword} hitSlop={10}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={theme.textMuted} />
                    ) : (
                      <Eye size={20} color={theme.textMuted} />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
                style={{
                backgroundColor: theme.primary,
                paddingVertical: 16,
                borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                marginBottom: 24,
                }}
                onPress={handleCreate}
                disabled={loading}
              >
                <Text
                  style={{
                    color: theme.primaryText,
                  fontSize: 16,
                  fontWeight: "600",
                    marginRight: 8,
                  }}
                >
                {loading ? "Creating Account..." : "Create Account"}
                </Text>
              <ArrowRight size={18} color={theme.primaryText} />
            </TouchableOpacity>

            {/* Footer */}
            <View className="items-center">
              <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                Already have an account?{" "}
                <Text
                  style={{ color: theme.primary, fontWeight: "600" }}
                  onPress={() => router.push("/login")}
                >
                  Sign In
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
