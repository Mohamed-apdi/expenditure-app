import { useCallback } from "react";
import { Platform, StatusBar } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../config/theme/theme";

/**
 * Sets status bar style based on screen background so icons are always visible.
 * Use on screens with theme.background - dark icons on light, light on dark.
 * Call once per screen, typically at the top of the component.
 */
export function useScreenStatusBar() {
  const theme = useTheme();

  useFocusEffect(
    useCallback(() => {
      const bg = theme.background ?? "#FFFFFF";
      const isLightBg =
        bg === "#FFFFFF" ||
        bg.toLowerCase() === "#ffffff" ||
        /^#f[fF]{5}$/.test(bg); // #ffffff, #fff, etc.
      StatusBar.setBarStyle(isLightBg ? "dark-content" : "light-content", true);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(bg, true);
      }
    }, [theme.background])
  );
}
