import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { StatusBar } from "expo-status-bar";

export default function InputCategoriesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();

  const handleNavigate = () => {
    router.push("/AuthGateScreen");
  };

  return (
    <>
      <StatusBar style="auto" />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View className="flex-1 px-8 justify-center">
          {/* Header */}
          <View className="items-center mb-16">
            <Text
              style={{
                color: theme.text,
                fontSize: 32,
                fontWeight: "bold",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Let's set up your finances
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 18,
                lineHeight: 26,
                textAlign: "center",
              }}
            >
              We'll help you track your money and reach your financial goals
            </Text>
          </View>

          {/* Simple Info Card */}
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 32,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 16,
                lineHeight: 24,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              You'll be able to:
            </Text>

            <View className="gap-3">
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: theme.primary,
                    borderRadius: 4,
                    marginRight: 12,
                  }}
                />
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 15,
                  }}
                >
                  Track your income and expenses
                </Text>
              </View>

              <View className="flex-row items-center">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: theme.primary,
                    borderRadius: 4,
                    marginRight: 12,
                  }}
                />
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 15,
                  }}
                >
                  Set and monitor your budget
                </Text>
              </View>

              <View className="flex-row items-center">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: theme.primary,
                    borderRadius: 4,
                    marginRight: 12,
                  }}
                />
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 15,
                  }}
                >
                  Get insights into your spending
                </Text>
              </View>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingVertical: 16,
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
                fontSize: 16,
                fontWeight: "600",
                marginRight: 8,
              }}
            >
              Let's get started
            </Text>
            <ArrowRight size={18} color={theme.primaryText} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
