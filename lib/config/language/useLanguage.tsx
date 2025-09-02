import { useState } from "react";
import { LANGUAGES } from "./languages";

// Create a type for all possible translation keys
type TranslationKey = keyof (typeof LANGUAGES)["en"];

export function useLanguage() {
  const [language, setLanguage] = useState<keyof typeof LANGUAGES>("en");

  return {
    t: (key: TranslationKey): string => {
      const currentLanguage = LANGUAGES[language];
      return (currentLanguage as any)[key] || key;
    },
    language,
    setLanguage,
  };
}
