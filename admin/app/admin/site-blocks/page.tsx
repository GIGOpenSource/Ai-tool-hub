"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 服务端状态
import { useEffect, useMemo, useState } from "react"; // 可视化草稿与 JSON 文本双轨
import { useAdminStore } from "@/lib/store"; // 管理员 JWT
import { apiGET, apiPUT } from "@/lib/admin-api"; // /api/admin/site-json/*
import { useI18n } from "@/lib/i18n/context"; // 管理端文案
import { Code2 } from "lucide-react"; // 页面标题图标
import { SiteJsonVisualEditor } from "@/components/site-json-visual-editor"; // 首层表单 + sitemap 表

/** 与后端 admin_site_json._ALLOWED_KEYS 顺序一致，便于运营扫览 */
const BLOCK_KEYS = [
  "ui_toasts",
  "guide",
  "more",
  "sitemap",
  "profile",
  "favorites",
  "compare_interactive",
  "submit",
  "not_found",
  "dashboard",
  "seo_sitemap_static",
  "seo_robots",
  "seo_tool_json_ld",
] as const;

/** 确保草稿为可编辑对象，顶层禁止数组 */
function normalizeDraft(raw: unknown): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {}; // 非法则空对象
  return raw as Record<string, unknown>; // 下游表单绑定
}

export default function AdminSiteBlocksPage() {
  const token = useAdminStore((s) => s.token)!; // Shell 已保证登录
  const { t } = useI18n(); // 文案
  const qc = useQueryClient(); // 失效缓存
  const [key, setKey] = useState<string>(BLOCK_KEYS[0]); // 当前 content_key
  const [text, setText] = useState("{}"); // JSON 标签页文本
  const [editMode, setEditMode] = useState<"visual" | "json">("visual"); // 编辑模式
  const [draft, setDraft] = useState<Record<string, unknown>>({}); // 可视化草稿对象
  const [draftNonce, setDraftNonce] = useState(0); // 嵌套 JSON 区重置节拍（JSON 切回可视化等非拉包变更）

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "site-json", key, token] as const,
    queryFn: () => apiGET<{ payload: Record<string, unknown>; exists: boolean }>(`/api/admin/site-json/${key}`, token),
    enabled: !!token && !!key,
  });

  useEffect(() => {
    if (!data) return; // 等首包
    const p = data.payload ?? {}; // 服务端 payload
    setDraft(normalizeDraft(p)); // 可视化同步
    try {
      setText(JSON.stringify(p, null, 2)); // JSON 区同步
    } catch {
      setText("{}"); // 异常则空对象
    }
    setDraftNonce((n) => n + 1); // 拉包后与嵌套区对齐
  }, [data, key]); // 换块或 invalidate 后对齐

  const serverSyncSig = useMemo(
    () =>
      `${key}|${data ? JSON.stringify(data.payload ?? {}) : ""}|${String(data?.exists ?? "")}|${draftNonce}`,
    [key, data, draftNonce],
  ); // draftNonce 在 JSON→可视化等场景递增，避免嵌套 textarea Stale

  const prettyError = useMemo(() => (error instanceof Error ? error.message : ""), [error]);

  const save = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, unknown>; // 待提交对象
      if (editMode === "visual") {
        parsed = draft; // 可视化即真理
      } else {
        const outer = JSON.parse(text) as unknown; // 从文本解析
        parsed = normalizeDraft(outer); // 规范化
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(t("siteJson.errObject")); // 顶层须为对象
      }
      return apiPUT(`/api/admin/site-json/${key}`, token, { payload: parsed });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "site-json", key] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Code2 className="w-7 h-7 text-admin-link shrink-0 mt-0.5" />
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("siteJson.title")}</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">{t("siteJson.subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-gray-400 flex items-center gap-2">
          {t("siteJson.selectKey")}
          <select
            className="rounded-lg border border-admin-border bg-admin-bg/90 px-2 py-1.5 text-sm text-white"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          >
            {BLOCK_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-admin-border/90 bg-zinc-900/35 p-4 text-xs text-gray-300 leading-relaxed max-w-4xl"> {/* 当前键的中文 API 对照 */}
        <p className="text-gray-300/90 font-medium mb-2">{t("siteJson.referenceTitle")}</p> {/* 小标题 */}
        <p>{t(`siteJson.blockHelp.${key}`)}</p> {/* 随下拉切换说明 */}
      </div>

      {isLoading && <p className="text-gray-500 text-sm">{t("pageSeo.loading")}</p>}
      {prettyError && <p className="text-rose-400 text-sm">{prettyError}</p>}

      <div className="flex gap-2 border-b border-admin-border/90 pb-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${editMode === "visual" ? "bg-admin-btn text-white" : "text-gray-400 hover:text-white"}`}
          onClick={() => {
            if (editMode === "json") {
              try {
                const outer = JSON.parse(text) as unknown; // 切回可视化前解析
                if (outer === null || typeof outer !== "object" || Array.isArray(outer)) {
                  window.alert(t("siteJson.errObject"));
                  return;
                }
                setDraft(outer as Record<string, unknown>); // 同步草稿
                setDraftNonce((n) => n + 1); // 刷新嵌套折叠区原文本
              } catch {
                window.alert(t("siteJson.errJson"));
                return;
              }
            }
            setEditMode("visual");
          }}
        >
          {t("siteJson.tabVisual")}
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${editMode === "json" ? "bg-admin-btn text-white" : "text-gray-400 hover:text-white"}`}
          onClick={() => {
            setText(JSON.stringify(draft, null, 2)); // 从草稿生成文本
            setEditMode("json"); // 切到源码
          }}
        >
          {t("siteJson.tabJson")}
        </button>
      </div>

      <p className="text-xs text-gray-500">{editMode === "visual" ? t("siteJson.visualIntro") : t("siteJson.hint")}</p>

      {!isLoading && data ? (
        editMode === "visual" ? (
          <SiteJsonVisualEditor
            blockKey={key}
            payload={draft}
            onChange={setDraft}
            syncSig={serverSyncSig}
            labels={{
              seoPath: t("siteJson.seoPath"),
              seoPriority: t("siteJson.seoPriority"),
              seoChangefreq: t("siteJson.seoChangefreq"),
              seoAddRow: t("siteJson.seoAddRow"),
              seoRemove: t("siteJson.seoRemove"),
              nestedHint: t("siteJson.nestedHint"),
              errNested: t("siteJson.errNested"),
            }}
          />
        ) : (
          <textarea
            className="w-full min-h-[420px] font-mono text-sm rounded-xl border border-admin-border/90 bg-admin-bg/90 p-4 text-gray-100"
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-gradient-to-r from-admin-btn to-zinc-700 hover:from-admin-btn-hover hover:to-zinc-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={save.isPending}
          onClick={() => {
            if (editMode === "json") {
              try {
                JSON.parse(text); // 先校验语法
              } catch {
                window.alert(t("siteJson.errJson"));
                return;
              }
            }
            save.mutate();
          }}
        >
          {save.isPending ? t("siteJson.saving") : t("siteJson.save")}
        </button>
      </div>

      {save.isError && (
        <p className="text-rose-400 text-sm">{save.error instanceof Error ? save.error.message : t("siteJson.errSave")}</p>
      )}
      {save.isSuccess && <p className="text-emerald-400 text-sm">{t("siteJson.success")}</p>}
    </div>
  );
}
