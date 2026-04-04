"use client";

import Link from "next/link"; // 返回列表
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 详情与删除
import { useParams } from "next/navigation"; // 动态 id
import { useAdminStore } from "@/lib/store"; // JWT
import { apiDELETE, apiGET } from "@/lib/admin-api"; // REST
import { useI18n } from "@/lib/i18n/context"; // 文案

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

export default function AdminAiInsightRunDetailPage() {
  const params = useParams(); // 路由参数
  const id = String(params.id ?? ""); // run id 字符串
  const token = useAdminStore((s) => s.token)!; // token
  const { t } = useI18n(); // t()
  const qc = useQueryClient(); // 缓存

  const q = useQuery({
    queryKey: ["admin", "ai-insights", "run", id, token] as const, // 键
    queryFn: () => apiGET<RunDetail>(`/api/admin/ai-insights/runs/${id}`, token), // GET
    enabled: !!token && !!id, // 条件
  }); // 查询

  const del = useMutation({
    mutationFn: () => apiDELETE(`/api/admin/ai-insights/runs/${id}`, token), // DELETE
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "ai-insights", "runs"] }); // 列表失效
      window.location.href = "/admin/ai-seo-insights"; // 回主 Tab 页（历史需手动再点）
    }, // 成功
  }); // mutation

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
        {d.created_at} · {d.admin_email} · {t("aiSeoInsights.duration")}: {d.duration_ms}ms ·{" "}
        {t("aiSeoInsights.tokens")}: {d.tokens_in ?? "—"} / {d.tokens_out ?? "—"}
      </p>
      <div>
        <h2 className="text-sm font-medium text-gray-300 mb-1">{t("aiSeoInsights.output")}</h2>
        <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-gray-100 min-h-[100px]">
          {d.output_text || "—"}
        </pre>
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
