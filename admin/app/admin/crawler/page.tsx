"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 列表与任务刷新
import { useEffect, useState } from "react"; // 调度草稿同步与表单
import { useAdminStore } from "@/lib/store"; // 管理员 JWT
import { apiDELETE, apiGET, apiPOST, apiPUT } from "@/lib/admin-api"; // REST
import { useI18n } from "@/lib/i18n/context"; // 侧栏与页内文案

type CrawlerStats = {
  total_runs: number;
  success_runs: number;
  failed_runs: number;
  other_runs: number;
  total_items_processed: number;
  total_committed_ins: number;
  total_committed_upd: number;
};

type CrawlerSource = {
  id: number;
  name: string;
  feed_url: string;
  source_type: string;
  config_json: Record<string, unknown>;
  respect_robots: boolean;
  user_agent: string;
  enabled: boolean;
  auto_crawl_enabled: boolean;
  crawl_interval_minutes: number;
  daily_max_items: number;
  scheduled_max_items_per_run: number;
  auto_dry_run: boolean;
  auto_write_strategy: string;
  last_auto_run_at: string;
  daily_quota_date: string;
  daily_quota_used: number;
  created_at: string;
  updated_at: string;
};

type CrawlerJobRow = {
  id: number;
  source_id: number;
  source_name: string;
  dry_run: boolean;
  write_strategy: string;
  max_items: number;
  status: string;
  trigger_type: string;
  items_processed: number;
  items_committed_insert: number;
  items_committed_update: number;
  summary: Record<string, unknown>;
  error_message: string;
  started_at: string;
  finished_at: string;
  created_at: string;
};

const DEFAULT_CONFIG = `{
  "items_path": "items",
  "default_category_slug": "productivity",
  "timeout_sec": 45
}`;

