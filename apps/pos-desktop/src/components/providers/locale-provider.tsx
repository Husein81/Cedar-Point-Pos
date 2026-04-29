import { createContext, useContext, useEffect, useState } from "react";
import { translations, type Locale, type TranslationKey } from "@/i18n/translations";

type LocaleProviderState = {
  locale: Locale;
  isRTL: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey | string) => string;
};

const initialState: LocaleProviderState = {
  locale: "en",
  isRTL: false,
  setLocale: () => null,
  t: (key) => key as string,
};

const LocaleContext = createContext<LocaleProviderState>(initialState);

const LOCALE_STORAGE_KEY = "pos-locale-state";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(
    () => (localStorage.getItem(LOCALE_STORAGE_KEY) as Locale) || "en",
  );

  const isRTL = locale === "ar";

  useEffect(() => {
    const root = window.document.documentElement;
    root.lang = locale;
    root.dir = isRTL ? "rtl" : "ltr";
  }, [locale, isRTL]);

  const setLocale = (newLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    setLocaleState(newLocale);
  };

  const t = (key: TranslationKey | string): string => {
    const dict = translations[locale] as Record<string, string>;
    return dict[key] ?? (key as string);
  };

  return (
    <LocaleContext.Provider value={{ locale, isRTL, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
};
