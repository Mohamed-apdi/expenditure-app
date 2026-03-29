/**
 * Main app shell: bottom tabs and custom tab bar
 */
import { useEffect } from "react";
import { Tabs } from "expo-router";
import { BackHandler } from "react-native";
import CustomTabBar from "~/components/CustomTabBar";

export default function MainLayout() {
  // Prevent hardware back button from exiting main tabs on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      return true;
    });

    return () => backHandler.remove();
  }, []);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      backBehavior="none"
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
