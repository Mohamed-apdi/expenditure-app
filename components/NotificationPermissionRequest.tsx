/**
 * Banner/prompt to request notification permissions; can be dismissed and remembered
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Animated } from 'react-native';
import { Bell, X, AlertCircle, Calendar, TrendingUp } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNotificationPermissions } from '~/lib';
import { isExpoGo } from '~/lib';

const NOTIFICATION_REQUEST_DISMISSED_KEY = '@notification_request_dismissed';

// Export this helper to allow resetting the dismissed state
export const resetNotificationRequestDismissed = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFICATION_REQUEST_DISMISSED_KEY);
  } catch (error) {
    console.error('Error resetting dismiss state:', error);
  }
};

interface NotificationPermissionRequestProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

const FeatureItem = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <View className="flex-row items-center mb-2">
    <View className="w-6 h-6 rounded-full bg-cyan-500/20 dark:bg-cyan-400/20 items-center justify-center mr-2">
      <Icon size={12} color="#00BFFF" />
    </View>
    <Text className="text-xs text-gray-600 dark:text-gray-300 flex-1">
      {text}
    </Text>
  </View>
);

export default function NotificationPermissionRequest({
  onPermissionGranted,
  onPermissionDenied,
}: NotificationPermissionRequestProps) {
  const [showRequest, setShowRequest] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    checkAndShowPermissionRequest();
  }, []);

  useEffect(() => {
    if (showRequest) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showRequest]);

  const checkAndShowPermissionRequest = async () => {
    if (isExpoGo) {
      return;
    }

    try {
      const dismissed = await AsyncStorage.getItem(
        NOTIFICATION_REQUEST_DISMISSED_KEY,
      );
      if (dismissed === 'true') {
        return;
      }

      const { status } = await Notifications.getPermissionsAsync();

      if (status === 'granted') {
        return;
      }

      setShowRequest(true);
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      setShowRequest(true);
    }
  };

  const handleRequestPermission = async () => {
    if (isExpoGo) {
      Alert.alert(
        'Expo Go Limitation',
        'Push notifications are not available in Expo Go with SDK 53. Use a development build for full functionality.',
        [{ text: 'OK' }],
      );
      return;
    }

    setIsRequesting(true);
    try {
      const permissionStatus = await requestNotificationPermissions();

      if (permissionStatus === 'granted') {
        setShowRequest(false);
        onPermissionGranted?.();
      } else if (permissionStatus === 'unavailable') {
        Alert.alert(
          'Notifications Unavailable',
          'Push notifications are not available in this environment.',
          [{ text: 'OK' }],
        );
        setShowRequest(false);
      } else {
        onPermissionDenied?.();
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      Alert.alert(
        'Error',
        'Failed to request notification permissions. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await AsyncStorage.setItem(NOTIFICATION_REQUEST_DISMISSED_KEY, 'true');
      } catch (error) {
        console.error('Error saving dismiss state:', error);
      }

      setShowRequest(false);
      onPermissionDenied?.();
    });
  };

  if (!showRequest) {
    return null;
  }

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
      className="mx-4 mb-4">
      <View className="bg-white dark:bg-[#141414] rounded-2xl overflow-hidden border border-gray-100 dark:border-[#2A2A2A] shadow-sm">
        {/* Header with gradient accent */}
        <View className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-1" />
        
        <View className="p-4">
          {/* Close button */}
          <TouchableOpacity
            onPress={handleDismiss}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center z-10"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={14} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Icon and Title */}
          <View className="flex-row items-center mb-3">
            <View className="w-11 h-11 rounded-xl bg-cyan-500/10 dark:bg-cyan-400/10 items-center justify-center mr-3">
              <Bell size={22} color="#00BFFF" />
            </View>
            <View className="flex-1 pr-6">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                Stay on Top of Your Finances
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Enable notifications to never miss important updates
              </Text>
            </View>
          </View>

          {/* Feature highlights */}
          <View className="bg-gray-50 dark:bg-[#0A0A0A] rounded-xl p-3 mb-4">
            <FeatureItem
              icon={AlertCircle}
              text="Budget alerts when you're close to limits"
            />
            <FeatureItem
              icon={Calendar}
              text="Subscription & bill payment reminders"
            />
            <FeatureItem
              icon={TrendingUp}
              text="Weekly spending insights & reports"
            />
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleRequestPermission}
              disabled={isRequesting}
              activeOpacity={0.8}
              className="flex-1 bg-[#00BFFF] py-3 rounded-xl items-center justify-center"
              style={{ opacity: isRequesting ? 0.7 : 1 }}>
              <Text className="text-white text-sm font-semibold">
                {isRequesting ? 'Enabling...' : 'Enable Notifications'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDismiss}
              activeOpacity={0.7}
              className="py-3 px-4 rounded-xl items-center justify-center">
              <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
