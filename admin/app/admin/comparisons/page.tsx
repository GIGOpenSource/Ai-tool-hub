"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 列表与保存
import { useEffect, useMemo, useRef, useState } from "react"; // 可视化草稿与 ref 合并矩阵
import { useAdminStore } from "@/lib/store"; // JWT
import { apiGET, apiPUT } from "@/lib/admin-api"; // /api/admin/comparison-pages
import { useI18n } from "@/lib/i18n/context"; // 文案
import {
  ComparisonVisualEditor,
  type ComparisonVisualEditorHandle,
} from "@/components/comparison-visual-editor"; // 对比页表单

/** 顶层须为对象 */
function normalizeDraft(raw: unknown): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {}; // 非法则空
  return raw as Record<string, unknown>; // 编辑器绑定
}

/** 新建对比页时的空模板（与前台 ComparisonPayload 字段对齐） */
function emptyComparisonPayload(): Record<string, unknown> {
  return {
    mainTool: { name: "", logo: "", developer: "", rating: 0, pricing: "", description: "" },
    alternatives: [],
    features: [],
    pros: {},
    cons: {},
    seo_title_suffix: "",
    seo_intro: "",
    seo_chooser_title: "",
    seo_chooser_intro: "",
    seo_cards: [],
    footer_note: "",
  };
}

