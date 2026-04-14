/**
 * Main app shell: bottom tabs and custom tab bar
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, useRouter, useSegments, useFocusEffect } from "expo-router";
import { BackHandler, Platform } from "react-native";
import CustomTabBar from "~/components/CustomTabBar";
import { EvcSmsDiscoverySheet } from "~/components/evc/EvcSmsDiscoverySheet";
import {
  getCurrentUserOfflineFirst,
  isExpoGo,
} from "~/lib";
import {
  getEvcDiscoverySheetDismissedForever,
  isEvcDiscoverySetupComplete,
  setEvcDiscoverySheetDismissedForever,
} from "~/lib/services/evcSmsSettings";

export default function MainLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [evcDiscoveryVisible, setEvcDiscoveryVisible] = useState(false);
  const evcDiscoverySessionDismissed = useRef(false);

  // Android hardware back:
  // - Never back-navigate into (auth) (e.g., login)
  // - If not on Home tab, go to Home tab
  // - On Home tab, consume back (stay in app)
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      const seg0 = segments[0];
      const leaf = segments[segments.length - 1];

      // If something routes into auth, block that and keep user in main.
      if ((segments as string[]).includes("(auth)")) {
        router.replace("/(main)/Dashboard");
        return true;
      }

      // In main tabs: back should never escape into root stack history.
      if (seg0 === "(main)") {
        if (leaf !== "Dashboard") {
          router.replace("/(main)/Dashboard");
          return true;
        }

        // On Home: do nothing (don't exit the app, don't navigate backwards).
        return true;
      }

      // Fallback: allow default behavior outside main.
      return false;
    });

    return () => backHandler.remove();
  }, [router, segments]);

  // Post-login EVC discovery (Android, not Expo Go): show once per session until dismissed or configured.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (Platform.OS !== "android") return;
      if (isExpoGo) return;
      if (evcDiscoverySessionDismissed.current) return;
      const user = await getCurrentUserOfflineFirst();
      if (!user?.id || !alive) return;
      if (await getEvcDiscoverySheetDismissedForever(user.id)) return;
      if (await isEvcDiscoverySetupComplete(user.id)) return;
      if (!alive) return;
      setEvcDiscoveryVisible(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Hide discovery sheet if user finished setup in Settings (or elsewhere) while app stays open.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (Platform.OS !== "android") return;
        if (isExpoGo) return;
        const user = await getCurrentUserOfflineFirst();
        if (!user?.id || !alive) return;
        if (await isEvcDiscoverySetupComplete(user.id)) {
          setEvcDiscoveryVisible(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const dismissEvcDiscoverySession = () => {
    evcDiscoverySessionDismissed.current = true;
    setEvcDiscoveryVisible(false);
  };

  return (
    <>
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          borderTopColor: "transparent",
          elevation: 0,
          shadowOpacity: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
        },
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
    <EvcSmsDiscoverySheet
      visible={evcDiscoveryVisible}
      onClose={dismissEvcDiscoverySession}
      onOpenSettings={() => {
        dismissEvcDiscoverySession();
        router.push("/(main)/SettingScreen");
      }}
      onDontShowAgain={async () => {
        const user = await getCurrentUserOfflineFirst();
        if (user?.id) {
          await setEvcDiscoverySheetDismissedForever(user.id);
        }
        dismissEvcDiscoverySession();
      }}
    />
    </>
  );
}
