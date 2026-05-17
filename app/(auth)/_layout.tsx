/**
 * Auth layout: login/signup slot and session restore before entering app
 */
import { useEffect, useState } from "react";
import { Slot, router } from "expo-router";
import { ensureAuthSessionForRouting } from "~/lib/auth";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function AuthLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const hasSession = await ensureAuthSessionForRouting();
        if (hasSession) {
          router.replace("/(main)/Dashboard");
          return;
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
