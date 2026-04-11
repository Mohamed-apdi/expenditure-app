import { useColorScheme as useNativewindColorScheme } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Appearance } from "react-native";
import { saveItem, getItem } from "../storage/secureStore";

export type ThemePreference = "light" | "dark" | "system";

function getSystemColorScheme(): "light" | "dark" {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export type AppColorSchemeContextValue = {
  colorScheme: "light" | "dark";
  isDarkColorScheme: boolean;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => Promise<void>;
  toggleColorScheme: () => Promise<void>;
};

const AppColorSchemeContext = createContext<AppColorSchemeContextValue | null>(
  null,
);

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const { setColorScheme: setNativewindScheme } = useNativewindColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">(
    getSystemColorScheme,
  );
  const hasLoadedRef = useRef(false);
  const isTogglingRef = useRef(false);

  const effectiveScheme: "light" | "dark" =
    preference === "system" ? systemScheme : preference;

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
      const resolved = value === "system" ? getSystemColorScheme() : value;
      setNativewindScheme(resolved);
      try {
        await saveItem("app_theme", value);
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    },
    [setNativewindScheme],
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

  const value = useMemo<AppColorSchemeContextValue>(
    () => ({
      colorScheme: effectiveScheme,
      isDarkColorScheme: effectiveScheme === "dark",
      preference,
      setPreference,
      toggleColorScheme,
    }),
    [effectiveScheme, preference, setPreference, toggleColorScheme],
  );

  return (
    <AppColorSchemeContext.Provider value={value}>
      {children}
    </AppColorSchemeContext.Provider>
  );
}

export function useColorScheme(): AppColorSchemeContextValue {
  const ctx = useContext(AppColorSchemeContext);
  if (ctx == null) {
    throw new Error(
      "useColorScheme must be used within ColorSchemeProvider (wrap app root in _layout).",
    );
  }
  return ctx;
}
