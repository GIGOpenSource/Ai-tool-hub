"use client";

import Link from "next/link"; // 历史记录进详情页
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 服务端状态
import { useEffect, useState } from "react"; // Tab 与表单本地状态、首包副作用
import clsx from "clsx"; // Tab 样式合并
import { Sparkles } from "lucide-react"; // 页头图标
import { useAdminStore } from "@/lib/store"; // 管理员 JWT
import { apiDELETE, apiGET, apiPOST, apiPUT } from "@/lib/admin-api"; // REST 封装
import { useI18n } from "@/lib/i18n/context"; // 文案

type TabKey = "run" | "provider" | "configs" | "history"; // 四个子区

type PromptItem = {
  id: number; // 配置 id
  name: string; // 名称
  system_prompt: string; // 系统消息
  user_prompt_template: string; // 用户模板
  is_default: boolean; // 是否默认
};

type LlmProviderItem = {
  id: number; // 连接 id
  name: string; // 展示名
  base_url: string; // API 根
  model: string; // 模型
  timeout_sec: number; // 超时
  temperature: number; // 温度
  extra_headers_json: string; // 扩展头
  api_key_env_name: string; // env 名
  api_key_masked: string; // 掩码提示
  is_default: boolean; // 是否默认启用
};

/** POST /run：解析 FastAPI detail 错误为可读字符串 */
async function postAiRun(
  token: string,
  body: { config_id?: number | null; provider_id?: number | null }, // 可选提示词与连接
): Promise<{
  run_id: number; // 新记录 id
  output_text: string; // 模型输出
  duration_ms: number; // 耗时
  tokens_in: number | null; // 入 token
  tokens_out: number | null; // 出 token
}> {
  const res = await fetch("/api/admin/ai-insights/run", {
    method: "POST", // 触发分析
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, // JSON + JWT
    body: JSON.stringify(body), // 可选 config_id
    credentials: "include", // Cookie
  }); // 发请求
  const text = await res.text(); // 原始体
  let data: unknown; // 解析结果
  try {
    data = JSON.parse(text); // JSON
  } catch {
    data = { detail: text }; // 非 JSON 当 detail
  } // 结束 try
  if (!res.ok) {
    // 失败分支
    const d = data as { detail?: unknown }; // 结构断言
    let msg = res.statusText; // 默认
    if (typeof d.detail === "string") msg = d.detail; // 字符串 detail
    else if (Array.isArray(d.detail)) msg = JSON.stringify(d.detail); // 校验错误数组
    throw new Error(msg); // 抛给 mutation
  } // 结束 if
  return data as {
    run_id: number;
    output_text: string;
    duration_ms: number;
    tokens_in: number | null;
    tokens_out: number | null;
  }; // 成功形态
}

