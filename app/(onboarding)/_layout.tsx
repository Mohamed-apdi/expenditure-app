import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { supabase } from "~/lib";
import { getItemAsync, setItemAsync } from "expo-secure-store";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function OnboardingLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const sessionStr = await getItemAsync("supabase_session");

      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const { error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (!error) {
          // Check if user has completed onboarding
          const onboardingComplete = await getItemAsync("onboarding_complete");

          if (onboardingComplete === "true") {
            // ✅ User completed onboarding - go to dashboard
            router.replace("/(main)/Dashboard");
            return;
          }
          // ✅ User is logged in but hasn't completed onboarding - continue to onboarding flow
        }
      }

      // ❌ Not logged in, continue to Welcome
      setChecking(false);
    };

    checkSession();
  }, []);

  if (checking) {
    return (
      <>
        <StatusBar style="light" />
        <View className="flex-1 bg-black justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
