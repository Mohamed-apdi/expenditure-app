/**
 * Root layout: providers, navigation stack, and global app setup
 */
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
import { Appearance, LogBox, Platform, View } from 'react-native';

// Suppress known third-party/expected warnings in development
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'expo-notifications: obtaining a push token',
  'expo-notifications: Android Push notifications',
  'expo-notifications` functionality is not fully supported',
  'Push notifications are limited in Expo Go',
]);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NAV_THEME } from '~/lib';
import { useColorScheme } from '~/lib';
import { PortalHost } from '@rn-primitives/portal';
import { setAndroidNavigationBar } from '~/lib';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Toaster } from 'sonner-native';
import { AccountProvider, SyncProvider } from '~/lib';
import * as Notifications from 'expo-notifications';
import { notificationService } from '~/lib';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '~/lib';
import { EvcSmsInboundHost } from '~/components/EvcSmsInboundHost';

// Ensure index is the initial route on app load/reload to avoid 404 when restoring state
export const unstable_settings = {
  initialRouteName: 'index',
};

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

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined'
    ? React.useEffect
    : React.useLayoutEffect;

function usePlatformSpecificSetup(isDarkColorScheme: boolean) {
  useIsomorphicLayoutEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.classList.add('bg-background');
    }
  }, []);
  React.useLayoutEffect(() => {
    if (Platform.OS === 'android') {
      setAndroidNavigationBar(isDarkColorScheme ? 'dark' : 'light');
    }
  }, [isDarkColorScheme]);
}

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();
  usePlatformSpecificSetup(isDarkColorScheme);

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

  // Initialize notifications globally and request permission on app start
  React.useEffect(() => {
    let subscription: Notifications.Subscription | undefined;
    
    const initializeNotifications = async () => {
      try {
        // Check if we're in Expo Go (where notifications are limited)
        const { isExpoGo } = await import('~/lib');

        if (isExpoGo) return;

        // Register background task
        await notificationService.registerBackgroundTask();

        // Request notification permission using the default system dialog
        await Notifications.requestPermissionsAsync();

        // Set up notification response listener globally
        subscription = Notifications.addNotificationResponseReceivedListener(
          notificationService.handleNotificationResponse,
        );
      } catch (error) {
        console.error('Failed to initialize global notifications:', error);
        // Don't crash the app if notifications fail to initialize
      }
    };

    initializeNotifications();
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AccountProvider>
            <SyncProvider>
              <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
                <BottomSheetModalProvider>
                  <StatusBar style={isDarkColorScheme ? 'dark' : 'light'} />
                  <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
                    <Stack.Screen name="index" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="(main)" options={{ gestureEnabled: false, animation: 'none' }} />
                    <Stack.Screen name="(expense)" />
                    <Stack.Screen name="(profile)" />
                  </Stack>
                  <Toaster />
                  <EvcSmsInboundHost />
                  <PortalHost />
                </BottomSheetModalProvider>
              </ThemeProvider>
            </SyncProvider>
          </AccountProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
