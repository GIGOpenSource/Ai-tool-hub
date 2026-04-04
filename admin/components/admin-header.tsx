"use client";

import { useRouter } from "next/navigation";
import { LogOut, Shield } from "lucide-react";
import { useAdminStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/context";

export function AdminHeader() {
  const router = useRouter();
  const setToken = useAdminStore((s) => s.setToken);
  const { t, locale, setLocale } = useI18n();

  return (
    <header className="h-14 border-b border-admin-border/80 flex items-center justify-between px-6 bg-admin-surface/85">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Shield className="w-4 h-4 text-admin-accent" />
        <span>{t("header.console")}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="sr-only">{t("header.language")}</span>
          <button
            type="button"
            onClick={() => setLocale("zh")}
            className={
              locale === "zh"
                ? "text-white font-medium"
                : "text-gray-500 hover:text-gray-300"
            }
          >
            中文
          </button>
          <span className="text-gray-600">|</span>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={
              locale === "en"
                ? "text-white font-medium"
                : "text-gray-500 hover:text-gray-300"
            }
          >
            English
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setToken(null);
            router.replace("/login");
          }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t("header.logout")}
        </button>
      </div>
    </header>
  );
}
