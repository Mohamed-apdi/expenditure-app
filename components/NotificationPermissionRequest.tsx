import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Bell, X } from "lucide-react-native";
import { requestNotificationPermissions } from "~/lib/services/notificationService";
import { isExpoGo } from "~/lib";
import * as Notifications from "expo-notifications";

interface NotificationPermissionRequestProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export default function NotificationPermissionRequest({
  onPermissionGranted,
  onPermissionDenied,
}: NotificationPermissionRequestProps) {
  const [showRequest, setShowRequest] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if we should show the permission request
    const checkPermissionStatus = async () => {
      // Don't show in Expo Go
      if (isExpoGo) {
        return;
      }

      try {
        // Check current permission status
        const { status } = await Notifications.getPermissionsAsync();

        // Only show request if permission is not granted
        if (status !== "granted") {
          setShowRequest(true);
        }
      } catch (error) {
        console.error("Error checking notification permissions:", error);
        // If we can't check, don't show the request
      }
    };

    checkPermissionStatus();
  }, []);

  const handleRequestPermission = async () => {
    if (isExpoGo) {
      Alert.alert(
        "Expo Go Limitation",
        "Push notifications are not available in Expo Go with SDK 53. Use a development build for full functionality.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsRequesting(true);
    try {
      const permissionStatus = await requestNotificationPermissions();

      if (permissionStatus === "granted") {
        setShowRequest(false);
        onPermissionGranted?.();
        console.log("Notification permissions granted");
      } else if (permissionStatus === "unavailable") {
        Alert.alert(
          "Notifications Unavailable",
          "Push notifications are not available in this environment.",
          [{ text: "OK" }]
        );
        setShowRequest(false);
      } else {
        onPermissionDenied?.();
        console.log("Notification permissions denied");
        // Keep showing the request so user can try again
      }
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      Alert.alert(
        "Error",
        "Failed to request notification permissions. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowRequest(false);
    onPermissionDenied?.();
  };

  if (!showRequest) {
    return null;
  }

  return (
    <View className="mx-4 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start flex-1">
          <View className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full items-center justify-center mr-3">
            <Bell size={20} className="text-blue-600 dark:text-blue-400" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
              Enable Notifications
            </Text>
            <Text className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              Get notified about budget alerts, subscription due dates, and
              important financial updates.
            </Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={handleRequestPermission}
                disabled={isRequesting}
                className="bg-blue-600 dark:bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white text-xs font-medium">
                  {isRequesting ? "Requesting..." : "Enable"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDismiss}
                className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-300 text-xs font-medium">
                  Not Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={handleDismiss} className="ml-2 p-1">
          <X size={16} className="text-blue-600 dark:text-blue-400" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
