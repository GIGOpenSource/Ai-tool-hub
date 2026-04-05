"use client";

import Link from "next/link"; // 返回列表
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 详情与删除
import { useParams } from "next/navigation"; // 动态 id
import { useState } from "react"; // 替换草案勾选
import { useAdminStore } from "@/lib/store"; // JWT
import { apiDELETE, apiGET } from "@/lib/admin-api"; // REST
import { useI18n } from "@/lib/i18n/context"; // 文案
import { AiInsightOpenProductDecisionsFold } from "@/components/ai-insight-open-product-decisions-fold"; // P-AI-07 与主列表标题区一致

type RunDetail = {
  id: number; // 主键
  admin_email: string; // 邮箱
  status: string; // 状态
  output_text: string; // 输出
  error_message: string; // 错误
  duration_ms: number; // 耗时
  tokens_in: number | null; // 入
  tokens_out: number | null; // 出
  created_at: string; // 时间
  input_payload_summary: string; // 摘要 JSON
  prompt_snapshot_json: string; // 提示词快照
  provider_snapshot_json: string; // 模型快照
};

type SeoTaskRow = {
  id: number; // 任务 id
  kind: string; // page_seo_patch | home_seo_patch | seo_robots_patch | code_pr_hint 等
  title: string; // 标题
  status: string; // draft | approved | applied | failed | rejected
  payload_json: string; // JSON 文本
  error_message: string; // 失败原因
}; // SEO 执行任务行

type SeoApplyAuditRow = {
  id: number; // 审计 id
  content_key: string; // site_json 键
  created_at: string; // 应用时间
  rolled_back_at: string; // 已回滚则非空
}; // 应用审计行（列表展示用）

/** POST generate：带 query 与 JSON body */
async function postGenerateSeoTasks(
  token: string,
  runId: string,
  replaceDrafts: boolean,
): Promise<{ created_ids: number[]; count: number }> {
  const q = replaceDrafts ? "?replace_drafts=true" : ""; // 是否先清草案
  const res = await fetch(`/api/admin/ai-insights/runs/${runId}/seo-tasks/generate${q}`, {
    method: "POST", // 生成
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, // JSON + JWT
    body: JSON.stringify({}), // 空 body（provider 默认跟 run）
    credentials: "include", // Cookie
  }); // 请求
  const text = await res.text(); // 原始体
  if (!res.ok) throw new Error(text || `${res.status}`); // 失败带体
  return JSON.parse(text) as { created_ids: number[]; count: number }; // 成功解析
}

type StepUpConfig = {
  mode: string; // none | shared_secret | login_password
  need_step_up_password: boolean; // 须共享口令
  need_current_password: boolean; // 须登录密码
}; // GET /step-up-config

type SiteJsonRevisionRow = {
  id: number; // 修订 id
  content_key: string; // site_json 键
  payload_json: string; // 整包快照
  admin_user_id: number | null; // 操作者
  source: string; // ai_insight_apply | ai_insight_rollback
  ref_json: string; // 元数据
  created_at: string; // 时间
}; // GET /site-json-revisions

/** POST：JSON body（v2.x 二次确认字段可选） */
async function postSeoTaskAction(token: string, path: string, body: Record<string, string>): Promise<void> {
  const res = await fetch(path, {
    method: "POST", // POST
    headers: {
      Authorization: `Bearer ${token}`, // JWT
      "Content-Type": "application/json", // 须 JSON 以便 FastAPI 解析 StepUpOptionalBody
    },
    body: JSON.stringify(body), // 可为 {}
    credentials: "include", // Cookie
  }); // 请求
  if (!res.ok) throw new Error(await res.text()); // 失败
}

