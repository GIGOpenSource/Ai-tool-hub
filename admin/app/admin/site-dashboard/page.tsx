"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // site_json.dashboard 分字段
import { useEffect, useMemo, useState } from "react"; // 多段 JSON 与合并
import { LayoutTemplate } from "lucide-react"; // 页头图标
import { useAdminStore } from "@/lib/store"; // JWT
import { apiGET, apiPUT } from "@/lib/admin-api"; // 白名单 PUT
import { useI18n } from "@/lib/i18n/context"; // 文案

const DASH_KEY = "dashboard" as const; // 与 /api/dashboard-data 读取键一致

/** 解析须为 JSON 数组，失败抛错给 mutation */
function parseJsonArray(text: string, label: string): unknown[] {
  const raw = JSON.parse(text) as unknown; // 语法校验
  if (!Array.isArray(raw)) throw new Error(`${label}: expected JSON array`); // 类型不对
  return raw; // 原样数组（后端再跑 dashboard schema）
}

export default function AdminSiteDashboardPage() {
  const token = useAdminStore((s) => s.token)!; // 已登录
  const { locale, t } = useI18n(); // 语言
  const qc = useQueryClient(); // 缓存
  const [fullPayload, setFullPayload] = useState<Record<string, unknown>>({}); // 保留 my_tools 等
  const [b0, setB0] = useState(""); // 徽章 1
  const [b1, setB1] = useState(""); // 徽章 2
  const [b2, setB2] = useState(""); // 徽章 3
  const [b3, setB3] = useState(""); // 徽章 4
  const [views, setViews] = useState(""); // summary_numbers.views
  const [clicks, setClicks] = useState(""); // clicks
  const [rating, setRating] = useState(""); // rating
  const [ctr, setCtr] = useState(""); // ctr
  const [uiText, setUiText] = useState("{}"); // ui 块 JSON
  const [pvText, setPvText] = useState("[]"); // page_views_data
  const [ratingsText, setRatingsText] = useState("[]"); // ratings_data
  const [catPerfText, setCatPerfText] = useState("[]"); // category_performance

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "site-json", DASH_KEY, token] as const,
    queryFn: () => apiGET<{ payload: Record<string, unknown>; exists: boolean }>(`/api/admin/site-json/${DASH_KEY}`, token),
    enabled: !!token,
  });

  useEffect(() => {
    if (!data) return; // 等数据
    const p = data.payload ?? {}; // 载荷
    setFullPayload({ ...p }); // 拷贝
    const badges = Array.isArray(p.stat_badges) ? p.stat_badges.filter((x): x is string => typeof x === "string") : []; // 字符串徽章
    setB0(badges[0] ?? ""); // 格 1
    setB1(badges[1] ?? ""); // 格 2
    setB2(badges[2] ?? ""); // 格 3
    setB3(badges[3] ?? ""); // 格 4
    const sn = p.summary_numbers; // 摘要
    const snObj = sn && typeof sn === "object" && !Array.isArray(sn) ? (sn as Record<string, unknown>) : {}; // 对象
    setViews(String(snObj.views ?? "")); // 展示串
    setClicks(String(snObj.clicks ?? ""));
    setRating(String(snObj.rating ?? ""));
    setCtr(String(snObj.ctr ?? ""));
    try {
      setUiText(JSON.stringify((p.ui && typeof p.ui === "object" && !Array.isArray(p.ui) ? p.ui : {}) as object, null, 2)); // ui
    } catch {
      setUiText("{}"); // 回落
    }
    try {
      setPvText(JSON.stringify(Array.isArray(p.page_views_data) ? p.page_views_data : [], null, 2)); // 浏览序列
    } catch {
      setPvText("[]"); // 空数组
    }
    try {
      setRatingsText(JSON.stringify(Array.isArray(p.ratings_data) ? p.ratings_data : [], null, 2)); // 评分序列
    } catch {
      setRatingsText("[]"); // 默认
    }
    try {
      setCatPerfText(JSON.stringify(Array.isArray(p.category_performance) ? p.category_performance : [], null, 2)); // 分类表现
    } catch {
      setCatPerfText("[]"); // 默认
    }
  }, [data]);

  const prettyError = useMemo(() => (error instanceof Error ? error.message : ""), [error]);

  const save = useMutation({
    mutationFn: async () => {
      let uiObj: Record<string, unknown>; // ui
      try {
        const u = JSON.parse(uiText) as unknown; // 解析
        if (u === null || typeof u !== "object" || Array.isArray(u)) throw new Error("ui"); // 须对象
        uiObj = u as Record<string, unknown>; // 赋值
      } catch {
        throw new Error(locale === "zh" ? "ui 须为合法 JSON 对象" : "ui must be a JSON object"); // 提示
      }
      const pv = parseJsonArray(pvText, "page_views_data"); // 图表 1
      const rd = parseJsonArray(ratingsText, "ratings_data"); // 图表 2
      const cp = parseJsonArray(catPerfText, "category_performance"); // 图表 3
      const merged = {
        ...fullPayload, // my_tools 等保留
        stat_badges: [b0, b1, b2, b3], // 四格（前台会截断/占位）
        summary_numbers: { views, clicks, rating, ctr }, // 摘要对象
        ui: uiObj, // 文案块
        page_views_data: pv, // 序列
        ratings_data: rd, // 序列
        category_performance: cp, // 序列
      };
      return apiPUT(`/api/admin/site-json/${DASH_KEY}`, token, { payload: merged });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "site-json", DASH_KEY] }),
  });

  const hint =
    locale === "zh"
      ? "对应 GET /api/dashboard-data 静态壳；登录用户真实 my_tools 由后端合并覆盖。图表列为 JSON 数组。"
      : "Static shell for GET /api/dashboard-data; logged-in my_tools still merged server-side. Chart fields are JSON arrays.";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <LayoutTemplate className="w-7 h-7 text-admin-link shrink-0 mt-0.5" />
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("sidebar.siteDashboardForm")}</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">{hint}</p>
        </div>
      </div>

      {isLoading && <p className="text-gray-500 text-sm">…</p>}
      {prettyError && <p className="text-rose-400 text-sm">{prettyError}</p>}

      <div className="space-y-4 max-w-3xl">
        <p className="text-xs text-gray-400">stat_badges（四项）</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <input className="rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-white" value={b0} onChange={(e) => setB0(e.target.value)} placeholder="badge 1" />
          <input className="rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-white" value={b1} onChange={(e) => setB1(e.target.value)} placeholder="badge 2" />
          <input className="rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-white" value={b2} onChange={(e) => setB2(e.target.value)} placeholder="badge 3" />
          <input className="rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-white" value={b3} onChange={(e) => setB3(e.target.value)} placeholder="badge 4" />
        </div>
        <p className="text-xs text-gray-400">summary_numbers</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <input className="rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-white" value={views} onChange={(e) => setViews(e.target.value)} placeholder="views" />
          <input className="rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-white" value={clicks} onChange={(e) => setClicks(e.target.value)} placeholder="clicks" />
          <input className="rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-white" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="rating" />
          <input className="rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-white" value={ctr} onChange={(e) => setCtr(e.target.value)} placeholder="ctr" />
        </div>
        <label className="block text-xs text-gray-400">
          ui（JSON 对象）
          <textarea className="mt-1 w-full min-h-[200px] rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-gray-100 font-mono" spellCheck={false} value={uiText} onChange={(e) => setUiText(e.target.value)} />
        </label>
        <label className="block text-xs text-gray-400">
          page_views_data（JSON 数组）
          <textarea className="mt-1 w-full min-h-[140px] rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-gray-100 font-mono" spellCheck={false} value={pvText} onChange={(e) => setPvText(e.target.value)} />
        </label>
        <label className="block text-xs text-gray-400">
          ratings_data（JSON 数组）
          <textarea className="mt-1 w-full min-h-[120px] rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-gray-100 font-mono" spellCheck={false} value={ratingsText} onChange={(e) => setRatingsText(e.target.value)} />
        </label>
        <label className="block text-xs text-gray-400">
          category_performance（JSON 数组）
          <textarea className="mt-1 w-full min-h-[120px] rounded-lg border border-admin-border bg-admin-bg/90 px-3 py-2 text-sm text-gray-100 font-mono" spellCheck={false} value={catPerfText} onChange={(e) => setCatPerfText(e.target.value)} />
        </label>
      </div>

      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="rounded-lg bg-gradient-to-r from-admin-btn to-zinc-700 hover:from-admin-btn-hover hover:to-zinc-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {save.isPending ? t("siteJson.saving") : t("siteJson.save")}
      </button>
      {save.isError && <p className="text-rose-400 text-sm">{(save.error as Error).message}</p>}
      {save.isSuccess && <p className="text-emerald-400 text-sm">{t("siteJson.success")}</p>}
    </div>
  );
}
