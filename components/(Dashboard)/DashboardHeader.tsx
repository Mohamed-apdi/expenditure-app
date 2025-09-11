import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Settings, Sun, Moon, Bell } from "lucide-react-native";
import { useColorScheme } from "~/lib";
import { WalletDropdown } from "./WalletDropdown";
import { useNotifications } from "~/lib";
import { useRouter } from "expo-router";

interface DashboardHeaderProps {
  userName: string;
  userImageUrl?: string;
  onNotificationPress?: () => void;
}

export default function DashboardHeader({
  userName,
  userImageUrl,
  onNotificationPress,
}: DashboardHeaderProps) {
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const { isDarkColorScheme, toggleColorScheme } = useColorScheme();

  return (
    <View className="relative z-50">
      <View
        className="flex-row justify-between items-center px-6 py-5"
        style={{ zIndex: 50 }}
      >
        {/* Left Section - Profile and Actions */}
        <View className="flex-row items-center gap-4">
          {/* Profile Image */}
          <View className="relative">
            <Image
              source={{
                uri:
                  userImageUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || "User")}`,
              }}
              className="w-10 h-10 rounded-full border-2 border-white"
            />
          </View>

          {/* Notification Icon with dynamic badge */}
          <TouchableOpacity
            className="mx-2"
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <View style={{ position: "relative" }}>
              <Bell size={24} color="#fff" />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    backgroundColor: "#ef4444",
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 11,
                      fontWeight: "600",
                      lineHeight: 16,
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount.toString()}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Center Section - Wallet Dropdown */}
        <View className="flex-1 items-center">
          <WalletDropdown />
        </View>

        {/* Right Section - Calendar and Search */}
        <View className="flex-row items-center gap-5">
          {/*Dark mode toggle*/}
          <TouchableOpacity onPress={toggleColorScheme}>
            {isDarkColorScheme ? (
              <Sun size={24} color="#fff" />
            ) : (
              <Moon size={24} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(main)/SettingScreen")}
          >
            <View style={{ position: "relative" }}>
              <Settings size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
