/**
 * Dashboard header: greeting, account selector, and action buttons (profile, settings, theme, etc.)
 */
import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import {
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  Bell,
  Calendar,
  Search,
  RefreshCw,
  RefreshCcw,
  Globe,
} from "lucide-react-native";
import { useColorScheme } from "~/lib";
import { useTheme } from "~/lib";
import { WalletDropdown } from "./WalletDropdown";
import { useAccount } from "~/lib";
import { useNotifications } from "~/lib";
import { useRouter } from "expo-router";
import { useLanguage } from "~/lib";
import { playTabClickSound } from "~/lib/utils/playTabSound";

interface DashboardHeaderProps {
  variant?: "light" | "dark";
  userName: string;
  userEmail?: string;
  userImageUrl?: string;
  onSettingsPress?: () => void;
  onLogoutPress?: () => void;
  onNotificationPress?: () => void;
  onCalendarPress?: () => void;
  onSearchPress?: () => void;
  onRefreshPress?: () => void;
}

export default function DashboardHeader({
  variant = "dark",
  userName,
  userEmail,
  userImageUrl,
  onSettingsPress,
  onLogoutPress,
  onNotificationPress,
  onCalendarPress,
  onSearchPress,
  onRefreshPress,
}: DashboardHeaderProps) {
  const { selectedAccount } = useAccount();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const { isDarkColorScheme, toggleColorScheme } = useColorScheme();

  const theme = useTheme();
  const { t, language, setLanguage } = useLanguage();

  const isLight = variant === "light";
  const iconColor = isLight ? theme.text : "#fff";
  const avatarBorder = isLight ? theme.border : "#fff";

  return (
    <View className="relative z-50">
      <View
        className="flex-row justify-between items-center py-3"
        style={{ zIndex: 50, paddingHorizontal: isLight ? 0 : 24 }}
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
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: avatarBorder,
              }}
            />
          </View>

          {/* Notification Icon with dynamic badge */}
          <TouchableOpacity
            className="mx-2"
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <View style={{ position: "relative" }}>
              <Bell size={24} color={iconColor} />
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
          <WalletDropdown variant={variant} />
        </View>

        {/* Right Section */}
        <View className="flex-row items-center gap-5">
          <TouchableOpacity
            onPress={() => {
              void playTabClickSound();
              toggleColorScheme();
            }}
          >
            {isDarkColorScheme ? (
              <Sun size={24} color={iconColor} />
            ) : (
              <Moon size={24} color={iconColor} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              void playTabClickSound();
              router.push("/(main)/SettingScreen");
            }}
          >
            <View style={{ position: "relative" }}>
              <Settings size={24} color={iconColor} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
