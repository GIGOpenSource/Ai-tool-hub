"use client";

/**
 * 管理端登录：与普通用户共用 POST /api/auth/login，前端额外校验 role===admin。
 * Token 存入 zustand persist，后续请求经 admin-api 带 Bearer。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FieldHint } from "@/components/field-hint";
import { useAdminStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/context";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const setToken = useAdminStore((s) => s.setToken);
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data?.detail;
        const msg =
          typeof d === "string"
            ? d
            : Array.isArray(d)
              ? d.map((x: { msg?: string }) => x.msg).filter(Boolean).join(", ") || t("login.errLoginFailed")
              : t("login.errLoginFailed");
        throw new Error(msg);
      }
      if (data.role !== "admin") {
        setErr(t("login.errAdminRequired"));
        return;
      }
      setToken(data.access_token);
      router.replace("/admin/dashboard");
    } catch {
      setErr(t("login.errFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-admin-bg via-zinc-950 to-admin-bg flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 p-8 rounded-2xl border border-admin-border/90 bg-admin-surface/80"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">{t("login.title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("login.hint")}</p>
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setLocale("zh")}
              className={locale === "zh" ? "text-white font-medium" : "text-gray-500 hover:text-gray-300"}
            >
              中文
            </button>
            <span className="text-gray-600">|</span>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={locale === "en" ? "text-white font-medium" : "text-gray-500 hover:text-gray-300"}
            >
              EN
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t("login.email")}</label>
          <FieldHint text={t("fieldHelp.login.email")} />
          <input
            className="w-full rounded-lg bg-black/40 border border-admin-border px-3 py-2 text-sm text-white mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t("login.password")}</label>
          <FieldHint text={t("fieldHelp.login.password")} />
          <input
            type="password"
            className="w-full rounded-lg bg-black/40 border border-admin-border px-3 py-2 text-sm text-white mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-admin-btn to-zinc-700 hover:from-admin-btn-hover hover:to-zinc-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}
