import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react-native";
import { useTheme, useScreenStatusBar } from "~/lib";
import { useLanguage } from "~/lib";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setItemAsync, deleteItemAsync } from "expo-secure-store";
import { supabase } from "~/lib";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { toast } from "sonner-native";
import { ensureDefaultAccount } from "~/lib/services/accounts";
import { APP_COLORS } from "~/lib/config/theme/constants";

WebBrowser.maybeCompleteAuthSession();

const REMEMBER_ME_KEY = "auth_remember_me";

export default function AuthGateScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  // Load saved "Remember me" preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        setRememberMe(saved !== "false");
      } catch {
        // keep default true
      }
    })();
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(onboarding)/welcomeScreen");
    }
  };

  const toggleRememberMe = async () => {
    const next = !rememberMe;
    setRememberMe(next);
    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, next ? "true" : "false");
    } catch {
      // ignore
    }
  };

  const handleGetStarted = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error(t.error, { description: t.missingCredentials });
      return;
    }
    setLoading(true);
    try {
      if (activeTab === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data.session) throw new Error("No session");
        if (rememberMe) {
          await setItemAsync("token", data.session.access_token);
          if (data.user?.id) await setItemAsync("userId", data.user.id);
          await setItemAsync("supabase_session", JSON.stringify(data.session));
        } else {
          await deleteItemAsync("token");
          await deleteItemAsync("userId");
          await deleteItemAsync("supabase_session");
        }
        await ensureDefaultAccount(data.user.id);
        toast.success(t.loginSuccessfully);
        router.replace("/(main)/Dashboard");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.user && !data.user.email_confirmed_at) {
          toast.success(t.accountCreated, { description: t.pleaseCheckEmail });
          router.push("/(auth)/login");
        } else if (data.user?.email_confirmed_at && data.session) {
          await setItemAsync("token", data.session.access_token);
          if (data.user.id) await setItemAsync("userId", data.user.id);
          await setItemAsync("supabase_session", JSON.stringify(data.session));
          await ensureDefaultAccount(data.user.id);
          router.replace("/(main)/Dashboard");
        }
      }
    } catch (err: any) {
      toast.error(activeTab === "login" ? t.loginError : t.signupFailed, {
        description: err?.message || t.missingCredentials,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    setSocialLoading("google");
    try {
      const redirectUrl = AuthSession.makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
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
          let access_token = params.get("access_token");
          let refresh_token = params.get("refresh_token");
          if (!access_token || !refresh_token) {
            const q = new URLSearchParams(url.search);
            access_token = q.get("access_token");
            refresh_token = q.get("refresh_token");
          }
          if (access_token && refresh_token) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({ access_token, refresh_token });
            if (sessionError) throw sessionError;
            if (sessionData.session && sessionData.user?.id) {
              await setItemAsync("token", sessionData.session.access_token);
              await setItemAsync("userId", sessionData.user.id);
              await setItemAsync(
                "supabase_session",
                JSON.stringify(sessionData.session)
              );
              try {
                await ensureDefaultAccount(sessionData.user.id);
              } catch {
                // Don't block sign-in if default account creation fails
              }
              toast.success(t.loginSuccessfully);
              router.replace("/(main)/Dashboard");
            }
          }
        } else if (result.type === "cancel") {
          toast.info("Sign in cancelled");
        }
      }
    } catch (err: any) {
      toast.error("Sign in failed", {
        description: err?.message || "An error occurred",
      });
    } finally {
      setSocialLoading(null);
    }
  };

  useScreenStatusBar();

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <TouchableOpacity
              onPress={handleBack}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: APP_COLORS.darkCard,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 20,
                marginTop: 8,
              }}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Title: Welcome to / AppName */}
            <View style={{ paddingHorizontal: 24, marginTop: 16, marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: "#1A1A1A",
                }}
              >
                {t.welcomeTo}
              </Text>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "800",
                  color: "#1A1A1A",
                  marginTop: 4,
                }}
              >
                {t.appName}
              </Text>
            </View>

            {/* Login / Sign up tabs */}
            <View
              style={{
                flexDirection: "row",
                marginHorizontal: 24,
                marginBottom: 24,
                backgroundColor: APP_COLORS.inputBg,
                borderRadius: 12,
                padding: 4,
              }}
            >
              <TouchableOpacity
                onPress={() => setActiveTab("login")}
                activeOpacity={1}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: activeTab === "login" ? APP_COLORS.darkCard : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: activeTab === "login" ? "#FFFFFF" : "#4A4A4A",
                  }}
                >
                  {t.login}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("signup")}
                activeOpacity={1}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: activeTab === "signup" ? APP_COLORS.darkCard : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: activeTab === "signup" ? "#FFFFFF" : "#4A4A4A",
                  }}
                >
                  {t.signUp}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email */}
            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "#4A4A4A",
                  marginBottom: 8,
                }}
              >
                {t.emailAddress} *
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: APP_COLORS.inputBg,
                  borderWidth: 1,
                  borderColor: APP_COLORS.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: "#1A1A1A",
                  }}
                  placeholder={t.enterYourEmail}
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Mail size={20} color="#9CA3AF" />
              </View>
            </View>

            {/* Password */}
            <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "#4A4A4A",
                  marginBottom: 8,
                }}
              >
                {t.password} *
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: APP_COLORS.inputBg,
                  borderWidth: 1,
                  borderColor: APP_COLORS.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: "#1A1A1A",
                  }}
                  placeholder={t.enterYourPassword}
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={12}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember me */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 24,
                marginBottom: 24,
              }}
            >
              <TouchableOpacity
                onPress={toggleRememberMe}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: APP_COLORS.border,
                    backgroundColor: rememberMe ? APP_COLORS.darkCard : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {rememberMe && (
                    <Text style={{ color: "#FFF", fontSize: 14 }}>✓</Text>
                  )}
                </View>
                <Text style={{ fontSize: 14, color: "#4A4A4A" }}>
                  {t.rememberMe}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Get Started button - primary */}
            <TouchableOpacity
              onPress={handleGetStarted}
              disabled={loading}
              style={{
                marginHorizontal: 24,
                backgroundColor: theme.primary,
                paddingVertical: 16,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 32,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.primaryText} />
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: theme.primaryText,
                      marginRight: 8,
                    }}
                  >
                    {t.getStarted}
                  </Text>
                  <ArrowRight size={20} color={theme.primaryText} strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>

            {/* Social section - dark card */}
            <View
              style={{
                marginHorizontal: 24,
                backgroundColor: APP_COLORS.darkCard,
                borderRadius: 16,
                paddingTop: 20,
                paddingBottom: 20,
                paddingHorizontal: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#FFFFFF",
                  marginBottom: 16,
                }}
              >
                {t.continueWith}
              </Text>
              <TouchableOpacity
                onPress={handleSignInWithGoogle}
                disabled={socialLoading !== null}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: APP_COLORS.border,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                {socialLoading === "google" ? (
                  <ActivityIndicator size="small" color={APP_COLORS.darkCard} style={{ marginRight: 12 }} />
                ) : (
                  <Image
                    source={require("../../assets/images/google_icon.png")}
                    style={{ width: 24, height: 24, marginRight: 12 }}
                    resizeMode="contain"
                  />
                )}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#1A1A1A",
                  }}
                >
                  {t.continueWithGoogle}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer terms - link-style text, no redirect */}
            <Text
              style={{
                fontSize: 12,
                color: "#9CA3AF",
                textAlign: "center",
                marginTop: 20,
                paddingHorizontal: 24,
                lineHeight: 18,
              }}
            >
              {t.termsAndPrivacyPrefix}
              <Text style={{ color: "#2563EB" }}>{t.termsOfService}</Text>
              {t.termsAndPrivacyAnd}
              <Text style={{ color: "#2563EB" }}>{t.privacyPolicy}</Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
