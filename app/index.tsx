import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect, router } from "expo-router";
import { getItemAsync } from "expo-secure-store";
import { supabase } from "~/lib";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionStr = await getItemAsync("supabase_session");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          const { error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          if (!error) {
            setHasSession(true);
            return;
          }
        }
        setHasSession(false);
      } catch {
        setHasSession(false);
      } finally {
        setChecking(false);
      }
    };
    checkSession();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (hasSession) {
    return <Redirect href="/(main)/Dashboard" />;
  }
  return <Redirect href="/(onboarding)/welcomeScreen" />;
}
