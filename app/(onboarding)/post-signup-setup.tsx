import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Wallet, ArrowRight } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { supabase } from "~/lib";
import { StatusBar } from "expo-status-bar";

export default function PostSignupSetupScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [creatingAccount, setCreatingAccount] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure auth state is properly established
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleCreateAccount = async () => {
    try {
      setCreatingAccount(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // If user is not authenticated, redirect to login
        Toast.show({
          type: "error",
          text1: t.pleaseSignInToContinue,
        });
        router.replace("/(auth)/login");
        return;
      }

      // Create a default account for the user
      const { createAccount } = await import("~/lib");

      await createAccount({
        user_id: user.id,
        account_type: "Accounts",
        name: "Main Account",
        amount: 0,
        description: "Your main account",
        is_default: true,
        currency: "USD",
      });

      Toast.show({
        type: "success",
        text1: t.accountCreatedSuccessfully,
        text2: t.welcomeToFinancialJourney,
      });

      // Navigate to login after account creation
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Error creating account:", error);
      Toast.show({
        type: "error",
        text1: t.failedToCreateAccount,
        text2: t.pleaseTryAgain,
      });
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleSkip = () => {
    router.replace("/(auth)/login");
  };

  if (loading) {
    return (
      <>
        <StatusBar style="auto" />
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ color: theme.textSecondary, marginTop: 16, fontSize: 16 }}>
              {t.settingUpAccount}
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View className="flex-1 px-8 justify-center">
          {/* Header */}
          <View className="items-center mb-12">
            <View
              style={{
                width: 100,
                height: 100,
                backgroundColor: theme.primary,
                borderRadius: 50,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Wallet size={40} color={theme.primaryText} />
            </View>

            <Text
              style={{
                color: theme.text,
                fontSize: 28,
                fontWeight: "bold",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {t.createFirstAccount}
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 16,
                textAlign: "center",
                lineHeight: 24,
              }}
            >
              {t.createMainAccountToStart}
            </Text>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingVertical: 16,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
            onPress={handleCreateAccount}
            disabled={creatingAccount}
          >
            {creatingAccount ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <>
                <Text
                  style={{
                    color: theme.primaryText,
                    fontSize: 16,
                    fontWeight: "600",
                    marginRight: 8,
                  }}
                >
                  {t.createMainAccount}
                </Text>
                <ArrowRight size={18} color={theme.primaryText} />
              </>
            )}
          </TouchableOpacity>

          {/* Skip Button */}
          <TouchableOpacity
            style={{
              alignItems: "center",
              paddingVertical: 16,
            }}
            onPress={handleSkip}
          >
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              {t.skipForNow}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
