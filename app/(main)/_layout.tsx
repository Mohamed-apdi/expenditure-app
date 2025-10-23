import { Tabs } from "expo-router";
import CustomTabBar from "~/components/CustomTabBar";

export default function MainLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="ReportsScreen" options={{ title: "Reports" }} />
      <Tabs.Screen name="BudgetScreen" options={{ title: "Budget" }} />
      <Tabs.Screen name="Accounts" options={{ title: "Accounts" }} />
      {/*<Tabs.Screen name="DummyAdd" options={{ href: null }} />*/}
    </Tabs>
  );
}
