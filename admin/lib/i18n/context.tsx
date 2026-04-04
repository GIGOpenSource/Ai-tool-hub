"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type AdminLocale, resolveMessage } from "./messages";

const STORAGE_KEY = "admin_locale";

type Params = Record<string, string | number | undefined>;

type I18nValue = {
  locale: AdminLocale;
  setLocale: (l: AdminLocale) => void;
  t: (path: string, params?: Params) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>("zh");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "en" || raw === "zh") setLocaleState(raw);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale, hydrated]);

  const setLocale = useCallback((l: AdminLocale) => setLocaleState(l), []);

  const t = useCallback(
    (path: string, params?: Params) => {
      let s = resolveMessage(locale, path);
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) {
            const ph = `{${k}}`;
            s = s.split(ph).join(String(v));
          }
        }
      }
      return s;
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
