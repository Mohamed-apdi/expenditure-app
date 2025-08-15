import { Tabs } from "expo-router";
import {
  Home,
  TrendingUp,
  PieChart,
  Layers,
  User,
  Wallet,
} from "lucide-react-native";
import { useColorScheme } from "~/lib/useColorScheme";

export default function MainLayout() {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#10b981",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: isDarkColorScheme ? "#1e293b" : "#ffffff",
          borderTopColor: isDarkColorScheme ? "#334155" : "#e2e8f0",
        },
        headerStyle: {
          backgroundColor: isDarkColorScheme ? "#0f172a" : "#ffffff",
        },
        headerTintColor: isDarkColorScheme ? "#f8fafc" : "#0f172a",
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="ExpenseListScreen"
        options={{
          title: "Expenses",
          tabBarIcon: ({ color, size }) => <Layers color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="AdvancedAnalytics"
        options={{
          title: "analytics",
          tabBarIcon: ({ color, size }) => (
            <PieChart color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ProfileScreen"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
