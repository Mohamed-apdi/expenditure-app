import '~/global.css';

import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Appearance, Platform, View } from 'react-native';
import { NAV_THEME } from '~/lib';
import { useColorScheme } from '~/lib';
import { PortalHost } from '@rn-primitives/portal';
import { setAndroidNavigationBar } from '~/lib';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { AccountProvider } from '~/lib';
import * as Notifications from 'expo-notifications';
import { notificationService } from '~/lib';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '~/lib';

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
} from 'expo-router';

const usePlatformSpecificSetup = Platform.select({
  web: useSetWebBackgroundClassName,
  android: useSetAndroidNavigationBar,
  default: noop,
});

export default function RootLayout() {
  usePlatformSpecificSetup();
  const { isDarkColorScheme } = useColorScheme();

  // Create React Query client
  const queryClient = React.useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: 2,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      }),
    [],
  );

  // Initialize notifications globally
  React.useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Check if we're in Expo Go (where notifications are limited)
        const { isExpoGo } = await import('~/lib');

        if (isExpoGo) {
          console.warn(
            'Push notifications are limited in Expo Go with SDK 53. Use development build for full functionality.',
          );
          return;
        }

        // Set up notification response listener globally
        const subscription =
          Notifications.addNotificationResponseReceivedListener(
            notificationService.handleNotificationResponse,
          );

        return () => subscription.remove();
      } catch (error) {
        console.error('Failed to initialize global notifications:', error);
        // Don't crash the app if notifications fail to initialize
      }
    };

    initializeNotifications();
  }, []);

  // Error boundary for catching initialization errors
  React.useEffect(() => {
    const errorHandler = (error: Error) => {
      console.error('Unhandled error in RootLayout:', error);
      // Log to crash reporting service if available
    };

    // Handle unhandled promise rejections (web only)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const rejectionHandler = (event: PromiseRejectionEvent) => {
        console.error('Unhandled promise rejection:', event.reason);
        errorHandler(new Error(String(event.reason)));
      };

      window.addEventListener('unhandledrejection', rejectionHandler);
      return () => {
        window.removeEventListener('unhandledrejection', rejectionHandler);
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AccountProvider>
          <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
            <BottomSheetModalProvider>
              <StatusBar style={isDarkColorScheme ? 'dark' : 'light'} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(main)" />
                <Stack.Screen name="(expense)" />
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
  Platform.OS === 'web' && typeof window === 'undefined'
    ? React.useEffect
    : React.useLayoutEffect;

function useSetWebBackgroundClassName() {
  useIsomorphicLayoutEffect(() => {
    // Adds the background color to the html element to prevent white background on overscroll.
    document.documentElement.classList.add('bg-background');
  }, []);
}

function useSetAndroidNavigationBar() {
  React.useLayoutEffect(() => {
    setAndroidNavigationBar(Appearance.getColorScheme() ?? 'light');
  }, []);
}

function noop() {}
