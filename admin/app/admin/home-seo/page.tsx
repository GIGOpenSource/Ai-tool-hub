"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 服务端状态
import { useEffect, useMemo, useState } from "react"; // 表单与合并后整包 JSON
import { useAdminStore } from "@/lib/store"; // JWT
import { apiGET, apiPUT } from "@/lib/admin-api"; // site-json 白名单
import { useI18n } from "@/lib/i18n/context"; // 侧栏/按钮文案
import { Search } from "lucide-react"; // 标题图标

const HOME_SEO_KEY = "home_seo" as const; // 与后端 _ALLOWED_KEYS 一致

export default function AdminHomeSeoPage() {
  const token = useAdminStore((s) => s.token)!; // Shell 保证已登录
  const { locale, t } = useI18n(); // 管理端语言与 t
  const qc = useQueryClient(); // 失效缓存
  const [fullPayload, setFullPayload] = useState<Record<string, unknown>>({}); // 除分字段外的键原样保留
  const [brandTitle, setBrandTitle] = useState(""); // 顶栏/品牌标题
  const [keywords, setKeywords] = useState(""); // meta keywords 长串
  const [brandIconEmoji, setBrandIconEmoji] = useState(""); // 顶栏品牌旁 emoji（空则前台用默认 Sparkles）

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "site-json", HOME_SEO_KEY, token] as const,
    queryFn: () => apiGET<{ payload: Record<string, unknown>; exists: boolean }>(`/api/admin/site-json/${HOME_SEO_KEY}`, token),
    enabled: !!token,
  });

  useEffect(() => {
    if (!data) return; // 等首包
    const p = data.payload ?? {}; // 运营已有 JSON
    setFullPayload({ ...p }); // 浅拷贝为基底
    setBrandTitle(String(p.brand_title ?? "")); // 分字段之一
    setKeywords(String(p.keywords ?? "")); // 分字段之二
    setBrandIconEmoji(String(p.brand_icon_emoji ?? "")); // 顶栏图标：站点 JSON 键 brand_icon_emoji
  }, [data]);

  const prettyError = useMemo(() => (error instanceof Error ? error.message : ""), [error]);

  const save = useMutation({
    mutationFn: async () => {
      const merged = { ...fullPayload, brand_title: brandTitle, keywords, brand_icon_emoji: brandIconEmoji }; // 写回分字段
      return apiPUT(`/api/admin/site-json/${HOME_SEO_KEY}`, token, { payload: merged });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "site-json", HOME_SEO_KEY] });
    },
  });

  const hint =
    locale === "zh"
      ? "仅暴露高危字段；其它键从种子继承后仍在 JSON 中保留。完整编辑可走「站点 JSON」。"
      : "Only high-impact fields are exposed; other keys stay in the stored object. Use Site JSON for full editing.";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Search className="w-7 h-7 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("sidebar.homeSeoForm")}</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">{hint}</p>
        </div>
      </div>

      {isLoading && <p className="text-gray-500 text-sm">…</p>}
      {prettyError && <p className="text-rose-400 text-sm">{prettyError}</p>}

      <div className="space-y-4 max-w-xl">
        <label className="block text-xs text-gray-400">
          brand_icon_emoji（空=前台默认图标）
          <input
            className="mt-1 w-full rounded-lg border border-purple-500/30 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={brandIconEmoji}
            onChange={(e) => setBrandIconEmoji(e.target.value)}
            placeholder="✨"
          />
        </label>
        <label className="block text-xs text-gray-400">
          brand_title
          <input
            className="mt-1 w-full rounded-lg border border-purple-500/30 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={brandTitle}
            onChange={(e) => setBrandTitle(e.target.value)}
          />
        </label>
        <label className="block text-xs text-gray-400">
          keywords
          <textarea
            className="mt-1 w-full min-h-[120px] rounded-lg border border-purple-500/30 bg-[#0a011890] px-3 py-2 text-sm text-white font-mono"
            spellCheck={false}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {save.isPending ? "…" : locale === "zh" ? "保存" : "Save"}
      </button>
      {save.isError && (
        <p className="text-rose-400 text-sm">{save.error instanceof Error ? save.error.message : "err"}</p>
      )}
    </div>
  );
}
