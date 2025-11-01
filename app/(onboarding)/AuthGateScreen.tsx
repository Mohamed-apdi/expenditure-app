import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { User, UserPlus, ArrowRight } from "lucide-react-native";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { StatusBar } from "expo-status-bar";

export default function AuthGateScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();

  const handleNavigateLogin = () => {
    router.push("/login");
  };

  const handleNavigateSignup = () => {
    router.push("/signup");
  };

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
              <User size={40} color={theme.primaryText} />
            </View>

            <Text
              style={{
                color: theme.text,
                fontSize: 32,
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {t.readyToGetStarted}
            </Text>

            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 18,
                textAlign: "center",
                lineHeight: 26,
              }}
            >
              {t.signInToAccountOrCreate}
            </Text>
          </View>

          {/* Auth Buttons */}
          <View className="gap-4 mb-8">
            {/* Sign In Button */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={handleNavigateLogin}
            >
              <User size={20} color={theme.primaryText} />
              <Text
                style={{
                  color: theme.primaryText,
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                {t.signIn}
              </Text>
            </TouchableOpacity>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.cardBackground,
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={handleNavigateSignup}
            >
              <UserPlus size={20} color={theme.text} />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                {t.createAccount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="items-center">
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 14,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              {t.termsAndPrivacy}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}
