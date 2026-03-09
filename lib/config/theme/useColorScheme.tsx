import { useColorScheme as useNativewindColorScheme } from "nativewind";
import { useEffect, useRef, useCallback, useState } from "react";
import { Appearance } from "react-native";
import { saveItem, getItem } from "../storage/secureStore";

export type ThemePreference = "light" | "dark" | "system";

function getSystemColorScheme(): "light" | "dark" {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export function useColorScheme() {
  const { setColorScheme: setNativewindScheme } = useNativewindColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">(
    getSystemColorScheme
  );
  const hasLoadedRef = useRef(false);
  const isTogglingRef = useRef(false);

  const effectiveScheme: "light" | "dark" =
    preference === "system" ? systemScheme : preference;

  // Load persisted theme once on mount; never overwrite after so toggle isn't reverted
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    (async () => {
      try {
        const saved = await getItem("app_theme");
        if (saved === "light" || saved === "dark" || saved === "system") {
          setPreferenceState(saved);
          const resolved =
            saved === "system" ? getSystemColorScheme() : saved;
          setNativewindScheme(resolved);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    })();
  }, [setNativewindScheme]);

  // Listen to system theme when preference is "system"
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      const next = colorScheme === "dark" ? "dark" : "light";
      setSystemScheme(next);
      if (preference === "system") {
        setNativewindScheme(next);
      }
    });
    return () => sub.remove();
  }, [preference, setNativewindScheme]);

  const setPreference = useCallback(
    async (value: ThemePreference) => {
      setPreferenceState(value);
      const resolved =
        value === "system" ? getSystemColorScheme() : value;
      setNativewindScheme(resolved);
      try {
        await saveItem("app_theme", value);
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    },
    [setNativewindScheme]
  );

  const toggleColorScheme = useCallback(async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    try {
      const next: ThemePreference =
        effectiveScheme === "dark" ? "light" : "dark";
      setPreferenceState(next);
      setNativewindScheme(next);
      try {
        await saveItem("app_theme", next);
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 300);
    }
  }, [effectiveScheme, setNativewindScheme]);

  return {
    colorScheme: effectiveScheme,
    isDarkColorScheme: effectiveScheme === "dark",
    preference,
    setPreference,
    toggleColorScheme,
  };
}
