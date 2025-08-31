import { useState } from "react";
import { LANGUAGES } from "./languages";

export function useLanguage() {
  const [language, setLanguage] = useState<keyof typeof LANGUAGES>("en");

  return {
    t: (key: keyof (typeof LANGUAGES)["en"]) => LANGUAGES[language][key] || key,
    language,
    setLanguage,
  };
}
