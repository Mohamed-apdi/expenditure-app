import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { View, ActivityIndicator, Text } from "react-native";
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
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (cancelled) return;

        console.log("Auth callback received URL:", url);

        if (!url) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            Toast.show({ type: "success", text1: "Already signed in" });
            router.replace("/(main)/Dashboard");
            return;
          }
          router.replace("/(onboarding)/AuthGateScreen");
          setHandled(true);
          return;
        }

        setStatus("Extracting credentials...");
        const parsed = new URL(url);

        const hashParams = new URLSearchParams(parsed.hash.substring(1));
        let access_token = hashParams.get("access_token");
        let refresh_token = hashParams.get("refresh_token");

        if (!access_token || !refresh_token) {
          const queryParams = new URLSearchParams(parsed.search);
          access_token = queryParams.get("access_token");
          refresh_token = queryParams.get("refresh_token");
        }

        if (!access_token || !refresh_token) {
          const code = hashParams.get("code") || new URLSearchParams(parsed.search).get("code");
          if (code) {
            setStatus("Exchanging authorization code...");
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            if (exchangeData.session) {
              access_token = exchangeData.session.access_token;
              refresh_token = exchangeData.session.refresh_token;
            }
          }
        }

        if (access_token && refresh_token) {
          setStatus("Setting up session...");
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

            setStatus("Setting up your account...");
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
            } catch (accountError) {
              console.error("Error creating default account:", accountError);
            }

            Toast.show({ type: "success", text1: "Signed in successfully" });
            router.replace("/(main)/Dashboard");
          } else {
            router.replace("/(onboarding)/AuthGateScreen");
          }
        } else {
          console.log("No tokens found in callback URL");
          router.replace("/(onboarding)/AuthGateScreen");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        if (!cancelled) {
          Toast.show({ type: "error", text1: "Sign-in failed", text2: "Please try again" });
          router.replace("/(onboarding)/AuthGateScreen");
        }
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
      <ActivityIndicator size="large" color="#00BFFF" />
      <Text style={{ marginTop: 16, color: "#64748b", fontSize: 14 }}>{status}</Text>
    </View>
  );
}
