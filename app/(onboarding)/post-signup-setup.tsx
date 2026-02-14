import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { useTheme, useScreenStatusBar } from "~/lib";
import { useLanguage } from "~/lib";
import { supabase } from "~/lib";
import { ensureDefaultAccount } from "~/lib/services/accounts";

/**
 * Post-signup screen: ensures default account exists (behind the scenes) and
 * redirects to Dashboard. No manual "Create account" step (spec 004).
 */
export default function PostSignupSetupScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  useEffect(() => {
    let cancelled = false;

    const setupAndRedirect = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          Toast.show({
            type: "error",
            text1: t.pleaseSignInToContinue,
          });
          router.replace("/(auth)/login");
        }
        return;
      }

      try {
        await ensureDefaultAccount(user.id);
      } catch (error) {
        console.error("Error ensuring default account:", error);
        // Don't block: user can create account from Dashboard if needed
      }

      if (!cancelled) {
        router.replace("/(main)/Dashboard");
      }
    };

    const timer = setTimeout(setupAndRedirect, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [t.pleaseSignInToContinue]);

  useScreenStatusBar();

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
          <Text
            style={{
              color: theme.textSecondary,
              marginTop: 16,
              fontSize: 16,
            }}
          >
            {t.settingUpAccount}
          </Text>
        </View>
      </SafeAreaView>
    </>
  );
}
