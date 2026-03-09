import { useColorScheme as useNativewindColorScheme } from "nativewind";
import { useEffect, useRef, useCallback } from "react";
import { saveItem, getItem } from "../storage/secureStore";

export function useColorScheme() {
  const { colorScheme, setColorScheme } = useNativewindColorScheme();
  const mounted = useRef(true);
  const isTogglingRef = useRef(false);

  // Load persisted theme once
  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        const savedTheme = await getItem("app_theme");
        if (savedTheme && mounted.current) {
          setColorScheme(savedTheme as "light" | "dark");
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, [setColorScheme]);

  const toggleColorScheme = useCallback(async () => {
    // Prevent rapid toggling
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;

    try {
      const newTheme = colorScheme === "dark" ? "light" : "dark";
      
      // Set color scheme immediately (don't wait for save)
      setColorScheme(newTheme);
      
      // Save to storage in background
      await saveItem("app_theme", newTheme);
    } catch (error) {
      console.error("Error toggling color scheme:", error);
    } finally {
      // Allow toggling again after a short delay to prevent double-taps
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 300);
    }
  }, [colorScheme, setColorScheme]);

  return {
    colorScheme: colorScheme ?? "light",
    isDarkColorScheme: colorScheme === "dark",
    toggleColorScheme,
  };
}
