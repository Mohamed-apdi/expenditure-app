import { useColorScheme as useNativewindColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { saveItem, getItem } from "./storageDarkAnd-Languages";

export function useColorScheme() {
  const { colorScheme, setColorScheme } = useNativewindColorScheme();
  const mounted = useRef(true);

  // Load persisted theme once
  useEffect(() => {
    mounted.current = true;
    (async () => {
      const savedTheme = await getItem("app_theme");
      if (savedTheme && mounted.current) {
        setColorScheme(savedTheme as "light" | "dark");
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, [setColorScheme]);

  const toggleColorScheme = async () => {
    const newTheme = colorScheme === "dark" ? "light" : "dark";
    if (mounted.current) {
      setColorScheme(newTheme);
    }
    await saveItem("app_theme", newTheme);
  };

  return {
    colorScheme: colorScheme ?? "light",
    isDarkColorScheme: colorScheme === "dark",
    toggleColorScheme,
  };
}
