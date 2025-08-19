import "~/global.css";

import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { Appearance, Platform, View } from "react-native";
import { NAV_THEME } from "~/lib/constants";
import { useColorScheme } from "~/lib/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import Toast from "react-native-toast-message";
import { AccountProvider } from "~/lib/AccountContext";
import * as Notifications from "expo-notifications";
import notificationService from "~/lib/notificationService";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from "~/lib/LanguageProvider";

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

const usePlatformSpecificSetup = Platform.select({
  web: useSetWebBackgroundClassName,
  android: useSetAndroidNavigationBar,
  default: noop,
});

export default function RootLayout() {
  usePlatformSpecificSetup();
  const { isDarkColorScheme } = useColorScheme();

  // Create React Query client
  const queryClient = React.useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  }), []);

  // Initialize notifications globally
  React.useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Check if we're in Expo Go (where notifications are limited)
        const { isExpoGo } = await import('~/lib/expoGoUtils');
        
        if (isExpoGo) {
          console.warn('Push notifications are limited in Expo Go with SDK 53. Use development build for full functionality.');
          return;
        }

        // Set up notification response listener globally
        const subscription =
          Notifications.addNotificationResponseReceivedListener(
            notificationService.handleNotificationResponse
          );

        return () => subscription.remove();
      } catch (error) {
        console.error("Failed to initialize global notifications:", error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AccountProvider>
          <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
            <BottomSheetModalProvider>
              <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(main)" />
                <Stack.Screen name="(predict)" />
                <Stack.Screen name="(expense)" />
                <Stack.Screen name="(analytics)" />
                <Stack.Screen name="(profile)" />
              </Stack>
              <Toast />
              <PortalHost />
            </BottomSheetModalProvider>
          </ThemeProvider>
        </AccountProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined"
    ? React.useEffect
    : React.useLayoutEffect;

function useSetWebBackgroundClassName() {
  useIsomorphicLayoutEffect(() => {
    // Adds the background color to the html element to prevent white background on overscroll.
    document.documentElement.classList.add("bg-background");
  }, []);
}

function useSetAndroidNavigationBar() {
  React.useLayoutEffect(() => {
    setAndroidNavigationBar(Appearance.getColorScheme() ?? "light");
  }, []);
}

function noop() {}
