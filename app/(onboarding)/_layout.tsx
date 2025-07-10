import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { supabase } from "~/lib/supabase";
import { getItemAsync } from "expo-secure-store";
import { ActivityIndicator, View } from "react-native";

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
          // ✅ Redirect if already logged in
          router.replace("/(main)/Dashboard");
          return;
        }
      }

      // ❌ Not logged in, continue to Welcome
      setChecking(false);
    };

    checkSession();
  }, []);

  if (checking) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
