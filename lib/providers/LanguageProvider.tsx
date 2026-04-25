/**
 * Language context: app language state and translations (t), persisted to secure storage
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { LANGUAGES } from "../config/language/languages";
import { saveItem, getItem } from "../config/storage/secureStore";

const LanguageContext = createContext<any>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  /** Default Somali for new installs; persisted `app_language` overrides after first choice. */
  const [language, setLanguage] = useState<keyof typeof LANGUAGES>("so");
  const mounted = useRef(true);

  // Load persisted language
  useEffect(() => {
    mounted.current = true;
    (async () => {
      const saved = await getItem("app_language");
      if (saved && mounted.current) {
        setLanguage(saved as keyof typeof LANGUAGES);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  const updateLanguage = async (lang: keyof typeof LANGUAGES) => {
    if (mounted.current) {
      setLanguage(lang);
    }
    await saveItem("app_language", lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        t: LANGUAGES[language],
        language,
        setLanguage: updateLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
