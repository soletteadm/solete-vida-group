import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  type Language,
  type TranslationMap,
  translations,
} from "./translations";

export interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationMap;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "solete_language";
const SUPPORTED: Language[] = ["en", "es", "sv"];

function detectBrowserLanguage(): Language {
  const browserLangs = navigator.languages ?? [navigator.language];
  for (const lang of browserLangs) {
    const code = lang.slice(0, 2).toLowerCase() as Language;
    if (SUPPORTED.includes(code)) {
      return code;
    }
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && SUPPORTED.includes(stored)) {
      return stored;
    }
    return detectBrowserLanguage();
  });

  const setLang = useCallback((newLang: Language) => {
    localStorage.setItem(STORAGE_KEY, newLang);
    setLangState(newLang);
  }, []);

  const value: LanguageContextValue = {
    lang,
    setLang,
    t: translations[lang],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
