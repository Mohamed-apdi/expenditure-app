import { useEffect, useState } from "react";
import { Slot, router } from "expo-router";
import { getItemAsync } from "expo-secure-store";
import { supabase } from "~/lib";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function AuthLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.replace("/(main)/Dashboard");
          return;
        }
        const sessionStr = await getItemAsync("supabase_session");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          const { error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          if (!error) {
            router.replace("/(main)/Dashboard");
            return;
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  if (loading) {
    return (
      <>
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center bg-black">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Slot />
    </>
  );
}
