import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { apiGet } from "../../lib/api";

/** 与后端 locale_meta / 种子数据支持的语言代码一致 */
export type Language = "en" | "zh" | "ko" | "ja" | "pt" | "es" | "fr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** 按 key 取当前语言文案；无则回退显示 key 本身 */
  t: (key: string) => string;
  /** 是否已从 /api/i18n/{lang} 拉到至少一条消息 */
  i18nReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  /** 当前语言的键值对，来自服务端 */
  const [messages, setMessages] = useState<Record<string, string>>({});

  /** language 变化时重新请求全量文案；卸载或快速切换时用 on 防止 setState 竞态 */
  useEffect(() => {
    let on = true;
    apiGet<Record<string, string>>(`/api/i18n/${language}`)
      .then((m) => {
        if (on) setMessages(m);
      })
      .catch(() => {
        if (on) setMessages({});
      });
    return () => {
      on = false;
    };
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: string) => {
      if (messages[key]) return messages[key];
      return key;
    },
    [messages],
  );

  const i18nReady = Object.keys(messages).length > 0;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, i18nReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
