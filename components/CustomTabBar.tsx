/**
 * Bottom tab bar for main app navigation — floating pill + squircle FAB
 */
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import React from "react";
import {
  LayoutChangeEvent,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage, useTheme } from "~/lib";
import { playTabClickSound } from "~/lib/utils/playTabSound";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

function primaryAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) {
    return `rgba(0,191,255,${alpha})`;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Pill track height; FAB matches width/height. */
const PILL_TRACK_HEIGHT = 68;
const FAB_SIZE = PILL_TRACK_HEIGHT;
/** Square + equal sides = not a circle. Circle: FAB_SIZE / 2. Squircle: ~18–24. */
const FAB_RADIUS = FAB_SIZE / 2;
const PILL_RADIUS = 30;
const H_PADDING = 16;
const PILL_FAB_GAP = 10;
const OUTER_PADDING_TOP = 8;
const OUTER_PADDING_BOTTOM_MIN = 8;
/** Active tab chip: large radius = capsule (20 looked square on a tall icon+label stack). */
const TAB_HIGHLIGHT_RADIUS = 20;

export default function CustomTabBar({ state }: any) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const onTabBarHeightChange = React.useContext(
    BottomTabBarHeightCallbackContext,
  );

  const activeColor = theme.tabActive;
  const activeTabBg = primaryAlpha(theme.primary, theme.isDark ? 0.2 : 0.12);
  const pillBg = theme.isDark ? theme.cardBackground : theme.background;
  const pillBorder = theme.isDark
    ? { borderWidth: 1, borderColor: theme.border }
    : {};

  const tabs = [
    {
      route: "/(main)/Dashboard",
      icon: <Entypo name="home" size={24} color="black" />,
      label: t.home || "Home",
      index: 0,
    },
    {
      route: "/(main)/ReportsScreen",
      icon: <FontAwesome6 name="chart-simple" size={24} color="black" />,
      label: t.reports || "Reports",
      index: 1,
    },
    {
      route: "/(main)/BudgetScreen",
      icon: <Entypo name="wallet" size={24} color="black" />,
      label: t.budgets || "Budget",
      index: 2,
    },
    {
      route: "/(main)/Accounts",
      icon: <MaterialIcons name="account-balance" size={24} color="black" />,
      label: t.accounts || "Accounts",
      index: 3,
    },
  ];

  const pillShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.isDark ? 0.35 : 0.1,
    shadowRadius: 10,
    elevation: 6,
  };

  const fabShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.isDark ? 0.35 : 0.12,
    shadowRadius: 8,
    elevation: 8,
  };

  const paddingBottom = Math.max(insets.bottom, 12) + OUTER_PADDING_BOTTOM_MIN;

  const onLayout = (e: LayoutChangeEvent) => {
    onTabBarHeightChange?.(e.nativeEvent.layout.height);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        height: 0,
        width: "100%",
        overflow: "visible",
        alignSelf: "stretch",
      }}
    >
      <View
        pointerEvents="box-none"
        onLayout={onLayout}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          paddingHorizontal: H_PADDING,
          paddingTop: OUTER_PADDING_TOP,
          paddingBottom,
        }}
      >
        <View
          key={theme.background}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: PILL_FAB_GAP,
          }}
        >
          <View
            collapsable={false}
            needsOffscreenAlphaCompositing={Platform.OS === "android"}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-evenly",
              height: PILL_TRACK_HEIGHT,
              backgroundColor: pillBg,
              borderRadius: PILL_RADIUS,
              paddingHorizontal: 4,
              overflow: "hidden",
              ...pillShadow,
              ...pillBorder,
            }}
          >
            {tabs.map((tab) => {
              const isActive = state.index === tab.index;
              const iconColor = isActive ? activeColor : theme.textMuted;

              const iconContent = React.isValidElement(tab.icon)
                ? React.cloneElement(
                    tab.icon as React.ReactElement<{
                      size?: number;
                      color?: string;
                    }>,
                    {
                      size: 22,
                      color: iconColor,
                    },
                  )
                : null;

              return (
                <TouchableOpacity
                  key={tab.route}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 2,
                  }}
                  onPress={() => {
                    void playTabClickSound();
                    router.push(tab.route as any);
                  }}
                >
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 5,
                      paddingHorizontal: 8,
                      borderRadius: TAB_HIGHLIGHT_RADIUS,
                      overflow: "hidden",
                      backgroundColor: isActive ? activeTabBg : "transparent",
                      minWidth: 52,
                    }}
                  >
                    {iconContent}
                    <Text
                      style={{
                        fontSize: 10,
                        marginTop: 2,
                        fontWeight: isActive ? "600" : "400",
                        color: isActive ? activeColor : theme.textMuted,
                      }}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              void playTabClickSound();
              router.push("/(expense)/AddExpense");
            }}
            style={{
              width: FAB_SIZE,
              height: FAB_SIZE,
              borderRadius: FAB_RADIUS,
              overflow: "hidden",
              backgroundColor: theme.primary,
              justifyContent: "center",
              alignItems: "center",
              ...fabShadow,
            }}
          >
            <Plus size={30} color={theme.primaryText} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
