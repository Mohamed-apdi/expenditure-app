import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Image, Animated } from "react-native";
import {
  ChevronDown,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  Bell,
  Calendar,
  Search,
  Globe,
} from "lucide-react-native";
import { useColorScheme } from "~/lib/useColorScheme";
import { useTheme } from "~/lib/theme";
import { WalletDropdown } from "./WalletDropdown";
import { useAccount } from "~/lib/AccountContext";

interface DashboardHeaderProps {
  userName: string;
  userEmail?: string;
  userImageUrl?: string;
  onSettingsPress?: () => void;
  onLogoutPress?: () => void;
  onNotificationPress?: () => void;
  onCalendarPress?: () => void;
  onSearchPress?: () => void;
}

export default function DashboardHeader({
  userName,
  userEmail,
  userImageUrl,
  onSettingsPress,
  onLogoutPress,
  onNotificationPress,
  onCalendarPress,
  onSearchPress,
}: DashboardHeaderProps) {
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const { selectedAccount } = useAccount();

  const { isDarkColorScheme, toggleColorScheme } = useColorScheme();

  const theme = useTheme();
  const { t, language, setLanguage } = useLanguage();

  const dropdownAnimation = useRef(new Animated.Value(0)).current;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const firstName = userName?.split(" ")[0] || "User";

  const toggleDropdown = () => {
    const toValue = isDropdownOpen ? 0 : 1;

    setIsDropdownOpen(!isDropdownOpen);

    Animated.parallel([
      Animated.spring(dropdownAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(rotateAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(scaleAnimation, {
        toValue: isDropdownOpen ? 1 : 0.95,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  };

  const closeDropdown = () => {
    if (isDropdownOpen) {
      toggleDropdown();
    }
  };

  const dropdownTranslateY = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  const dropdownOpacity = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const chevronRotate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const menuItems = [
    {
      icon: Settings,
      label: "Settings",
      onPress: onSettingsPress,
    },
    {
      icon: LogOut,
      label: "Sign Out",
      onPress: onLogoutPress,
      isDestructive: true,
    },
  ];

  return (
    <View className="relative z-50">
      {/* Full-screen overlay that closes dropdown when clicked */}
      {isDropdownOpen && (
        <TouchableOpacity
          className="absolute bg-transparent"
          onPress={closeDropdown}
          activeOpacity={1}
          style={{
            top: -1000,
            left: -1000,
            right: -1000,
            bottom: -1000,
            zIndex: 49,
          }}
        />
      )}

      <View
        className="flex-row justify-between items-center px-6 py-5 "
        style={{ zIndex: 50 }}
      >
        {/* Actions Section */}
        <View className="flex-row items-center justify-center gap-4 ">
          {/* Profile Dropdown */}
          <View className="relative">
            <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
              <TouchableOpacity
                className={`flex-row items-center p-1 rounded-2xl gap-2`}
                onPress={toggleDropdown}
                activeOpacity={0.8}
              >
                <Image
                  source={{
                    uri:
                      userImageUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || "User")}`,
                  }}
                  className="w-10 h-10 rounded-full border-2 border-[#3b82f6]"
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Dropdown Menu */}
            <Animated.View
              style={{
                position: "absolute",
                top: 50,
                left: 0,
                minWidth: 240,
                backgroundColor: theme.background,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: dropdownOpacity,
                transform: [{ translateY: dropdownTranslateY }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
                elevation: 8,
                zIndex: 51,
                display: isDropdownOpen ? "flex" : "none",
              }}
            >
              <View className="p-2">
                {/* User Info */}
                <View className="flex-row items-center p-3 gap-3">
                  <Image
                    source={{
                      uri:
                        userImageUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || "User")}`,
                    }}
                    className="w-9 h-9 rounded-full"
                  />
                  <View className="flex-1">
                    <Text
                      className="text-sm font-semibold "
                      style={{ color: theme.text }}
                    >
                      {userName}
                    </Text>
                    <Text
                      className="text-xs  mt-0.5"
                      style={{ color: theme.text }}
                    >
                      {userEmail}
                    </Text>
                  </View>
                </View>

                {/* Separator */}
                <View className="h-px bg-slate-200 my-1" />
                <TouchableOpacity
                  onPress={toggleColorScheme}
                  activeOpacity={0.7}
                  className="flex-row items-center p-3 rounded-lg gap-3 active:bg-slate-50"
                >
                  {isDarkColorScheme ? (
                    <Sun size={18} color="#FFDE21" />
                  ) : (
                    <Moon size={18} color="#D2CFDA" />
                  )}
                  <Text
                    className="text-sm font-medium"
                    style={{ color: theme.text }}
                  >
                    {isDarkColorScheme ? t.lightMode : t.darkMode}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setLanguage(language === "en" ? "so" : "en")}
                  activeOpacity={0.7}
                  className="flex-row items-center p-3 rounded-lg gap-3 active:bg-slate-50"
                >
                  <Globe size={18} color={theme.text} />
                  <Text
                    className="text-sm font-medium"
                    style={{ color: theme.text }}
                  >
                    {t.languages} ({language.toUpperCase()})
                  </Text>
                </TouchableOpacity>

                {/* Menu Items */}
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    className="flex-row items-center p-3 rounded-lg gap-3 active:bg-slate-50"
                    onPress={() => {
                      item.onPress?.();
                      toggleDropdown();
                    }}
                    activeOpacity={0.7}
                  >
                    <item.icon
                      size={18}
                      color={item.isDestructive ? "#ef4444" : theme.text}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: item.isDestructive ? "#ef4444" : theme.text,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </View>
          {/* Notification Icon with red dot */}
          <TouchableOpacity
            className="mx-3"
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <View>
              <Bell size={22} color="#fff" />
              <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </View>
          </TouchableOpacity>
        </View>

        {/*  dropdown */}
        <WalletDropdown />

        <View className="flex-row items-center justify-between px-4 py-3">
          {/* Calendar */}
          <TouchableOpacity className="mx-3" onPress={onCalendarPress}>
            <Calendar size={22} color="#fff" />
          </TouchableOpacity>

          {/* Search */}
          <TouchableOpacity className="ml-3" onPress={onSearchPress}>
            <Search size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
