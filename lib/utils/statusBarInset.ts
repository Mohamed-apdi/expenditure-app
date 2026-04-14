import { Platform, StatusBar } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

/**
 * Reliable top inset below the status bar (clock, battery, etc.).
 * On some Android edge-to-edge setups `insets.top` can be 0 while content still
 * draws under the status bar — we fall back to `StatusBar.currentHeight`.
 */
export function statusBarTopInset(insets: EdgeInsets): number {
  const androidH =
    Platform.OS === "android" && typeof StatusBar.currentHeight === "number"
      ? StatusBar.currentHeight
      : 0;
  return Math.max(insets.top, androidH);
}
