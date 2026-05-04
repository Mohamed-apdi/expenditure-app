import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";

export type MainTabFabContextValue = {
  accountsFabPress: MutableRefObject<(() => void) | null>;
  budgetFabPress: MutableRefObject<(() => void) | null>;
};

const MainTabFabContext = createContext<MainTabFabContextValue | null>(null);

export function MainTabFabProvider({ children }: { children: React.ReactNode }) {
  const accountsFabPress = useRef<(() => void) | null>(null);
  const budgetFabPress = useRef<(() => void) | null>(null);
  const value = useMemo(
    () => ({ accountsFabPress, budgetFabPress }),
    [],
  );
  return (
    <MainTabFabContext.Provider value={value}>{children}</MainTabFabContext.Provider>
  );
}

export function useMainTabFabHandlers(): MainTabFabContextValue {
  const ctx = useContext(MainTabFabContext);
  if (!ctx) {
    throw new Error("useMainTabFabHandlers must be used within MainTabFabProvider");
  }
  return ctx;
}
