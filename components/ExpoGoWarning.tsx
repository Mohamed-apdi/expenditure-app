import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { AlertTriangle, ExternalLink } from 'lucide-react-native';
import { useTheme } from '~/lib/theme';
import { isExpoGo } from '~/lib/expoGoUtils';

interface ExpoGoWarningProps {
  showInExpoGo?: boolean; // Only show when in Expo Go
  showInDevBuild?: boolean; // Show different message in dev build
}

export default function ExpoGoWarning({ 
  showInExpoGo = true, 
  showInDevBuild = false 
}: ExpoGoWarningProps) {
  const theme = useTheme();
  
  // Don't show if not in Expo Go and not showing in dev build
  if (!isExpoGo && !showInDevBuild) return null;
  
  // Don't show if in Expo Go but not supposed to show
  if (isExpoGo && !showInExpoGo) return null;

  const handleLearnMore = () => {
    Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/');
  };

  if (isExpoGo) {
    return (
      <View className="mx-4 mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <View className="flex-row items-start space-x-3">
          <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <View className="flex-1">
            <Text className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Expo Go Limitations
            </Text>
            <Text className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
              You're running in Expo Go with SDK 53+. Push notifications and some native features are not available.
            </Text>
            <TouchableOpacity
              onPress={handleLearnMore}
              className="flex-row items-center space-x-1"
            >
              <Text className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                Learn about Development Builds
              </Text>
              <ExternalLink size={12} className="text-yellow-600 dark:text-yellow-400" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (showInDevBuild) {
    return (
      <View className="mx-4 mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <View className="flex-row items-start space-x-3">
          <View className="w-5 h-5 bg-green-500 rounded-full items-center justify-center">
            <Text className="text-white text-xs font-bold">✓</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
              Development Build Active
            </Text>
            <Text className="text-xs text-green-700 dark:text-green-300">
              You're running a development build. All features including push notifications are available.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return null;
}