/** 单数据源：定时间隔、每日条数、自动 Dry-run 等（与 GET sources 字段对齐） */
function CrawlerScheduleForm({
  source,
  token,
  L,
  onInvalidate,
}: {
  source: CrawlerSource;
  token: string;
  L: (zh: string, en: string) => string;
  onInvalidate: () => void;
}) {
  const [autoOn, setAutoOn] = useState(source.auto_crawl_enabled); // 定时总开关
  const [intervalMin, setIntervalMin] = useState(source.crawl_interval_minutes); // 间隔分钟
  const [dailyMax, setDailyMax] = useState(source.daily_max_items); // 每日上限
  const [perRun, setPerRun] = useState(source.scheduled_max_items_per_run); // 单次条数
  const [autoDry, setAutoDry] = useState(source.auto_dry_run); // 自动仅预览
  const [autoWs, setAutoWs] = useState(source.auto_write_strategy); // 自动写入策略
  useEffect(() => {
    setAutoOn(source.auto_crawl_enabled); // 列表刷新后同步
    setIntervalMin(source.crawl_interval_minutes); // 间隔
    setDailyMax(source.daily_max_items); // 每日上限
    setPerRun(source.scheduled_max_items_per_run); // 单次
    setAutoDry(source.auto_dry_run); // Dry-run
    setAutoWs(source.auto_write_strategy); // 策略
  }, [source]); // 依赖整对象
  const putMut = useMutation({
    mutationFn: () =>
      apiPUT(`/api/admin/crawler/sources/${source.id}`, token, {
        auto_crawl_enabled: autoOn,
        crawl_interval_minutes: Number(intervalMin) || 60,
        daily_max_items: Number(dailyMax) || 1,
        scheduled_max_items_per_run: Number(perRun) || 1,
        auto_dry_run: autoDry,
        auto_write_strategy: autoWs,
      }),
    onSuccess: () => onInvalidate(), // 刷新父级列表
  });
  return (
    <div className="mt-2 pt-2 border-t border-white/[0.05] space-y-2 text-xs">
      <p className="text-gray-500 font-medium">{L("爬虫设置（定时）", "Crawler schedule")}</p>
      <label className="flex items-center gap-2 text-gray-400">
        <input type="checkbox" checked={autoOn} onChange={(e) => setAutoOn(e.target.checked)} />
        {L("启用定时抓取（进程内每分钟检查）", "Enable scheduled crawl (in-process, checked every minute)")}
      </label>
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-gray-400 flex items-center gap-1">
          {L("间隔(分)", "Interval (min)")}
          <input
            type="number"
            min={5}
            max={10080}
            className="w-24 rounded border border-admin-border bg-admin-surface px-2 py-0.5 text-white"
            value={intervalMin}
            onChange={(e) => setIntervalMin(Number(e.target.value))}
          />
        </label>
        <label className="text-gray-400 flex items-center gap-1">
          {L("每日最多处理条数", "Daily max items")}
          <input
            type="number"
            min={1}
            max={500000}
            className="w-28 rounded border border-admin-border bg-admin-surface px-2 py-0.5 text-white"
            value={dailyMax}
            onChange={(e) => setDailyMax(Number(e.target.value))}
          />
        </label>
        <label className="text-gray-400 flex items-center gap-1">
          {L("单次最多条数", "Max per run")}
          <input
            type="number"
            min={1}
            max={500}
            className="w-20 rounded border border-admin-border bg-admin-surface px-2 py-0.5 text-white"
            value={perRun}
            onChange={(e) => setPerRun(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2 text-gray-400">
          <input type="checkbox" checked={autoDry} onChange={(e) => setAutoDry(e.target.checked)} />
          {L("自动任务仅 Dry-run", "Auto jobs dry-run only")}
        </label>
        <select
          className="rounded border border-admin-border bg-admin-surface px-2 py-0.5 text-white"
          value={autoWs}
          onChange={(e) => setAutoWs(e.target.value)}
        >
          <option value="insert_only">insert_only</option>
          <option value="update_empty">update_empty</option>
          <option value="overwrite">overwrite</option>
        </select>
      </div>
      <p className="text-[11px] text-gray-600">
        {L(
          `今日已用 ${source.daily_quota_used} / 上限按上表；配额日 ${source.daily_quota_date || "—"}；上次自动 ${source.last_auto_run_at || "—"}`,
          `Today used ${source.daily_quota_used} / daily cap above; quota date ${source.daily_quota_date || "—"}; last auto ${source.last_auto_run_at || "—"}`,
        )}
      </p>
      <button
        type="button"
        disabled={putMut.isPending}
        onClick={() => putMut.mutate()}
        className="rounded bg-amber-800/70 px-2 py-1 text-white disabled:opacity-50"
      >
        {L("保存爬虫设置", "Save schedule")}
      </button>
      {putMut.isError && <p className="text-rose-400">{(putMut.error as Error).message}</p>}
    </div>
  );
}

export default function AdminCrawlerPage() {
  const token = useAdminStore((s) => s.token)!; // layout 已要求登录
  const { t, locale: uiLocale } = useI18n(); // 中英切换
  const qc = useQueryClient(); // 失效缓存
  const L = (zh: string, en: string) => (uiLocale === "zh" ? zh : en); // 页内短句

  const [newName, setNewName] = useState(""); // 新数据源名称
  const [newUrl, setNewUrl] = useState(""); // 新订阅 URL
  const [newCfg, setNewCfg] = useState(DEFAULT_CONFIG); // 新数据源 config JSON 文本
  const [editId, setEditId] = useState<number | null>(null); // 正在编辑的数据源 id
  const [editBlob, setEditBlob] = useState(""); // 编辑中的整段 JSON（name/url/config 合一编辑简化：仅 config）

  const [runSourceId, setRunSourceId] = useState<number>(0); // 执行任务所选 source
  const [runDry, setRunDry] = useState(true); // Dry-run 默认开
  const [runStrategy, setRunStrategy] = useState("insert_only"); // 写入策略
  const [runMax, setRunMax] = useState(100); // max_items

  const [selJobId, setSelJobId] = useState<number | null>(null); // 详情区任务 id

  const qStats = ["admin", "crawler", "stats", token] as const; // 汇总统计键
  const qSources = ["admin", "crawler", "sources", token] as const; // 数据源查询键
  const qJobs = ["admin", "crawler", "jobs", token] as const; // 任务列表键
  const qJobDetail = ["admin", "crawler", "job", selJobId, token] as const; // 单任务详情键
  const qPreview = ["admin", "crawler", "preview", selJobId, token] as const; // 预览键

  const statsQ = useQuery({
    queryKey: qStats,
    queryFn: () => apiGET<CrawlerStats>("/api/admin/crawler/stats", token),
    enabled: !!token,
  });

  const sourcesQ = useQuery({
    queryKey: qSources,
    queryFn: () => apiGET<{ data: CrawlerSource[] }>("/api/admin/crawler/sources", token),
    enabled: !!token,
  });

  const jobsQ = useQuery({
    queryKey: qJobs,
    queryFn: () => apiGET<{ data: CrawlerJobRow[] }>("/api/admin/crawler/jobs?limit=80", token),
    enabled: !!token,
  });

  const jobQ = useQuery({
    queryKey: qJobDetail,
    queryFn: () => apiGET<Record<string, unknown>>(`/api/admin/crawler/jobs/${selJobId}`, token),
    enabled: !!token && selJobId != null,
  });

  const previewQ = useQuery({
    queryKey: qPreview,
    queryFn: () =>
      apiGET<{ items: unknown[]; total: number }>(
        `/api/admin/crawler/jobs/${selJobId}/preview?limit=100`,
        token
      ),
    enabled: !!token && selJobId != null,
  });

  const invalidateSources = () => void qc.invalidateQueries({ queryKey: qSources }); // 刷新数据源
  const invalidateJobs = () => void qc.invalidateQueries({ queryKey: qJobs }); // 刷新任务

  const postSource = useMutation({
    mutationFn: async () => {
      let cfg: Record<string, unknown> = {}; // 解析后配置
      try {
        cfg = JSON.parse(newCfg || "{}") as Record<string, unknown>; // 反序列化
      } catch {
        throw new Error(L("config JSON 无效", "Invalid config JSON")); // 校验失败
      }
      return apiPOST("/api/admin/crawler/sources", token, {
        name: newName.trim(),
        feed_url: newUrl.trim(),
        source_type: "json_feed",
        config_json: cfg,
        respect_robots: true,
        user_agent: "",
        enabled: true,
      });
    },
    onSuccess: () => {
      setNewName(""); // 清空名称
      setNewUrl(""); // 清空 URL
      setNewCfg(DEFAULT_CONFIG); // 重置默认配置
      invalidateSources(); // 拉新列表
    },
  });

  const delSource = useMutation({
    mutationFn: (id: number) => apiDELETE(`/api/admin/crawler/sources/${id}`, token),
    onSuccess: () => invalidateSources(),
  });

  const putConfig = useMutation({
    mutationFn: async () => {
      if (editId == null) return null; // 无编辑目标
      let cfg: Record<string, unknown> = {}; // 配置对象
      try {
        cfg = JSON.parse(editBlob || "{}") as Record<string, unknown>; // 解析编辑框
      } catch {
        throw new Error(L("config JSON 无效", "Invalid config JSON")); // 失败
      }
      return apiPUT(`/api/admin/crawler/sources/${editId}`, token, { config_json: cfg }); // 仅更新 config
    },
    onSuccess: () => {
      setEditId(null); // 关闭编辑
      invalidateSources(); // 刷新
    },
  });

  const runJob = useMutation({
    mutationFn: () =>
      apiPOST("/api/admin/crawler/jobs", token, {
        source_id: runSourceId,
        dry_run: runDry,
        write_strategy: runStrategy,
        max_items: runMax,
      }),
    onSuccess: (data) => {
      invalidateJobs(); // 刷新任务表
      void qc.invalidateQueries({ queryKey: qStats }); // 汇总统计随任务更新
      const jid = (data as { job_id?: number })?.job_id; // 新建任务 id
      if (typeof jid === "number") setSelJobId(jid); // 自动打开详情
    },
  });

  const commitJob = useMutation({
    mutationFn: (jid: number) => apiPOST(`/api/admin/crawler/jobs/${jid}/commit`, token, {}),
    onSuccess: () => {
      invalidateJobs(); // 刷新列表
      void qc.invalidateQueries({ queryKey: qJobDetail }); // 刷新详情
      void qc.invalidateQueries({ queryKey: qStats }); // 入库后更新全局统计
    },
  });

  const sources = sourcesQ.data?.data ?? []; // 数据源数组
  const jobs = jobsQ.data?.data ?? []; // 任务数组

  const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)); // 统一错误串

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">{t("sidebar.crawlerData")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {L(
            "从 JSON 订阅拉取工具列表：默认 Dry-run 仅生成预览；确认后在「工具审核」中处理 pending。定时任务由后端进程每分钟检查（环境变量 CRAWLER_SCHEDULER_ENABLED 可关闭）。统计为全历史任务汇总。",
            "JSON feed import: dry-run builds previews; commit sends pending tools to review. Scheduler ticks every minute in the API process (set CRAWLER_SCHEDULER_ENABLED=0 to disable). Stats aggregate all past jobs.",
          )}
        </p>
      </div>

      <section className="rounded-xl border border-admin-border/90 p-4 bg-admin-bg/90">
        <h2 className="text-lg font-medium text-white mb-3">{L("爬取统计（全历史）", "Crawl statistics (all time)")}</h2>
        {statsQ.isLoading && <p className="text-xs text-gray-400">{L("加载中…", "Loading…")}</p>}
        {statsQ.error && <p className="text-xs text-rose-400">{(statsQ.error as Error).message}</p>}
        {statsQ.data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg bg-black/20 p-3 border border-white/[0.06]">
              <p className="text-gray-500 text-xs">{L("总执行次数", "Total runs")}</p>
              <p className="text-xl text-white font-mono">{statsQ.data.total_runs}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3 border border-emerald-500/20">
              <p className="text-gray-500 text-xs">{L("成功次数", "Succeeded")}</p>
              <p className="text-xl text-emerald-300 font-mono">{statsQ.data.success_runs}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3 border border-rose-500/20">
              <p className="text-gray-500 text-xs">{L("失败次数", "Failed")}</p>
              <p className="text-xl text-rose-300 font-mono">{statsQ.data.failed_runs}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3 border border-amber-500/20">
              <p className="text-gray-500 text-xs">{L("其它/进行中", "Other / in progress")}</p>
              <p className="text-xl text-amber-200 font-mono">{statsQ.data.other_runs}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3 border border-white/[0.06] col-span-2 sm:col-span-4">
              <p className="text-gray-500 text-xs">{L("累计解析预览条数", "Total preview rows processed")}</p>
              <p className="text-lg text-gray-300 font-mono">{statsQ.data.total_items_processed}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3 border border-white/[0.06]">
              <p className="text-gray-500 text-xs">{L("累计入库 insert", "Total DB inserts")}</p>
              <p className="text-lg text-white font-mono">{statsQ.data.total_committed_ins}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3 border border-white/[0.06]">
              <p className="text-gray-500 text-xs">{L("累计入库 update", "Total DB updates")}</p>
              <p className="text-lg text-white font-mono">{statsQ.data.total_committed_upd}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-admin-border/90 p-4 space-y-3 bg-admin-bg/90">
        <h2 className="text-lg font-medium text-white">{L("数据源", "Sources")}</h2>
        {sourcesQ.isLoading && <p className="text-xs text-gray-400">{L("加载中…", "Loading…")}</p>}
        {sourcesQ.error && <p className="text-xs text-rose-400">{errText(sourcesQ.error)}</p>}
        <div className="space-y-2 text-sm">
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap gap-2 items-start justify-between border border-white/[0.06] rounded-lg p-2"
            >
              <div>
                <p className="text-white font-medium">
                  #{s.id} {s.name}
                </p>
                <p className="text-xs text-gray-500 break-all">{s.feed_url}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {L("配置", "Config")}: <code className="text-admin-accent/90">{JSON.stringify(s.config_json)}</code>
                </p>
                <CrawlerScheduleForm source={s} token={token} L={L} onInvalidate={invalidateSources} />
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  className="text-xs rounded bg-white/10 px-2 py-1 text-gray-200"
                  onClick={() => {
                    setEditId(s.id); // 打开编辑
                    setEditBlob(JSON.stringify(s.config_json, null, 2)); // 格式化
                  }}
                >
                  {L("改配置", "Edit config")}
                </button>
                <button
                  type="button"
                  className="text-xs rounded bg-rose-900/50 px-2 py-1 text-rose-200"
                  onClick={() => {
                    if (confirm(L("删除该数据源？", "Delete this source?"))) delSource.mutate(s.id); // 确认后删
                  }}
                >
                  {L("删除", "Delete")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {editId != null && (
          <div className="space-y-2 border-t border-white/[0.06] pt-3">
            <p className="text-xs text-gray-400">
              {L("编辑数据源", "Edit source")} #{editId} config_json
            </p>
            <textarea
              className="w-full min-h-[140px] rounded border border-admin-border bg-admin-surface p-2 text-xs text-zinc-400 font-mono"
              value={editBlob}
              onChange={(e) => setEditBlob(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={putConfig.isPending}
                onClick={() => putConfig.mutate()}
                className="rounded-lg bg-admin-btn/90 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {L("保存配置", "Save config")}
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-gray-200"
              >
                {L("取消", "Cancel")}
              </button>
            </div>
            {putConfig.isError && <p className="text-xs text-rose-400">{errText(putConfig.error)}</p>}
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-3 space-y-2">
          <p className="text-xs text-gray-400">{L("新增数据源", "Add source")}</p>
          <input
            className="w-full max-w-md rounded border border-admin-border bg-admin-surface px-2 py-1 text-sm text-white"
            placeholder={L("名称", "Name")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="w-full max-w-xl rounded border border-admin-border bg-admin-surface px-2 py-1 text-sm text-white"
            placeholder="https://…/crawler_sample_feed.json"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <textarea
            className="w-full min-h-[120px] rounded border border-admin-border bg-admin-surface p-2 text-xs text-zinc-400 font-mono"
            value={newCfg}
            onChange={(e) => setNewCfg(e.target.value)}
          />
          <button
            type="button"
            disabled={postSource.isPending || !newName.trim() || !newUrl.trim()}
            onClick={() => postSource.mutate()}
            className="rounded-lg bg-admin-btn/90 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {L("创建", "Create")}
          </button>
          {postSource.isError && <p className="text-xs text-rose-400">{errText(postSource.error)}</p>}
        </div>
      </section>

      <section className="rounded-xl border border-admin-border/90 p-4 space-y-3 bg-admin-bg/90">
        <h2 className="text-lg font-medium text-white">{L("执行任务", "Run job")}</h2>
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <label className="text-gray-400 flex items-center gap-2">
            {L("数据源", "Source")}
            <select
              className="rounded border border-admin-border bg-admin-surface px-2 py-1 text-white"
              value={runSourceId || ""}
              onChange={(e) => setRunSourceId(Number(e.target.value))}
            >
              <option value="">{L("请选择", "Select…")}</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-gray-400 flex items-center gap-2">
            <input type="checkbox" checked={runDry} onChange={(e) => setRunDry(e.target.checked)} />
            Dry-run
          </label>
          <label className="text-gray-400 flex items-center gap-2">
            {L("策略", "Strategy")}
            <select
              className="rounded border border-admin-border bg-admin-surface px-2 py-1 text-white"
              value={runStrategy}
              onChange={(e) => setRunStrategy(e.target.value)}
            >
              <option value="insert_only">insert_only</option>
              <option value="update_empty">update_empty</option>
              <option value="overwrite">overwrite</option>
            </select>
          </label>
          <label className="text-gray-400 flex items-center gap-2">
            max_items
            <input
              type="number"
              min={1}
              max={500}
              className="w-24 rounded border border-admin-border bg-admin-surface px-2 py-1 text-white"
              value={runMax}
              onChange={(e) => setRunMax(Number(e.target.value) || 100)}
            />
          </label>
          <button
            type="button"
            disabled={runJob.isPending || runSourceId <= 0}
            onClick={() => runJob.mutate()}
            className="rounded-lg bg-admin-btn/90 px-3 py-1.5 text-white disabled:opacity-50"
          >
            {L("运行", "Run")}
          </button>
        </div>
        {runJob.isError && <p className="text-xs text-rose-400">{errText(runJob.error)}</p>}
        {runJob.isSuccess && runJob.data != null ? (
          <pre className="text-xs text-gray-400 overflow-auto max-h-40 bg-black/20 p-2 rounded">
            {JSON.stringify(runJob.data as object, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="rounded-xl border border-admin-border/90 p-4 space-y-3 bg-admin-bg/90">
        <h2 className="text-lg font-medium text-white">{L("最近任务", "Recent jobs")}</h2>
        {jobsQ.isLoading && <p className="text-xs text-gray-400">{L("加载中…", "Loading…")}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead>
              <tr className="border-b border-admin-border/90">
                <th className="py-1 pr-2">id</th>
                <th className="py-1 pr-2">{L("源", "Src")}</th>
                <th className="py-1 pr-2">dry</th>
                <th className="py-1 pr-2">{L("状态", "Status")}</th>
                <th className="py-1 pr-2">{L("触发", "Trigger")}</th>
                <th className="py-1 pr-2">{L("条数", "Items")}</th>
                <th className="py-1 pr-2">{L("摘要", "Summary")}</th>
                <th className="py-1 pr-2" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-white/[0.05]">
                  <td className="py-1 pr-2 font-mono">{j.id}</td>
                  <td className="py-1 pr-2">{j.source_name || j.source_id}</td>
                  <td className="py-1 pr-2">{j.dry_run ? "Y" : "N"}</td>
                  <td className="py-1 pr-2">{j.status}</td>
                  <td className="py-1 pr-2 font-mono text-[10px]">{j.trigger_type || "manual"}</td>
                  <td className="py-1 pr-2 font-mono text-[10px]">
                    p{j.items_processed ?? 0}+i{j.items_committed_insert ?? 0}/u{j.items_committed_update ?? 0}
                  </td>
                  <td className="py-1 pr-2 max-w-xs truncate">{JSON.stringify(j.summary)}</td>
                  <td className="py-1 pr-2">
                    <button
                      type="button"
                      className="text-admin-link underline"
                      onClick={() => setSelJobId(j.id)}
                    >
                      {L("详情", "Detail")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selJobId != null && (
        <section className="rounded-xl border border-admin-border/90 p-4 space-y-3 bg-admin-bg/90">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-white">
              {L("任务详情", "Job detail")} #{selJobId}
            </h2>
            <button type="button" className="text-xs text-gray-400" onClick={() => setSelJobId(null)}>
              {L("关闭", "Close")}
            </button>
          </div>
          {jobQ.isLoading && <p className="text-xs text-gray-400">{L("加载中…", "Loading…")}</p>}
          {jobQ.data && (
            <div className="space-y-2 text-xs">
              <p className="text-gray-400">
                status: <span className="text-white">{String(jobQ.data.status)}</span> · trigger:{" "}
                <span className="text-white">{String(jobQ.data.trigger_type || "manual")}</span> · items:{" "}
                <span className="text-white">
                  processed {String(jobQ.data.items_processed ?? 0)}, ins {String(jobQ.data.items_committed_insert ?? 0)}
                  , upd {String(jobQ.data.items_committed_update ?? 0)}
                </span>
              </p>
              <p className="text-gray-400 break-all">
                feed: <span className="text-white">{String(jobQ.data.feed_url || "")}</span>
              </p>
              {jobQ.data.error_message ? (
                <p className="text-rose-400">{String(jobQ.data.error_message)}</p>
              ) : null}
              <div>
                <p className="text-gray-500 mb-1">log</p>
                <pre className="whitespace-pre-wrap text-gray-400 bg-black/25 p-2 rounded max-h-48 overflow-auto">
                  {String(jobQ.data.log_text || "")}
                </pre>
              </div>
              {String(jobQ.data.status) === "preview_ready" && (
                <button
                  type="button"
                  disabled={commitJob.isPending}
                  onClick={() => commitJob.mutate(selJobId)}
                  className="rounded-lg bg-emerald-700/80 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  {L("确认写入数据库", "Commit to database")}
                </button>
              )}
              {commitJob.isError && <p className="text-rose-400">{errText(commitJob.error)}</p>}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-400 mb-1">{L("预览行（前 100 条）", "Preview (first 100)")}</p>
            {previewQ.isLoading && <p className="text-xs text-gray-500">{L("加载中…", "Loading…")}</p>}
            {previewQ.data && (
              <pre className="text-[11px] text-zinc-400/90 bg-black/30 p-2 rounded overflow-auto max-h-96">
                {JSON.stringify(previewQ.data, null, 2)}
              </pre>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
