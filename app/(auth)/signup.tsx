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
import { supabase } from "~/lib";
import { setItemAsync } from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import Toast from "react-native-toast-message";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { StatusBar } from "expo-status-bar";

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
    placeholderText,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    showPassword: boolean;
    toggleShowPassword: () => void;
    onSubmitEditing?: () => void;
    returnKeyType?: "done" | "next" | "go" | "search" | "send";
    inputRef?: React.RefObject<TextInput>;
    placeholderText: string;
  }) => {
    const theme = useTheme();
    return (
      <View className="mb-4">
        <Text style={{ color: theme.text, marginBottom: 4 }}>{label}</Text>
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
            ref={inputRef}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 8,
              color: theme.text,
            }}
            placeholder={placeholderText}
            placeholderTextColor={theme.textMuted}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            key={`${label}-input`}
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
    );
  }
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
    t,
  }: {
    formData: any;
    updateFormData: (key: string, value: any) => void;
    showPassword: boolean;
    toggleShowPassword: () => void;
    showConfirmPassword: boolean;
    toggleShowConfirmPassword: () => void;
    handleSocialSignup: (provider: "google" | "github") => void;
    t: any;
  }) => {
    const theme = useTheme();
    return (
      <View className="mb-15">
        <View className="items-center mb-6">
          <Text
            style={{
              color: theme.text,
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 8,
            }}
          >
            {t.createAccount}
          </Text>
          <Text style={{ color: theme.textSecondary, textAlign: "center" }}>
            {t.signupDescription}
          </Text>
        </View>
        {/* Full Name */}
        <View className="mb-4">
          <Text style={{ color: theme.text, marginBottom: 4 }}>
            {t.fullName}
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
                paddingVertical: 12,
                paddingHorizontal: 8,
                color: theme.text,
              }}
              placeholder={t.enterYourFullName}
              placeholderTextColor={theme.textMuted}
              value={formData.fullname}
              onChangeText={(value) => updateFormData("fullname", value)}
              autoCapitalize="words"
              key="fullname-input"
            />
          </View>
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text style={{ color: theme.text, marginBottom: 4 }}>
            {t.emailAddress}
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
                paddingVertical: 12,
                paddingHorizontal: 8,
                color: theme.text,
              }}
              placeholder={t.enterYourEmail}
              placeholderTextColor={theme.textMuted}
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
          label={t.password}
          value={formData.password}
          onChangeText={(value) => updateFormData("password", value)}
          showPassword={showPassword}
          toggleShowPassword={toggleShowPassword}
          placeholderText={t.enterYourPassword}
        />

        {/* Confirm Password */}
        <PasswordInput
          label={t.confirmPassword}
          value={formData.confirmPassword}
          onChangeText={(value) => updateFormData("confirmPassword", value)}
          showPassword={showConfirmPassword}
          toggleShowPassword={toggleShowConfirmPassword}
          placeholderText={t.enterYourConfirmPassword}
        />

        {/* Password Requirements */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 8,
            padding: 16,
            marginTop: 16,
          }}
        >
          <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>
            {t.passwordRequirements}
          </Text>
          <View className="flex-row items-center mb-1">
            <Check
              size={14}
              color={formData.password.length >= 8 ? theme.primary : "#ef4444"}
            />
            <Text style={{ color: theme.text, marginLeft: 8 }}>
              {t.atLeast8Characters}
            </Text>
          </View>
          <View className="flex-row items-center mb-1">
            <Check
              size={14}
              color={
                /[A-Z]/.test(formData.password) ? theme.primary : "#ef4444"
              }
            />
            <Text style={{ color: theme.text, marginLeft: 8 }}>
              {t.oneUppercaseLetter}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Check
              size={14}
              color={
                /[0-9]/.test(formData.password) ? theme.primary : "#ef4444"
              }
            />
            <Text style={{ color: theme.text, marginLeft: 8 }}>
              {t.oneNumber}
            </Text>
          </View>
        </View>
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
        {/* Social Buttons */}
        {/*<TouchableOpacity
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
        </TouchableOpacity>*/}
      </View>
    );
  }
);

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
      Toast.show({ type: "error", text1: t.passwordsDoNotMatch });
      setLoading(false);
      return;
    }

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
        // Check if email confirmation is required
        if (data.user.email_confirmed_at) {
          // User can proceed immediately - navigate to post-signup setup first
          router.replace("/(onboarding)/post-signup-setup");
        } else {
          // Email confirmation required - create default account and go to login
          try {
            const { createAccount } = await import("~/lib");

            const defaultAccount = await createAccount({
              user_id: data.user.id,
              account_type: "Accounts",
              name: "Account 1",
              amount: 0,
              description: "Default account",
              is_default: true,
              currency: "USD",
            });

            console.log(
              "Successfully created default account for new user:",
              defaultAccount.name
            );

            Toast.show({
              type: "success",
              text1: t.accountCreated,
              text2: t.defaultAccountCreated,
            });
          } catch (accountError) {
            console.error("Error creating default account:", accountError);
            // Still show success for user creation, but warn about account
            Toast.show({
              type: "success",
              text1: t.accountCreated,
              text2: t.pleaseCheckEmail,
            });
          }

          router.push("/(auth)/login");
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      Toast.show({
        type: "error",
        text1: t.signupFailed,
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
          text1: t.pleaseFillAllFields,
        });
        return;
      }

      if (/^\d+$/.test(formData.fullname)) {
        Toast.show({
          type: "error",
          text1: t.fullNameCannotBeNumbers,
        });
        return;
      }

      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      if (!isValidEmail) {
        Toast.show({
          type: "error",
          text1: t.invalidEmailFormat,
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
          text1: t.passwordRequirementsError,
        });
        return;
      }

      // Check for existing name in profiles table
      const { data: existingName } = await supabase
        .from("profiles")
        .select("id")
        .eq("full_name", formData.fullname)
        .maybeSingle();

      if (existingName) {
        Toast.show({
          type: "error",
          text1: t.fullNameAlreadyTaken,
        });
        return;
      }

      // Check for existing email in auth.users
      const { data: existingEmail } = await supabase
        .from("auth.users")
        .select("email")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingEmail) {
        Toast.show({
          type: "error",
          text1: t.emailAlreadyRegistered,
        });
        return;
      }

      // If all checks pass, proceed with signup
      await handleSignup();
    } catch (error) {
      console.error("Signup error:", error);
      Toast.show({
        type: "error",
        text1: "Signup failed",
        text2:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }, [formData]);
  const handleSocialSignup = async (provider: "google" | "github") => {
    setSocialLoading(provider);

    try {
      const redirectUrl = AuthSession.makeRedirectUri();

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

              // Create default account for social login user
              try {
                const { createAccount } = await import("~/lib");
                const {
                  data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                  // Check if user already has accounts
                  const { data: existingAccounts } = await supabase
                    .from("accounts")
                    .select("id")
                    .eq("user_id", user.id);

                  if (!existingAccounts || existingAccounts.length === 0) {
                    const defaultAccount = await createAccount({
                      user_id: user.id,
                      account_type: "Accounts",
                      name: "Main Account",
                      amount: 0,
                      description: "Main account",
                      is_default: true,
                      currency: "USD",
                    });

                    console.log("Successfully created:", defaultAccount.name);
                  }
                }
              } catch (accountError) {
                console.error(
                  "Error creating default account for social user:",
                  accountError
                );
                // Continue with navigation even if account creation fails
              }

              router.push("../(main)/Dashboard" as any);
            }
          }
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert(t.socialSignupFailed);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
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
              <View
                style={{
                  height: 4,
                  backgroundColor: theme.border,
                  borderRadius: 2,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    height: "100%",
                    backgroundColor: theme.primary,
                    borderRadius: 2,
                    width: "100%",
                  }}
                />
              </View>
              <Text
                style={{
                  color: theme.textSecondary,
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                {t.accountCreation}
              </Text>
            </View>

            {/* Header Icon */}
            <View className="items-center mb-6">
              <View
                style={{
                  backgroundColor: `${theme.primary}20`,
                  padding: 16,
                  borderRadius: 32,
                }}
              >
                <UserPlus size={32} color={theme.primary} />
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
              t={t}
            />

            {/* Action Buttons */}
            <View className="flex-row gap-3 mb-6 mt-4">
              <Button
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  padding: 16,
                }}
                onPress={handleCreate}
                disabled={loading}
              >
                <Text
                  style={{
                    color: theme.primaryText,
                    fontWeight: "bold",
                    marginRight: 8,
                  }}
                >
                  {loading ? t.creatingAccount : t.signUp}
                </Text>
                <ArrowRight size={20} color={theme.primaryText} />
              </Button>
            </View>

            {/* Footer */}
            <View className="mt-6 items-center mb-10">
              <Text style={{ color: theme.textSecondary }}>
                {t.alreadyHaveAccount}{" "}
                <Text
                  style={{ color: theme.primary, fontWeight: "bold" }}
                  onPress={() => router.push("/login")}
                >
                  {t.signIn}
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
