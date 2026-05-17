import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { ensureAuthSessionForRouting } from "~/lib/auth";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const ok = await ensureAuthSessionForRouting();
        setHasSession(ok);
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