export default function AdminComparisonsPage() {
  const token = useAdminStore((s) => s.token)!; // 登录态
  const { t } = useI18n(); // comparisonAdmin + 通用
  const qc = useQueryClient(); // 缓存
  const visualRef = useRef<ComparisonVisualEditorHandle>(null); // 保存前合并矩阵 JSON
  const [slug, setSlug] = useState(""); // 当前 slug
  const [jsonText, setJsonText] = useState("{}"); // JSON 标签文本
  const [editMode, setEditMode] = useState<"visual" | "json">("visual"); // 编辑模式
  const [draft, setDraft] = useState<Record<string, unknown>>({}); // 可视化草稿
  const [draftNonce, setDraftNonce] = useState(0); // 刷新子组件矩阵区

  const slugsKey = ["admin", "comparison-slugs", token] as const; // slug 列表键
  const { data: slugData } = useQuery({
    queryKey: slugsKey,
    queryFn: () => apiGET<{ slugs: string[] }>("/api/admin/comparison-pages", token),
    enabled: !!token,
  });

  const oneKey = ["admin", "comparison-one", slug, token] as const; // 单页键
  const { data: one, isLoading, isError, error } = useQuery({
    queryKey: oneKey,
    queryFn: () => apiGET<{ slug: string; payload: Record<string, unknown> }>(`/api/admin/comparison-pages/${encodeURIComponent(slug)}`, token),
    enabled: !!token && !!slug,
    retry: false, // 404 不狂重试
  });

  const is404 = useMemo(() => (error instanceof Error ? error.message.includes(" 404") : false), [error]); // GET 无行

  useEffect(() => {
    if (!slug) {
      setJsonText("{}"); // 无 slug 清空
      setDraft({}); // 草稿清空
      return;
    }
    if (one) {
      const p = one.payload ?? {}; // 服务端载荷
      setDraft(normalizeDraft(p)); // 可视化
      try {
        setJsonText(JSON.stringify(p, null, 2)); // JSON 区
      } catch {
        setJsonText("{}"); // 回落
      }
      setDraftNonce((n) => n + 1); // 子组件同步矩阵文本
      return;
    }
    if (!isLoading && (is404 || isError)) {
      const empty = emptyComparisonPayload(); // 新建模板
      setDraft(empty); // 可填后保存即 upsert
      setJsonText(JSON.stringify(empty, null, 2)); // JSON 同步
      setDraftNonce((n) => n + 1); // 刷新矩阵区
    }
  }, [one, slug, isLoading, is404, isError]); // 拉包或 404 模板

  const serverSyncSig = useMemo(
    () => `${slug}|${one ? JSON.stringify(one.payload) : ""}|${draftNonce}`,
    [slug, one, draftNonce],
  ); // 子编辑器节拍

  const save = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, unknown>; // 待写入
      if (editMode === "visual") {
        const merged = visualRef.current?.buildPayloadForSave(); // 含最新 features/pros/cons 文本
        if (!merged) throw new Error(t("comparisonAdmin.errJson")); // 矩阵 JSON 非法
        parsed = merged; // 整包
      } else {
        const outer = JSON.parse(jsonText) as unknown; // 源码解析
        parsed = normalizeDraft(outer); // 规范化
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(t("comparisonAdmin.errTopObject")); // 顶层须对象
      }
      return apiPUT(`/api/admin/comparison-pages/${encodeURIComponent(slug)}`, token, { payload: parsed });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: oneKey }),
  });

  const prettyError = useMemo(() => (error instanceof Error ? error.message : ""), [error]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("comparisonAdmin.title")}</h1>
      <p className="text-sm text-gray-500">{t("comparisonAdmin.subtitle")}</p>

      <details className="rounded-xl border border-purple-500/25 bg-purple-950/15 p-4 text-xs text-gray-300 max-w-4xl"> {/* 折叠：中英随语言切换 */}
        <summary className="cursor-pointer text-gray-200 font-medium select-none">{t("comparisonAdmin.referenceTitle")}</summary> {/* 摘要 */}
        <div className="mt-3 space-y-2 leading-relaxed border-t border-purple-500/15 pt-3"> {/* 对照正文区 */}
          <p>{t("comparisonAdmin.refIntro")}</p> {/* 总述 */}
          <p>
            <span className="text-gray-500 font-mono">mainTool</span>
            <span className="mx-1.5 text-gray-600">—</span>
            {t("comparisonAdmin.refMain")}
          </p> {/* 主工具 */}
          <p>
            <span className="text-gray-500 font-mono">alternatives</span>
            <span className="mx-1.5 text-gray-600">—</span>
            {t("comparisonAdmin.refAlts")}
          </p> {/* 替代列表 */}
          <p>
            <span className="text-gray-500 font-mono">seo_*</span>
            <span className="mx-1.5 text-gray-600">—</span>
            {t("comparisonAdmin.refSeo")}
          </p> {/* SEO 字段组 */}
          <p>
            <span className="text-gray-500 font-mono">seo_cards</span>
            <span className="mx-1.5 text-gray-600">—</span>
            {t("comparisonAdmin.refCards")}
          </p> {/* 选型卡片 */}
          <p>
            <span className="text-gray-500 font-mono">features / pros / cons</span>
            <span className="mx-1.5 text-gray-600">—</span>
            {t("comparisonAdmin.refMatrix")}
          </p> {/* 矩阵 */}
          <p>
            <span className="text-gray-500 font-mono">footer_note</span>
            <span className="mx-1.5 text-gray-600">—</span>
            {t("comparisonAdmin.refFooter")}
          </p> {/* 页脚 */}
        </div>
      </details>

      <label className="text-xs text-gray-400 flex flex-col gap-1 max-w-md">
        {t("comparisonAdmin.slugLabel")}
        <input
          list="admin-comparison-slugs"
          className="rounded-lg border border-purple-500/30 bg-[#0a011890] px-3 py-2 text-sm text-white"
          placeholder={t("comparisonAdmin.slugPlaceholder")}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <datalist id="admin-comparison-slugs">
          {(slugData?.slugs ?? []).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>

      {isLoading && slug && <p className="text-gray-500 text-sm">…</p>}
      {prettyError && !is404 && <p className="text-rose-400 text-sm">{prettyError}</p>}
      {is404 && slug && <p className="text-amber-200/90 text-sm">{t("comparisonAdmin.notFoundHint")}</p>}

      {slug && (!isLoading || is404 || one) ? (
        <>
          <div className="flex gap-2 border-b border-purple-500/20 pb-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm ${editMode === "visual" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => {
                if (editMode === "json") {
                  try {
                    const outer = JSON.parse(jsonText) as unknown; // 切可视化前解析
                    if (outer === null || typeof outer !== "object" || Array.isArray(outer)) {
                      window.alert(t("comparisonAdmin.errTopObject"));
                      return;
                    }
                    setDraft(outer as Record<string, unknown>); // 同步草稿
                    setDraftNonce((n) => n + 1); // 刷新矩阵文本区
                  } catch {
                    window.alert(t("comparisonAdmin.errJson"));
                    return;
                  }
                }
                setEditMode("visual");
              }}
            >
              {t("comparisonAdmin.tabVisual")}
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm ${editMode === "json" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => {
                if (editMode === "visual") {
                  const merged = visualRef.current?.buildPayloadForSave(); // 带矩阵
                  if (merged) {
                    setDraft(merged); // 父草稿与 JSON 一致
                    setJsonText(JSON.stringify(merged, null, 2)); // 生成文本
                  } else {
                    setJsonText(JSON.stringify(draft, null, 2)); // 矩阵非法时仍导出当前草稿
                  }
                }
                setEditMode("json");
              }}
            >
              {t("comparisonAdmin.tabJson")}
            </button>
          </div>

          <p className="text-xs text-gray-500">{editMode === "visual" ? t("comparisonAdmin.visualIntro") : t("siteJson.hint")}</p>

          {editMode === "visual" ? (
            <ComparisonVisualEditor ref={visualRef} draft={draft} onChange={setDraft} syncSig={serverSyncSig} />
          ) : (
            <textarea
              className="w-full min-h-[420px] font-mono text-sm rounded-xl border border-purple-500/25 bg-[#0a011890] p-4 text-gray-100"
              spellCheck={false}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          )}
        </>
      ) : null}

      <button
        type="button"
        disabled={!slug || save.isPending}
        onClick={() => {
          if (editMode === "json") {
            try {
              JSON.parse(jsonText); // 先校验
            } catch {
              window.alert(t("comparisonAdmin.errJson"));
              return;
            }
          }
          save.mutate();
        }}
        className="rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {save.isPending ? t("comparisonAdmin.saving") : t("comparisonAdmin.save")}
      </button>
      {save.isError && <p className="text-rose-400 text-sm">{(save.error as Error).message}</p>}
    </div>
  );
}