export default function AdminAiSeoInsightsPage() {
  const token = useAdminStore((s) => s.token)!; // 登录 token
  const { t } = useI18n(); // 文案函数
  const qc = useQueryClient(); // 失效缓存
  const [tab, setTab] = useState<TabKey>("run"); // 当前 Tab
  const [selConfigId, setSelConfigId] = useState<number | "">(""); // 分析用提示词配置
  const [selProviderId, setSelProviderId] = useState<number | "">(""); // 分析用连接（空则服务端用默认启用）
  const [editId, setEditId] = useState<number | null>(null); // 正在编辑的提示词 id
  const [name, setName] = useState(""); // 提示词：名称
  const [systemPrompt, setSystemPrompt] = useState(""); // 提示词：系统消息
  const [userTpl, setUserTpl] = useState(""); // 提示词：用户模板
  const [isDefault, setIsDefault] = useState(false); // 提示词：默认
  const [llmEditId, setLlmEditId] = useState<number | null>(null); // 正在编辑的连接 id
  const [llmName, setLlmName] = useState(""); // 连接显示名
  const [llmBaseUrl, setLlmBaseUrl] = useState(""); // API 根
  const [llmModel, setLlmModel] = useState(""); // 模型
  const [llmTimeout, setLlmTimeout] = useState(120); // 超时
  const [llmTemp, setLlmTemp] = useState(0.3); // 温度
  const [llmExtra, setLlmExtra] = useState("{}"); // 扩展头 JSON
  const [llmApiKeyEnv, setLlmApiKeyEnv] = useState(""); // env 名
  const [llmApiKeyNew, setLlmApiKeyNew] = useState(""); // 新密钥
  const [llmIsDefault, setLlmIsDefault] = useState(false); // 默认启用此连接
  const [lastOutput, setLastOutput] = useState(""); // 最近一次成功输出

  const qConfigs = useQuery({
    queryKey: ["admin", "ai-insights", "configs", token] as const, // 缓存键
    queryFn: () => apiGET<{ items: PromptItem[] }>("/api/admin/ai-insights/configs", token), // GET
    enabled: !!token, // 有 token 才拉
  }); // 配置列表

  const qProviders = useQuery({
    queryKey: ["admin", "ai-insights", "providers", token] as const, // 缓存键
    queryFn: () => apiGET<{ items: LlmProviderItem[] }>("/api/admin/ai-insights/providers", token), // 多条连接
    enabled: !!token, // 登录即拉（分析页下拉也要用）
  }); // providers

  const qRuns = useQuery({
    queryKey: ["admin", "ai-insights", "runs", token] as const, // 缓存键
    queryFn: () =>
      apiGET<{
        items: Array<{
          id: number; // id
          admin_email: string; // 邮箱
          config_name: string; // 配置名
          model_name: string; // 模型
          status: string; // 状态
          summary: string; // 摘要
          created_at: string; // 时间
          duration_ms: number; // 耗时
        }>; // 行类型
        total: number; // 总数
      }>("/api/admin/ai-insights/runs?limit=50&offset=0", token), // 列表
    enabled: !!token && tab === "history", // 历史 Tab
  }); // 历史

  useEffect(() => {
    // 首包提示词到达时选默认 id（仅当仍为未选状态）
    const items = qConfigs.data?.items; // 列表
    if (!items?.length || selConfigId !== "") return; // 无数据或用户已选
    const d = items.find((x) => x.is_default) ?? items[0]; // 默认或第一条
    setSelConfigId(d.id); // 分析下拉默认值
  }, [qConfigs.data, selConfigId]); // 依赖

  useEffect(() => {
    // 首包连接列表到达时选默认连接（分析用）
    const items = qProviders.data?.items; // 列表
    if (!items?.length || selProviderId !== "") return; // 无数据或用户已选
    const d = items.find((x) => x.is_default) ?? items[0]; // 默认启用或第一条
    setSelProviderId(d.id); // 分析用大模型下拉
  }, [qProviders.data, selProviderId]); // 依赖

  const loadEdit = (it: PromptItem) => {
    // 选中编辑提示词
    setEditId(it.id); // id
    setName(it.name); // 名
    setSystemPrompt(it.system_prompt); // 系统
    setUserTpl(it.user_prompt_template); // 模板
    setIsDefault(it.is_default); // 默认
  }; // 结束 loadEdit

  const loadLlmEdit = (it: LlmProviderItem) => {
    // 选中编辑大模型连接
    setLlmEditId(it.id); // id
    setLlmName(it.name); // 名
    setLlmBaseUrl(it.base_url); // URL
    setLlmModel(it.model); // 模型
    setLlmTimeout(it.timeout_sec); // 超时
    setLlmTemp(it.temperature); // 温度
    setLlmExtra(it.extra_headers_json || "{}"); // 头
    setLlmApiKeyEnv(it.api_key_env_name || ""); // env
    setLlmIsDefault(it.is_default); // 默认启用
    setLlmApiKeyNew(""); // 清空密钥输入
  }; // 结束 loadLlmEdit

  const saveLlm = useMutation({
    mutationFn: async () => {
      // 保存当前编辑的连接
      if (llmEditId == null) throw new Error("no_llm"); // 须先点选一条
      const body: Record<string, unknown> = {
        name: llmName.trim(), // 名
        base_url: llmBaseUrl.trim(), // URL
        model: llmModel.trim(), // 模型
        timeout_sec: llmTimeout, // 超时
        temperature: llmTemp, // 温度
        extra_headers_json: llmExtra, // JSON
        api_key_env_name: llmApiKeyEnv.trim(), // env
        is_default: llmIsDefault, // 是否默认启用
      }; // 体
      if (llmApiKeyNew.trim()) body.api_key = llmApiKeyNew.trim(); // 有新密钥才传
      return apiPUT(`/api/admin/ai-insights/providers/${llmEditId}`, token, body); // PUT
    }, // 结束 mutationFn
    onSuccess: () => {
      setLlmApiKeyNew(""); // 清空密钥框
      void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "providers"] }); // 刷新列表
    }, // 结束 onSuccess
  }); // 结束 useMutation

  const addLlm = useMutation({
    mutationFn: async () => {
      // 复制首条或模板新增连接
      const first = qProviders.data?.items[0]; // 首条作模板
      return apiPOST("/api/admin/ai-insights/providers", token, {
        name: first ? `${first.name} (copy)` : "New LLM", // 名
        base_url: first?.base_url ?? "https://api.openai.com/v1", // URL
        model: first?.model ?? "gpt-4o-mini", // 模型
        timeout_sec: first?.timeout_sec ?? 120, // 超时
        temperature: first?.temperature ?? 0.3, // 温度
        extra_headers_json: first?.extra_headers_json ?? "{}", // 头
        is_default: false, // 不设默认避免覆盖
      }); // POST
    }, // 结束 mutationFn
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "providers"] }), // 刷新
  }); // 结束 useMutation

  const delLlm = useMutation({
    mutationFn: async (id: number) => apiDELETE(`/api/admin/ai-insights/providers/${id}`, token), // DELETE
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "providers"] }); // 刷新
      setLlmEditId(null); // 清空编辑
    }, // 结束 onSuccess
    onError: (e: unknown) => {
      const m = e instanceof Error ? e.message : String(e); // 错误文案
      window.alert(m.includes(" 400") ? t("aiSeoInsights.errLastProvider") : m); // 400 多为 last_provider
    }, // 删最后一条时后端 400
  }); // 结束 useMutation

  const saveConfig = useMutation({
    mutationFn: async () => {
      // 保存配置
      if (editId == null) throw new Error("no_config"); // 须先选或新增
      return apiPUT(`/api/admin/ai-insights/configs/${editId}`, token, {
        // PUT
        name: name.trim(), // 名
        system_prompt: systemPrompt, // 系统
        user_prompt_template: userTpl, // 模板
        is_default: isDefault, // 默认
      }); // body
    }, // 结束 mutationFn
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "configs"] }), // 刷新列表
  }); // 结束 useMutation

  const addConfig = useMutation({
    mutationFn: async () => {
      // 新增空白配置（占位符合法的最小模板）
      const tpl = qConfigs.data?.items[0]; // 复制第一条为草稿
      const fallbackTpl =
        "请输出《每日 SEO 分析报告》。下列为站点当前数据摘要（可能已截断），请严格对照系统消息中的三大 Checklist 做逐项对照分析；无数据支撑的项须标注需人工核查。\n\n" + // 与后端 DEFAULT 用户模板一致
        "### SEO 与首页\n{{seo_snapshot}}\n\n" + // SEO 快照占位
        "### 索引与抓取配置（sitemap/robots）\n{{seo_indexing_snapshot}}\n\n" + // 非内容爬虫；旧名 {{crawler_snapshot}} 仍兼容
        "### 流量与热门页（聚合，无个人数据）\n{{traffic_snapshot}}\n\n" + // 流量快照占位
        "### 站点规模\n{{site_stats_snapshot}}"; // 站点统计占位
      const fallbackSystem =
        "你是资深 SEO 与增长顾问，面向中文运营团队。请基于快照输出《每日 SEO 分析报告》：须含执行摘要、技术/内容/日常巡查三方面对照、明日待办；勿编造路径；无数据则标注需人工核查。（生产环境完整 Checklist 以数据库迁移后的默认配置为准）"; // 无已有配置时的短系统兜底
      return apiPOST("/api/admin/ai-insights/configs", token, {
        name: tpl ? `${tpl.name} (copy)` : "New config", // 名
        system_prompt: tpl?.system_prompt ?? fallbackSystem, // 系统（优先复制已有配置）
        user_prompt_template: tpl?.user_prompt_template ?? fallbackTpl, // 用户模板
        is_default: false, // 不设默认
      }); // POST
    }, // 结束 mutationFn
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "configs"] }), // 刷新
  }); // 结束 useMutation

  const delConfig = useMutation({
    mutationFn: async (id: number) => apiDELETE(`/api/admin/ai-insights/configs/${id}`, token), // DELETE
    onSuccess: () => {
      // 刷新并清空编辑
      void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "configs"] }); // 列表
      setEditId(null); // 清空
    }, // 结束 onSuccess
  }); // 结束 useMutation

  const runMut = useMutation({
    mutationFn: async () => {
      // 触发分析
      const cid = selConfigId === "" ? null : Number(selConfigId); // 提示词配置 id
      const pid = selProviderId === "" ? null : Number(selProviderId); // 连接 id（null 则服务端用默认启用）
      return postAiRun(token, { config_id: cid, provider_id: pid }); // POST
    }, // 结束 mutationFn
    onSuccess: (d) => {
      // 展示输出并刷新历史
      setLastOutput(d.output_text); // 文本
      void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "runs"] }); // 历史
    }, // 结束 onSuccess
  }); // 结束 useMutation

  const tabCls = (k: TabKey) =>
    // Tab 按钮样式
    clsx(
      "px-3 py-1.5 rounded-md text-sm border transition-colors", // 基础
      tab === k ? "border-white/15 bg-white/[0.04] text-white" : "border-white/10 text-gray-400 hover:text-white", // 选中态
    ); // 结束 clsx

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Sparkles className="h-8 w-8 text-amber-300 shrink-0 mt-1" aria-hidden /> {/* 图标 */}
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("aiSeoInsights.title")}</h1> {/* 标题 */}
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">{t("aiSeoInsights.subtitle")}</p> {/* 说明 */}
          <p className="text-xs text-amber-200/80 mt-2">{t("aiSeoInsights.costHint")}</p> {/* 费用提示 */}
          <p className="text-xs text-gray-500 mt-1">{t("aiSeoInsights.slowHint")}</p> {/* 耗时提示 */}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={tabCls("run")} onClick={() => setTab("run")}>
          {t("aiSeoInsights.tabRun")}
        </button>
        <button type="button" className={tabCls("provider")} onClick={() => setTab("provider")}>
          {t("aiSeoInsights.tabProvider")}
        </button>
        <button type="button" className={tabCls("configs")} onClick={() => setTab("configs")}>
          {t("aiSeoInsights.tabConfigs")}
        </button>
        <button type="button" className={tabCls("history")} onClick={() => setTab("history")}>
          {t("aiSeoInsights.tabHistory")}
        </button>
      </div>

      {tab === "run" ? (
        <div className="space-y-4 max-w-3xl">
          <label className="block text-xs text-gray-400">
            {t("aiSeoInsights.selectConfig")}
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
              value={selConfigId === "" ? "" : String(selConfigId)}
              onChange={(e) => setSelConfigId(e.target.value ? Number(e.target.value) : "")}
            >
              {(qConfigs.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.is_default ? " *" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-400">
            {t("aiSeoInsights.selectLlmProvider")}
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
              value={selProviderId === "" ? "" : String(selProviderId)}
              onChange={(e) => setSelProviderId(e.target.value ? Number(e.target.value) : "")}
            >
              {(qProviders.data?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.model}
                  {p.is_default ? " *" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={runMut.isPending || !qConfigs.data?.items?.length || !qProviders.data?.items?.length}
            className="rounded-lg bg-admin-btn hover:bg-admin-btn-hover disabled:opacity-50 px-4 py-2 text-sm text-white"
            onClick={() => runMut.mutate()}
          >
            {runMut.isPending ? t("aiSeoInsights.running") : t("aiSeoInsights.run")}
          </button>
          {runMut.isError ? (
            <p className="text-sm text-red-400">{t("aiSeoInsights.errRun")}: {(runMut.error as Error).message}</p>
          ) : null}
          <div>
            <h2 className="text-sm font-medium text-gray-300 mb-1">{t("aiSeoInsights.output")}</h2>
            <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-gray-100 min-h-[120px]">
              {lastOutput || t("aiSeoInsights.noOutput")}
            </pre>
          </div>
        </div>
      ) : null}

      {tab === "provider" ? (
        <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
          <div>
            <p className="text-xs text-gray-500 mb-2">{t("aiSeoInsights.providerTabIntro")}</p>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                className="text-xs rounded border border-white/15 px-2 py-1 text-admin-accent"
                onClick={() => addLlm.mutate()}
              >
                {t("aiSeoInsights.addLlmProvider")}
              </button>
            </div>
            {qProviders.isLoading ? <p className="text-gray-400 text-sm">{t("aiSeoInsights.loading")}</p> : null}
            <ul className="space-y-1 text-sm">
              {(qProviders.data?.items ?? []).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`w-full text-left rounded px-2 py-1 ${llmEditId === p.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                    onClick={() => loadLlmEdit(p)}
                  >
                    {p.name} — {p.model}
                    {p.is_default ? " *" : ""}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            {llmEditId == null ? (
              <p className="text-sm text-gray-500">{t("aiSeoInsights.selectLlmProvider")}</p>
            ) : (
              <>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.llmProviderName")}
                  <input
                    className="mt-1 w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                    value={llmName}
                    onChange={(e) => setLlmName(e.target.value)}
                  />
                </label>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.baseUrl")}
                  <input
                    className="mt-1 w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                    value={llmBaseUrl}
                    onChange={(e) => setLlmBaseUrl(e.target.value)}
                  />
                </label>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.model")}
                  <input
                    className="mt-1 w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                  />
                </label>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.timeout")}
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                    value={llmTimeout}
                    onChange={(e) => setLlmTimeout(Number(e.target.value))}
                  />
                </label>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.temperature")}
                  <input
                    type="number"
                    step="0.1"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                    value={llmTemp}
                    onChange={(e) => setLlmTemp(Number(e.target.value))}
                  />
                </label>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.extraHeaders")}
                  <textarea
                    className="mt-1 w-full min-h-[80px] rounded-lg border border-white/10 bg-admin-bg/90 p-2 font-mono text-sm text-white"
                    value={llmExtra}
                    onChange={(e) => setLlmExtra(e.target.value)}
                  />
                </label>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.apiKeyEnvName")}
                  <input
                    className="mt-1 w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                    value={llmApiKeyEnv}
                    onChange={(e) => setLlmApiKeyEnv(e.target.value)}
                  />
                </label>
                <p className="text-xs text-gray-500">
                  {t("aiSeoInsights.apiKeyPlaceholder")} —{" "}
                  {(qProviders.data?.items ?? []).find((x) => x.id === llmEditId)?.api_key_masked || "—"}
                </p>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("aiSeoInsights.apiKeyPlaceholder")}
                  className="w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                  value={llmApiKeyNew}
                  onChange={(e) => setLlmApiKeyNew(e.target.value)}
                />
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={llmIsDefault} onChange={(e) => setLlmIsDefault(e.target.checked)} />
                  {t("aiSeoInsights.defaultLlmProvider")}
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={saveLlm.isPending}
                    className="rounded-lg bg-admin-btn hover:bg-admin-btn-hover disabled:opacity-50 px-4 py-2 text-sm text-white"
                    onClick={() => saveLlm.mutate()}
                  >
                    {saveLlm.isPending ? t("aiSeoInsights.saving") : t("aiSeoInsights.saveLlmProvider")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-500/40 text-red-300 px-3 py-2 text-sm"
                    onClick={() => {
                      if (confirm(t("aiSeoInsights.confirmDeleteLlmProvider"))) delLlm.mutate(llmEditId);
                    }}
                  >
                    {t("aiSeoInsights.deleteLlmProvider")}
                  </button>
                </div>
                {saveLlm.isSuccess ? <p className="text-xs text-green-400">{t("aiSeoInsights.savedLlmProvider")}</p> : null}
                {saveLlm.isError ? (
                  <p className="text-xs text-red-400">{t("aiSeoInsights.errProvider")}</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      {tab === "configs" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                className="text-xs rounded border border-white/15 px-2 py-1 text-admin-accent"
                onClick={() => addConfig.mutate()}
              >
                {t("aiSeoInsights.addConfig")}
              </button>
            </div>
            <ul className="space-y-1 text-sm">
              {(qConfigs.data?.items ?? []).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`w-full text-left rounded px-2 py-1 ${editId === c.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                    onClick={() => loadEdit(c)}
                  >
                    {c.name}
                    {c.is_default ? " *" : ""}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            {editId == null ? (
              <p className="text-sm text-gray-500">{t("aiSeoInsights.selectConfig")}</p>
            ) : (
              <>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.configName")}
                  <input
                    className="mt-1 w-full rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.systemPrompt")}
                  <textarea
                    className="mt-1 w-full min-h-[100px] rounded-lg border border-white/10 bg-admin-bg/90 p-2 text-sm text-white"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                </label>
                <label className="block text-xs text-gray-400">
                  {t("aiSeoInsights.userTemplate")}
                  <textarea
                    className="mt-1 w-full min-h-[200px] rounded-lg border border-white/10 bg-admin-bg/90 p-2 font-mono text-xs text-white"
                    value={userTpl}
                    onChange={(e) => setUserTpl(e.target.value)}
                  />
                </label>
                <p className="text-xs text-gray-500">{t("aiSeoInsights.placeholdersHint")}</p>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                  {t("aiSeoInsights.defaultConfig")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-admin-btn hover:bg-admin-btn-hover px-3 py-1.5 text-sm text-white"
                    onClick={() => saveConfig.mutate()}
                    disabled={saveConfig.isPending}
                  >
                    {t("aiSeoInsights.saveConfig")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-500/40 text-red-300 px-3 py-1.5 text-sm"
                    onClick={() => {
                      if (confirm(t("aiSeoInsights.confirmDeleteConfig"))) delConfig.mutate(editId); // 删配置确认
                    }}
                  >
                    {t("aiSeoInsights.deleteConfig")}
                  </button>
                </div>
                {saveConfig.isError ? (
                  <p className="text-xs text-red-400">{(saveConfig.error as Error).message}</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase text-gray-500 border-b border-white/10">
              <tr>
                <th className="py-2 pr-4">{t("aiSeoInsights.colTime")}</th>
                <th className="py-2 pr-4">{t("aiSeoInsights.colAdmin")}</th>
                <th className="py-2 pr-4">{t("aiSeoInsights.colConfig")}</th>
                <th className="py-2 pr-4">{t("aiSeoInsights.colModel")}</th>
                <th className="py-2 pr-4">{t("aiSeoInsights.colStatus")}</th>
                <th className="py-2 pr-4">{t("aiSeoInsights.colSummary")}</th>
                <th className="py-2">{t("aiSeoInsights.viewDetail")}</th>
              </tr>
            </thead>
            <tbody>
              {(qRuns.data?.items ?? []).map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-2 pr-4 whitespace-nowrap">{r.created_at}</td>
                  <td className="py-2 pr-4">{r.admin_email}</td>
                  <td className="py-2 pr-4">{r.config_name}</td>
                  <td className="py-2 pr-4">{r.model_name}</td>
                  <td className="py-2 pr-4">
                    {r.status === "success" ? t("aiSeoInsights.statusOk") : t("aiSeoInsights.statusFail")}
                  </td>
                  <td className="py-2 pr-4 max-w-xs truncate">{r.summary}</td>
                  <td className="py-2">
                    <Link className="text-admin-link hover:underline" href={`/admin/ai-seo-insights/runs/${r.id}`}>
                      {t("aiSeoInsights.viewDetail")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
