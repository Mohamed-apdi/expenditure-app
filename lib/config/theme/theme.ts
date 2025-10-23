// lib/theme.ts
import { NAV_THEME } from "./constants";
import { useColorScheme } from "./useColorScheme";

export function useTheme() {
  const { isDarkColorScheme } = useColorScheme();
  return isDarkColorScheme ? NAV_THEME.dark : NAV_THEME.light;
}