export default function AdminAiInsightRunDetailPage() {
  const params = useParams(); // 路由参数
  const id = String(params.id ?? ""); // run id 字符串
  const token = useAdminStore((s) => s.token)!; // token
  const { t } = useI18n(); // t()
  const qc = useQueryClient(); // 缓存
  const [replaceDrafts, setReplaceDrafts] = useState(false); // 生成前是否删除旧草案
  const [stepUpShared, setStepUpShared] = useState(""); // v2.x 共享口令
  const [stepUpLogin, setStepUpLogin] = useState(""); // v2.x 登录密码复核
  const [revKey, setRevKey] = useState<"page_seo" | "home_seo" | "seo_robots">("page_seo"); // 修订史键

  const q = useQuery({
    queryKey: ["admin", "ai-insights", "run", id, token] as const, // 键
    queryFn: () => apiGET<RunDetail>(`/api/admin/ai-insights/runs/${id}`, token), // GET
    enabled: !!token && !!id, // 条件
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 2000 : false), // 后台任务进行中时自动刷新（P-AI-05）
  }); // 查询

  const del = useMutation({
    mutationFn: () => apiDELETE(`/api/admin/ai-insights/runs/${id}`, token), // DELETE
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "runs"] }); // 列表失效
      window.location.href = "/admin/ai-seo-insights"; // 回主 Tab 页（历史需手动再点）
    }, // 成功
  }); // mutation

  const qTasks = useQuery({
    queryKey: ["admin", "ai-insights", "seo-tasks", id, token] as const, // 缓存键
    queryFn: () => apiGET<{ items: SeoTaskRow[] }>(`/api/admin/ai-insights/runs/${id}/seo-tasks`, token), // GET
    enabled: !!token && !!id, // 条件
  }); // SEO 任务列表

  const qAudits = useQuery({
    queryKey: ["admin", "ai-insights", "seo-apply-audits", id, token] as const, // 审计缓存键
    queryFn: () => apiGET<{ items: SeoApplyAuditRow[] }>(`/api/admin/ai-insights/runs/${id}/seo-apply-audits`, token), // GET
    enabled: !!token && !!id, // 条件
  }); // 应用审计列表

  const qStepUp = useQuery({
    queryKey: ["admin", "ai-insights", "step-up-config", token] as const, // v2.x
    queryFn: () => apiGET<StepUpConfig>("/api/admin/ai-insights/step-up-config", token), // GET
    enabled: !!token, // 登录即拉
  }); // 二次确认策略

  const qRevisions = useQuery({
    queryKey: ["admin", "ai-insights", "site-json-revisions", revKey, token] as const, // 修订史
    queryFn: () =>
      apiGET<{ items: SiteJsonRevisionRow[] }>(
        `/api/admin/ai-insights/site-json-revisions?content_key=${encodeURIComponent(revKey)}&limit=40`,
        token,
      ), // GET
    enabled: !!token, // 可提前拉
  }); // site_json 多版本

  const buildStepUpBody = (): Record<string, string> => {
    // 批准/应用/回滚附带字段
    const c = qStepUp.data; // 配置
    if (!c || c.mode === "none") return {}; // 未启用
    const o: Record<string, string> = {}; // 累积
    if (c.need_step_up_password) o.step_up_password = stepUpShared; // 共享口令（可空由后端 403）
    if (c.need_current_password) o.current_password = stepUpLogin; // 登录密码
    return o; // 序列化前对象
  }; // 结束 buildStepUpBody

  const invalidateTasks = () =>
    void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "seo-tasks", id, token] }); // 刷新任务

  const invalidateAudits = () =>
    void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "seo-apply-audits", id, token] }); // 刷新审计

  const genTasks = useMutation({
    mutationFn: () => postGenerateSeoTasks(token, id, replaceDrafts), // 调模型生成
    onSuccess: () => invalidateTasks(), // 刷新
  }); // 生成 mutation

  const approveTask = useMutation({
    mutationFn: (taskId: number) =>
      postSeoTaskAction(token, `/api/admin/ai-insights/seo-tasks/${taskId}/approve`, buildStepUpBody()), // 批准 + 二次确认
    onSuccess: () => invalidateTasks(), // 刷新
  }); // 批准

  const rejectTask = useMutation({
    mutationFn: (taskId: number) =>
      postSeoTaskAction(token, `/api/admin/ai-insights/seo-tasks/${taskId}/reject`, {}), // 拒绝无 step-up
    onSuccess: () => invalidateTasks(), // 刷新
  }); // 拒绝

  const applyTask = useMutation({
    mutationFn: (taskId: number) =>
      postSeoTaskAction(token, `/api/admin/ai-insights/seo-tasks/${taskId}/apply`, buildStepUpBody()), // 写 site_json
    onSuccess: () => {
      invalidateTasks(); // 刷新任务
      invalidateAudits(); // 刷新审计
      void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "site-json-revisions"] }); // 各 content_key 修订史
    }, // 成功
  }); // 应用

  const rollbackAudit = useMutation({
    mutationFn: (auditId: number) =>
      postSeoTaskAction(token, `/api/admin/ai-insights/seo-apply-audits/${auditId}/rollback`, buildStepUpBody()), // 回滚
    onSuccess: () => {
      invalidateTasks(); // 任务状态可能间接相关
      invalidateAudits(); // 刷新审计
      void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "site-json-revisions"] }); // 各键修订史
    }, // 成功
  }); // 回滚 mutation

  const delDraftTask = useMutation({
    mutationFn: (taskId: number) => apiDELETE(`/api/admin/ai-insights/seo-tasks/${taskId}`, token), // 删草案
    onSuccess: () => invalidateTasks(), // 刷新
  }); // 删草案

  const taskStatusLabel = (s: string) => {
    // 状态文案
    if (s === "draft") return t("aiSeoInsights.seoTasksStatusDraft"); // 草案
    if (s === "approved") return t("aiSeoInsights.seoTasksStatusApproved"); // 已批
    if (s === "applied") return t("aiSeoInsights.seoTasksStatusApplied"); // 已应用
    if (s === "failed") return t("aiSeoInsights.seoTasksStatusFailed"); // 失败
    if (s === "rejected") return t("aiSeoInsights.seoTasksStatusRejected"); // 已拒
    return s; // 原样
  }; // 结束 taskStatusLabel

  if (q.isLoading) return <p className="text-gray-400 text-sm">{t("aiSeoInsights.loading")}</p>; // 加载
  if (q.isError || !q.data) return <p className="text-red-400 text-sm">{(q.error as Error)?.message}</p>; // 错误

  const d = q.data; // 详情

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-white">
          {t("aiSeoInsights.runDetailTitle")} #{d.id}
        </h1>
        <div className="flex gap-2">
          <Link href="/admin/ai-seo-insights" className="text-sm text-admin-link hover:underline">
            {t("aiSeoInsights.back")}
          </Link>
          <button
            type="button"
            className="text-sm text-red-400 hover:underline"
            onClick={() => {
              if (confirm(t("aiSeoInsights.confirmDeleteRun"))) del.mutate(); // 确认后删
            }}
          >
            {t("aiSeoInsights.deleteRun")}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        {d.created_at} · {d.admin_email} ·{" "}
        {d.status === "success"
          ? t("aiSeoInsights.statusOk")
          : d.status === "pending"
            ? t("aiSeoInsights.statusPending")
            : t("aiSeoInsights.statusFail")}
        {" · "}
        {t("aiSeoInsights.duration")}: {d.duration_ms}ms · {t("aiSeoInsights.tokens")}: {d.tokens_in ?? "—"} /{" "}
        {d.tokens_out ?? "—"}
      </p>
      <AiInsightOpenProductDecisionsFold className="max-w-none" />
      <div>
        <h2 className="text-sm font-medium text-gray-300 mb-1">{t("aiSeoInsights.output")}</h2>
        <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-gray-100 min-h-[100px]">
          {d.output_text || "—"}
        </pre>
      </div>
      <div className="rounded-lg border border-amber-500/25 bg-amber-950/10 p-4 space-y-3">
        <h2 className="text-sm font-medium text-amber-200">{t("aiSeoInsights.seoTasksSectionTitle")}</h2>
        <p className="text-xs text-gray-400 whitespace-pre-line">{t("aiSeoInsights.seoTasksIntro")}</p>
        {qStepUp.data?.need_step_up_password || qStepUp.data?.need_current_password ? (
          <div className="rounded border border-white/10 bg-black/30 p-3 space-y-2">
            <p className="text-xs font-medium text-amber-100/90">{t("aiSeoInsights.stepUpBlockTitle")}</p>
            {qStepUp.data.need_step_up_password ? (
              <label className="block text-xs text-gray-400">
                {t("aiSeoInsights.stepUpPasswordShared")}
                <input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                  value={stepUpShared}
                  onChange={(e) => setStepUpShared(e.target.value)}
                />
              </label>
            ) : null}
            {qStepUp.data.need_current_password ? (
              <label className="block text-xs text-gray-400">
                {t("aiSeoInsights.stepUpPasswordLogin")}
                <input
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 w-full rounded border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                  value={stepUpLogin}
                  onChange={(e) => setStepUpLogin(e.target.value)}
                />
              </label>
            ) : null}
          </div>
        ) : null}
        {d.status === "success" ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={replaceDrafts}
                onChange={(e) => setReplaceDrafts(e.target.checked)}
              />
              {t("aiSeoInsights.seoTasksReplaceDrafts")}
            </label>
            <button
              type="button"
              disabled={genTasks.isPending}
              className="rounded-lg bg-amber-600/90 hover:bg-amber-500 disabled:opacity-50 px-3 py-1.5 text-xs text-white"
              onClick={() => genTasks.mutate()}
            >
              {genTasks.isPending ? t("aiSeoInsights.seoTasksGenerating") : t("aiSeoInsights.seoTasksGenerate")}
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">{t("aiSeoInsights.seoTasksOnlySuccessRun")}</p>
        )}
        {genTasks.isError ? (
          <p className="text-xs text-red-400">{(genTasks.error as Error).message}</p>
        ) : null}
        {approveTask.isError ||
        applyTask.isError ||
        rejectTask.isError ||
        delDraftTask.isError ||
        rollbackAudit.isError ? (
          <p className="text-xs text-red-400">
            {(approveTask.error as Error)?.message ||
              (applyTask.error as Error)?.message ||
              (rejectTask.error as Error)?.message ||
              (delDraftTask.error as Error)?.message ||
              (rollbackAudit.error as Error)?.message}
          </p>
        ) : null}
        {qTasks.isLoading ? <p className="text-xs text-gray-500">{t("aiSeoInsights.loading")}</p> : null}
        {qTasks.data?.items?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-gray-300">
              <thead className="text-gray-500 border-b border-white/10">
                <tr>
                  <th className="py-2 pr-3">{t("aiSeoInsights.seoTasksColTitle")}</th>
                  <th className="py-2 pr-3">{t("aiSeoInsights.seoTasksColKind")}</th>
                  <th className="py-2 pr-3">{t("aiSeoInsights.seoTasksColStatus")}</th>
                  <th className="py-2 pr-3">{t("aiSeoInsights.seoTasksColPayload")}</th>
                  <th className="py-2">{t("aiSeoInsights.colSummary")}</th>
                </tr>
              </thead>
              <tbody>
                {qTasks.data.items.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{row.title}</td>
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-[10px] text-gray-500">
                      {row.kind || "page_seo_patch"}
                    </td>
                    <td className="py-2 pr-3">{taskStatusLabel(row.status)}</td>
                    <td className="py-2 pr-3 max-w-md">
                      <pre className="whitespace-pre-wrap break-all text-[10px] text-gray-400">{row.payload_json}</pre>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {row.status === "draft" ? (
                          <>
                            <button
                              type="button"
                              className="rounded border border-white/15 px-2 py-0.5 text-admin-accent"
                              onClick={() => approveTask.mutate(row.id)}
                            >
                              {t("aiSeoInsights.seoTasksApprove")}
                            </button>
                            <button
                              type="button"
                              className="rounded border border-white/15 px-2 py-0.5 text-gray-400"
                              onClick={() => rejectTask.mutate(row.id)}
                            >
                              {t("aiSeoInsights.seoTasksReject")}
                            </button>
                            <button
                              type="button"
                              className="rounded border border-red-500/30 px-2 py-0.5 text-red-300"
                              onClick={() => delDraftTask.mutate(row.id)}
                            >
                              {t("aiSeoInsights.seoTasksDeleteDraft")}
                            </button>
                          </>
                        ) : null}
                        {row.status === "approved" && row.kind === "code_pr_hint" ? (
                          <>
                            <p className="text-[10px] text-amber-200/90 w-full max-w-xs">
                              {t("aiSeoInsights.seoTasksCodePrNoApply")}
                            </p>
                            <button
                              type="button"
                              className="rounded border border-white/15 px-2 py-0.5 text-gray-300"
                              onClick={() => void navigator.clipboard.writeText(row.payload_json)}
                            >
                              {t("aiSeoInsights.seoTasksCopyPayload")}
                            </button>
                            <button
                              type="button"
                              className="rounded border border-white/15 px-2 py-0.5 text-gray-400"
                              onClick={() => rejectTask.mutate(row.id)}
                            >
                              {t("aiSeoInsights.seoTasksReject")}
                            </button>
                          </>
                        ) : null}
                        {row.status === "approved" && row.kind !== "code_pr_hint" ? (
                          <>
                            <button
                              type="button"
                              className="rounded bg-emerald-700/80 hover:bg-emerald-600 px-2 py-0.5 text-white"
                              onClick={() => applyTask.mutate(row.id)}
                            >
                              {t("aiSeoInsights.seoTasksApply")}
                            </button>
                            <button
                              type="button"
                              className="rounded border border-white/15 px-2 py-0.5 text-gray-400"
                              onClick={() => rejectTask.mutate(row.id)}
                            >
                              {t("aiSeoInsights.seoTasksReject")}
                            </button>
                          </>
                        ) : null}
                        {row.status === "failed" && row.error_message ? (
                          <span className="text-red-400">{row.error_message}</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : qTasks.data ? (
          <p className="text-xs text-gray-500">{t("aiSeoInsights.seoTasksEmpty")}</p>
        ) : null}
        <h3 className="text-xs font-medium text-amber-100/90 pt-2">{t("aiSeoInsights.seoTasksAuditSectionTitle")}</h3>
        {qAudits.isLoading ? <p className="text-xs text-gray-500">{t("aiSeoInsights.loading")}</p> : null}
        {qAudits.data?.items?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-gray-300">
              <thead className="text-gray-500 border-b border-white/10">
                <tr>
                  <th className="py-2 pr-3">id</th>
                  <th className="py-2 pr-3">{t("aiSeoInsights.seoTasksAuditColKey")}</th>
                  <th className="py-2 pr-3">{t("aiSeoInsights.seoTasksAuditColCreated")}</th>
                  <th className="py-2 pr-3">{t("aiSeoInsights.seoTasksAuditColStatus")}</th>
                  <th className="py-2">{t("aiSeoInsights.colSummary")}</th>
                </tr>
              </thead>
              <tbody>
                {qAudits.data.items.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3 font-mono">{a.id}</td>
                    <td className="py-2 pr-3 font-mono text-[10px]">{a.content_key}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-[10px]">{a.created_at}</td>
                    <td className="py-2 pr-3">
                      {a.rolled_back_at ? t("aiSeoInsights.seoTasksAuditRolledBack") : "—"}
                    </td>
                    <td className="py-2">
                      {!a.rolled_back_at ? (
                        <button
                          type="button"
                          disabled={rollbackAudit.isPending}
                          className="rounded border border-amber-500/40 px-2 py-0.5 text-amber-200 disabled:opacity-50"
                          onClick={() => rollbackAudit.mutate(a.id)}
                        >
                          {t("aiSeoInsights.seoTasksAuditRollback")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : qAudits.data ? (
          <p className="text-xs text-gray-500">—</p>
        ) : null}
        <h3 className="text-xs font-medium text-cyan-100/90 pt-3">{t("aiSeoInsights.seoRevisionsTitle")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-gray-400 flex items-center gap-2">
            {t("aiSeoInsights.seoRevisionsKeyLabel")}
            <select
              className="rounded border border-white/10 bg-admin-bg/90 p-1.5 text-xs text-white"
              value={revKey}
              onChange={(e) => setRevKey(e.target.value as typeof revKey)}
            >
              <option value="page_seo">page_seo</option>
              <option value="home_seo">home_seo</option>
              <option value="seo_robots">seo_robots</option>
            </select>
          </label>
        </div>
        {qRevisions.isLoading ? <p className="text-xs text-gray-500">{t("aiSeoInsights.loading")}</p> : null}
        {qRevisions.data?.items?.length ? (
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="min-w-full text-left text-[10px] text-gray-300">
              <thead className="text-gray-500 border-b border-white/10">
                <tr>
                  <th className="py-1 pr-2">id</th>
                  <th className="py-1 pr-2">{t("aiSeoInsights.seoTasksAuditColCreated")}</th>
                  <th className="py-1 pr-2">source</th>
                  <th className="py-1 pr-2">{t("aiSeoInsights.seoRevisionsRefCol")}</th>
                </tr>
              </thead>
              <tbody>
                {qRevisions.data.items.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 align-top">
                    <td className="py-1 pr-2 font-mono">{r.id}</td>
                    <td className="py-1 pr-2 whitespace-nowrap">{r.created_at}</td>
                    <td className="py-1 pr-2 font-mono">{r.source}</td>
                    <td className="py-1 pr-2 break-all text-gray-500">{r.ref_json}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : qRevisions.data ? (
          <p className="text-xs text-gray-500">{t("aiSeoInsights.seoRevisionsEmpty")}</p>
        ) : null}
      </div>
      {d.error_message ? (
        <div>
          <h2 className="text-sm font-medium text-red-300 mb-1">{t("aiSeoInsights.errMessage")}</h2>
          <pre className="whitespace-pre-wrap rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-200">
            {d.error_message}
          </pre>
        </div>
      ) : null}
      <details className="text-sm text-gray-400">
        <summary className="cursor-pointer text-admin-link">{t("aiSeoInsights.inputPayload")}</summary>
        <pre className="mt-2 p-2 rounded bg-black/30 overflow-x-auto text-xs">{d.input_payload_summary}</pre>
      </details>
      <details className="text-sm text-gray-400">
        <summary className="cursor-pointer text-admin-link">{t("aiSeoInsights.promptSnapshot")}</summary>
        <pre className="mt-2 p-2 rounded bg-black/30 overflow-x-auto text-xs">{d.prompt_snapshot_json}</pre>
      </details>
      <details className="text-sm text-gray-400">
        <summary className="cursor-pointer text-admin-link">{t("aiSeoInsights.providerSnapshot")}</summary>
        <pre className="mt-2 p-2 rounded bg-black/30 overflow-x-auto text-xs">{d.provider_snapshot_json}</pre>
      </details>
    </div>
  );
}
