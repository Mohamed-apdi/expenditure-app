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
  Image,
  ActivityIndicator,
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
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { setItemAsync } from "expo-secure-store";
import { createAccount, fetchAccounts } from "~/lib/services/accounts";

// Required for Expo OAuth
WebBrowser.maybeCompleteAuthSession();

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
  const [socialLoading, setSocialLoading] = useState<
    'google' | null
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

  const handleSocialLogin = async (provider: 'google') => {
    setSocialLoading(provider);

    try {
      const redirectUrl = AuthSession.makeRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // For iOS/Android - open the browser for OAuth flow
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );

        if (result.type === 'success') {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

            if (sessionError) throw sessionError;

            if (sessionData.session && sessionData.user?.id) {
              await setItemAsync('token', sessionData.session.access_token);
              await setItemAsync('userId', sessionData.user.id);
              await setItemAsync('supabase_session', JSON.stringify(sessionData.session));

              // Create "Account 1" for new social login users
              try {
                const existingAccounts = await fetchAccounts(sessionData.user.id);
                if (existingAccounts.length === 0) {
                  await createAccount({
                    user_id: sessionData.user.id,
                    account_type: 'Accounts',
                    name: 'Account 1',
                    amount: 0,
                    description: 'Default account',
                    is_default: true,
                    currency: 'USD',
                  });
                }
              } catch (accountError) {
                console.error('Error creating default account:', accountError);
                // Don't block signup if account creation fails
              }

              Toast.show({
                type: 'success',
                position: 'top',
                text1: 'Account created!',
                text2: 'Successfully signed up',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 50,
              });

              // Redirect to onboarding for new users
              router.replace('/(onboarding)/post-signup-setup');
            }
          } else {
            // Try to get tokens from query params if not in hash
            const queryParams = new URLSearchParams(url.search);
            const queryAccessToken = queryParams.get('access_token');
            const queryRefreshToken = queryParams.get('refresh_token');

            if (queryAccessToken && queryRefreshToken) {
              const { data: sessionData, error: sessionError } =
                await supabase.auth.setSession({
                  access_token: queryAccessToken,
                  refresh_token: queryRefreshToken,
                });

              if (sessionError) throw sessionError;

              if (sessionData.session && sessionData.user?.id) {
                await setItemAsync('token', sessionData.session.access_token);
                await setItemAsync('userId', sessionData.user.id);
                await setItemAsync('supabase_session', JSON.stringify(sessionData.session));

                // Create "Account 1" for new social login users
                try {
                  const existingAccounts = await fetchAccounts(sessionData.user.id);
                  if (existingAccounts.length === 0) {
                    await createAccount({
                      user_id: sessionData.user.id,
                      account_type: 'Accounts',
                      name: 'Account 1',
                      amount: 0,
                      description: 'Default account',
                      is_default: true,
                      currency: 'USD',
                    });
                  }
                } catch (accountError) {
                  console.error('Error creating default account:', accountError);
                  // Don't block signup if account creation fails
                }

                Toast.show({
                  type: 'success',
                  position: 'top',
                  text1: 'Account created!',
                  text2: 'Successfully signed up',
                  visibilityTime: 3000,
                  autoHide: true,
                  topOffset: 50,
                });

                // Redirect to onboarding for new users
                router.replace('/(onboarding)/post-signup-setup');
              }
            }
          }
        } else if (result.type === 'cancel') {
          Toast.show({
            type: 'info',
            position: 'top',
            text1: 'Sign up cancelled',
            text2: 'You cancelled the sign up process',
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
          });
        }
      }
    } catch (error: any) {
      console.error('Social signup error:', error);
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Sign up failed',
        text2: error?.message || 'An error occurred during sign up',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 50,
      });
    } finally {
      setSocialLoading(null);
    }
  };

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

            {/* Divider */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 24,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              <Text
                style={{
                  marginHorizontal: 16,
                  color: theme.textMuted,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {t.or}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            </View>

            {/* Google Button */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.cardBackground,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}
              onPress={() => handleSocialLogin("google")}
              disabled={socialLoading !== null || loading}
            >
              {socialLoading === "google" ? (
                <View style={{ width: 24, height: 24, marginRight: 12, justifyContent: "center", alignItems: "center" }}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : (
                <Image
                  source={require("../../assets/images/google_icon.png")}
                  style={{ width: 24, height: 24, marginRight: 12 }}
                  resizeMode="contain"
                />
              )}
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "600",
                  flex: 1,
                  fontSize: 16,
                }}
              >
                {t.continueWithGoogle}
              </Text>
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
