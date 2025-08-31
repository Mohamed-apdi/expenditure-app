import { useEffect, useState } from "react";
import { Slot, router } from "expo-router";
import { getItemAsync } from "expo-secure-store";
import { supabase } from "~/lib";
import { View, ActivityIndicator } from "react-native";

export default function AuthLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const sessionStr = await getItemAsync("supabase_session");
      if (sessionStr) {
        const session = JSON.parse(sessionStr);

        const { error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (!error) {
          // ✅ Already logged in — go to main app
          router.replace("/(main)/Dashboard");
          return;
        }
      }

      // If not logged in, show login screen normally
      setLoading(false);
    };

    restoreSession();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return <Slot />;
}
