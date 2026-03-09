import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { BackHandler } from "react-native";
import CustomTabBar from "~/components/CustomTabBar";

export default function MainLayout() {
  // Prevent hardware back button from going back to auth screens on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      // If we're on the Dashboard tab (main entry point), prevent going back to auth
      // This ensures user can't accidentally go back to login screen
      if (!router.canGoBack()) {
        return true; // Prevent default back behavior
      }
      return false; // Allow normal back behavior within the app
    });

    return () => backHandler.remove();
  }, []);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="ReportsScreen" options={{ title: "Reports" }} />
      <Tabs.Screen name="BudgetScreen" options={{ title: "Budget" }} />
      <Tabs.Screen name="Accounts" options={{ title: "Accounts" }} />
      <Tabs.Screen name="SettingScreen" options={{ href: null }} />
      <Tabs.Screen name="ConflictsScreen" options={{ href: null }} />
    </Tabs>
  );
}
