import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Wallet, ArrowRight } from "lucide-react-native";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();

  const handleNavigate = () => {
    router.push("/inputCategoriesScreen");
  };

  return (
    <>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View className="flex-1 px-8 justify-center">
          {/* Hero Section */}
          <View className="items-center mb-12">
            <View
              style={{
                width: 120,
                height: 120,
                backgroundColor: theme.primary,
                borderRadius: 60,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Wallet size={50} color={theme.primaryText} />
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
              {t.welcomeToApp.replace('{appName}', t.appName)}
            </Text>

            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 18,
                textAlign: "center",
                lineHeight: 26,
                marginBottom: 8,
              }}
            >
              {t.takeControlOfFinances}
            </Text>

            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 16,
                textAlign: "center",
                lineHeight: 24,
              }}
            >
              {t.trackExpensesManageBudgets}
            </Text>
          </View>

          {/* Get Started Button */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingVertical: 16,
              paddingHorizontal: 32,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleNavigate}
          >
            <Text
              style={{
                color: theme.primaryText,
                fontSize: 18,
                fontWeight: "600",
                marginRight: 8,
              }}
            >
              {t.getStarted}
            </Text>
            <ArrowRight size={20} color={theme.primaryText} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
