import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { apiGet } from "../../lib/api";

/** 与后端 locale_meta / 种子数据支持的语言代码一致 */
export type Language = "en" | "zh" | "ko" | "ja" | "pt" | "es" | "fr";

/** localStorage 键：与 ErrorBoundary 等无 Context 场景共享，用于崩溃页语言 */
const LANG_STORAGE_KEY = "ai_nav_language";

/** 合法语言列表，用于解析存储值 */
const SUPPORTED_LANGS: readonly Language[] = ["en", "zh", "ko", "ja", "pt", "es", "fr"];

/** 判断字符串是否为受支持的语言代码 */
function isLanguageCode(x: string): x is Language {
  return (SUPPORTED_LANGS as readonly string[]).includes(x);
}

/**
 * 读取用户上次选择的界面语言（客户端）；SSR 或无存储时回退 en。
 * 供 ErrorBoundary 等在 Provider 外渲染的组件使用。
 */
export function readPreferredLanguage(): Language {
  if (typeof window === "undefined") return "en"; // 构建/非浏览器环境
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY); // 读取持久化语言
    if (raw && isLanguageCode(raw)) return raw; // 合法则采用
  } catch {
    /* 无痕模式等下 localStorage 可能抛错，忽略 */
  }
  return "en"; // 无存储或非法值时默认英文
}

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
  const [language, setLanguageState] = useState<Language>(() => readPreferredLanguage()); // 首屏与上次选择一致
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
    setLanguageState(lang); // 更新 React 状态
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang); // 供 ErrorBoundary 等读取
    } catch {
      /* 同上，持久化失败不影响切换 */
    }
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
