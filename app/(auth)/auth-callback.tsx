import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { setItemAsync } from "expo-secure-store";
import { supabase } from "~/lib";
import { createAccount, fetchAccounts } from "~/lib/services/accounts";
import Toast from "react-native-toast-message";

/**
 * Handles OAuth redirect (e.g. Google). When the app is opened from the
 * redirect URL with tokens in the hash/query, we set the session and go to
 * Dashboard; otherwise we go to AuthGateScreen so we don't land on 404.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      const url = await Linking.getInitialURL();
      if (cancelled) return;

      if (!url) {
        router.replace("/(onboarding)/AuthGateScreen");
        setHandled(true);
        return;
      }

      try {
        const parsed = new URL(url);
        const params = new URLSearchParams(parsed.hash.substring(1));
        let access_token = params.get("access_token");
        let refresh_token = params.get("refresh_token");
        if (!access_token || !refresh_token) {
          const q = new URLSearchParams(parsed.search);
          access_token = q.get("access_token");
          refresh_token = q.get("refresh_token");
        }

        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (cancelled) return;
          if (error) throw error;

          if (data.session && data.user?.id) {
            await setItemAsync("token", data.session.access_token);
            await setItemAsync("userId", data.user.id);
            await setItemAsync("supabase_session", JSON.stringify(data.session));
            try {
              const accounts = await fetchAccounts(data.user.id);
              if (accounts.length === 0) {
                await createAccount({
                  user_id: data.user.id,
                  account_type: "Accounts",
                  name: "Account 1",
                  amount: 0,
                  description: "Default account",
                  is_default: true,
                  currency: "USD",
                });
              }
            } catch {
              // ignore
            }
            Toast.show({ type: "success", text1: "Signed in successfully" });
            router.replace("/(main)/Dashboard");
          } else {
            router.replace("/(onboarding)/AuthGateScreen");
          }
        } else {
          router.replace("/(onboarding)/AuthGateScreen");
        }
      } catch {
        if (!cancelled) router.replace("/(onboarding)/AuthGateScreen");
      } finally {
        if (!cancelled) setHandled(true);
      }
    };

    handleCallback();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
      <ActivityIndicator size="large" color="#40A5E7" />
    </View>
  );
}
