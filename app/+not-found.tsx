import { Stack, useRouter } from "expo-router";
import { View, TouchableOpacity } from "react-native";
import { Text } from "~/components/ui/text";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");


// Not Found Screen

export default function NotFoundScreen() {
  const router = useRouter();

  // Navigate to app root - index will redirect based on auth:
  // logged in → Dashboard, not logged in → welcome/auth flow
  const goToSafeHome = () => router.replace("/");

  return (
    <>
      <Stack.Screen
        options={{
          title: "Page Not Found",
          headerStyle: {
            backgroundColor: "#f8fafc",
          },
          headerTintColor: "#1e293b",
          headerTitleStyle: {
            fontWeight: "600",
          },
        }}
      />
      <View className="flex-1 bg-slate-50 justify-between">
        <View className="flex-1 items-center justify-center px-8 pt-16">
          {/* Error Icon */}
          <View className="mb-6 p-5 bg-red-50 rounded-full border border-red-200">
            <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
          </View>

          {/* Error Code */}
          <Text className="text-7xl font-extrabold text-red-500 mb-4 tracking-tighter">
            404
          </Text>

          {/* Main Message */}
          <Text className="text-3xl font-bold text-slate-800 mb-4 text-center">
            Page Not Found
          </Text>

          {/* Description */}
          <Text className="text-base text-slate-500 text-center leading-6 mb-10 max-w-xs">
            Sorry, we couldn't find the page you're looking for. The page might
            have been moved, deleted, or the URL might be incorrect.
          </Text>

          {/* Action Button - goes to app root; auth check there routes to Dashboard or login */}
          <TouchableOpacity onPress={goToSafeHome} className="mb-6" activeOpacity={0.8}>
            <View className="flex-row items-center bg-blue-500 px-8 py-4 rounded-xl shadow-lg shadow-blue-500/30">
              <Ionicons
                name="home-outline"
                size={20}
                color="#ffffff"
                className="mr-2"
              />
              <Text className="text-white text-base font-semibold ml-2">
                Go to Home
              </Text>
            </View>
          </TouchableOpacity>

          {/* Secondary Action - same safe navigation for unauthenticated users (e.g. failed OAuth) */}
          <TouchableOpacity onPress={goToSafeHome} className="p-3">
            <Text className="text-indigo-600 text-base font-medium underline">
              ← Back to app
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="px-8 pb-10 items-center">
          <Text className="text-sm text-slate-400 text-center">
            Need help? Contact our support team
          </Text>
        </View>
      </View>
    </>
  );
}
