"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 拉取与保存 site_json.submit
import { useEffect, useMemo, useState } from "react"; // 表单与合并载荷
import { ClipboardList } from "lucide-react"; // 页头图标
import { useAdminStore } from "@/lib/store"; // JWT
import { apiGET, apiPUT } from "@/lib/admin-api"; // /api/admin/site-json/submit
import { useI18n } from "@/lib/i18n/context"; // 侧栏文案键

const SUBMIT_KEY = "submit" as const; // 与后端 _ALLOWED_KEYS、GET /api/submit-options 一致

/** 分类 slug 每行一条，空行忽略 */
function linesToSlugs(text: string): string[] {
  return text
    .split(/\r?\n/) // 支持 CRLF
    .map((s) => s.trim()) // 去首尾空白
    .filter(Boolean); // 去掉空行
}

export default function AdminSiteSubmitPage() {
  const token = useAdminStore((s) => s.token)!; // Shell 保证已登录
  const { locale, t } = useI18n(); // 管理端语言
  const qc = useQueryClient(); // 失效缓存
  const [fullPayload, setFullPayload] = useState<Record<string, unknown>>({}); // 除三主块外原样保留
  const [categoryLines, setCategoryLines] = useState(""); // category_slugs 文本
  const [pricingLines, setPricingLines] = useState(""); // pricing_options 文本
  const [uiText, setUiText] = useState("{}"); // ui 对象 JSON

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "site-json", SUBMIT_KEY, token] as const,
    queryFn: () => apiGET<{ payload: Record<string, unknown>; exists: boolean }>(`/api/admin/site-json/${SUBMIT_KEY}`, token),
    enabled: !!token,
  });

  useEffect(() => {
    if (!data) return; // 等首包
    const p = data.payload ?? {}; // 服务端对象
    setFullPayload({ ...p }); // 保留未知顶层键
    const cs = p.category_slugs; // 分类顺序
    setCategoryLines(Array.isArray(cs) ? cs.filter((x): x is string => typeof x === "string").join("\n") : ""); // 多行文本
    const po = p.pricing_options; // 定价选项
    setPricingLines(Array.isArray(po) ? po.filter((x): x is string => typeof x === "string").join("\n") : ""); // 每行一项
    try {
      setUiText(JSON.stringify((p.ui && typeof p.ui === "object" && !Array.isArray(p.ui) ? p.ui : {}) as object, null, 2)); // ui 缩进
    } catch {
      setUiText("{}"); // 解析失败回落
    }
  }, [data]);

  const prettyError = useMemo(() => (error instanceof Error ? error.message : ""), [error]);

  const save = useMutation({
    mutationFn: async () => {
      let uiObj: Record<string, unknown>; // 解析后 ui
      try {
        const raw = JSON.parse(uiText) as unknown; // 用户编辑的 ui
        if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("ui"); // 须对象
        uiObj = raw as Record<string, unknown>; // 写入
      } catch {
        throw new Error(locale === "zh" ? "ui 须为合法 JSON 对象" : "ui must be a JSON object"); // 校验失败
      }
      const merged = {
        ...fullPayload, // 其它键不丢
        category_slugs: linesToSlugs(categoryLines), // 列表
        pricing_options: linesToSlugs(pricingLines), // 与 slug 同形处理
        ui: uiObj, // 整包 ui
      };
      return apiPUT(`/api/admin/site-json/${SUBMIT_KEY}`, token, { payload: merged });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "site-json", SUBMIT_KEY] }),
  });

  const hint =
    locale === "zh"
      ? "对应 GET /api/submit-options 与前台提交页。完整键仍可走「站点 JSON」。"
      : "Powers GET /api/submit-options and SubmitToolPage. Use Site JSON for uncommon top-level keys.";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <ClipboardList className="w-7 h-7 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("sidebar.siteSubmitForm")}</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">{hint}</p>
        </div>
      </div>

      {isLoading && <p className="text-gray-500 text-sm">…</p>}
      {prettyError && <p className="text-rose-400 text-sm">{prettyError}</p>}

      <div className="space-y-4 max-w-3xl">
        <label className="block text-xs text-gray-400">
          category_slugs（每行一个 slug，顺序即前台下拉顺序）
          <textarea
            className="mt-1 w-full min-h-[120px] rounded-lg border border-purple-500/30 bg-[#0a011890] px-3 py-2 text-sm text-white font-mono"
            spellCheck={false}
            value={categoryLines}
            onChange={(e) => setCategoryLines(e.target.value)}
          />
        </label>
        <label className="block text-xs text-gray-400">
          pricing_options（每行一项）
          <textarea
            className="mt-1 w-full min-h-[80px] rounded-lg border border-purple-500/30 bg-[#0a011890] px-3 py-2 text-sm text-white font-mono"
            spellCheck={false}
            value={pricingLines}
            onChange={(e) => setPricingLines(e.target.value)}
          />
        </label>
        <label className="block text-xs text-gray-400">
          ui（JSON 对象：page_title、guidelines 等）
          <textarea
            className="mt-1 w-full min-h-[280px] rounded-lg border border-purple-500/30 bg-[#0a011890] px-3 py-2 text-sm text-gray-100 font-mono"
            spellCheck={false}
            value={uiText}
            onChange={(e) => setUiText(e.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {save.isPending ? t("siteJson.saving") : t("siteJson.save")}
      </button>
      {save.isError && <p className="text-rose-400 text-sm">{(save.error as Error).message}</p>}
      {save.isSuccess && <p className="text-emerald-400 text-sm">{t("siteJson.success")}</p>}
    </div>
  );
}
