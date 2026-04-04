"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 列表、汇总与 PATCH
import Link from "next/link"; // 跳转工具编辑
import { useEffect, useMemo, useState } from "react"; // 展期输入同步
import { Download } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { ThHelp } from "@/components/th-help";
import { useAdminStore } from "@/lib/store";
import { apiGET, apiPATCH } from "@/lib/admin-api";
import { useI18n } from "@/lib/i18n/context";

type PaymentFilter = "all" | "pending" | "paid" | "refunded" | "cancelled"; // URL 查询与 Tab

type ORow = {
  order_id: number;
  tool_id: number;
  tool_name: string;
  tool_slug: string;
  purchaser_user_id: number;
  purchaser_email: string;
  amount_usd: number;
  payment_status: string;
  valid_from: string;
  valid_until: string;
  promo_pv: number;
  promo_uv: number;
  promo_uid: number;
  created_at: string;
};

type Summary = {
  total_orders: number;
  by_status: Record<string, number>;
  revenue_paid_usd: number;
  active_promotions: number;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD 本地对齐 UTC 日（管理端够用）
}

function isWindowActive(row: ORow): boolean {
  if (row.payment_status !== "paid") return false; // 未付不算推广中
  const t = todayISO(); // 今日
  return row.valid_from <= t && t <= row.valid_until; // 字符串比日期间 inclusize
}

function csvEscape(value: string | number) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function AdminMonetizationPage() {
  const token = useAdminStore((s) => s.token)!;
  const { t } = useI18n();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>("all"); // 支付状态筛选
  const [extendUntil, setExtendUntil] = useState<Record<number, string>>({}); // 每单展期草稿
  const [flash, setFlash] = useState<"ok" | "err" | null>(null); // 操作反馈

  const summaryQuery = useQuery({
    queryKey: ["admin", "monetization-summary", token],
    queryFn: () => apiGET<Summary>("/api/admin/monetization/summary", token),
    enabled: !!token,
  });

  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", statusFilter, token],
    queryFn: () => {
      const q =
        statusFilter === "all" ? "" : `?status=${encodeURIComponent(statusFilter)}`; // 筛选参数
      return apiGET<{ data: ORow[] }>(`/api/admin/monetization/orders${q}`, token);
    },
    enabled: !!token,
  });

  const patchMut = useMutation({
    mutationFn: async (args: { id: number; body: { payment_status?: string; valid_until?: string } }) => {
      await apiPATCH(`/api/admin/monetization/orders/${args.id}`, token, args.body); // 写库
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "orders"] }); // 刷新列表
      void qc.invalidateQueries({ queryKey: ["admin", "monetization-summary"] }); // 刷新汇总
      setFlash("ok"); // 成功提示
      window.setTimeout(() => setFlash(null), 2500); // 自动消失
    },
    onError: () => {
      setFlash("err"); // 失败提示
      window.setTimeout(() => setFlash(null), 4000);
    },
  });

  // 用 useMemo 稳定空数组引用，避免 data 未就绪时每帧新 [] 触发 effect 依赖抖动（exhaustive-deps）
  const rows = useMemo(() => ordersQuery.data?.data ?? [], [ordersQuery.data]);

  useEffect(() => {
    setExtendUntil((prev) => {
      const next = { ...prev }; // 合并展期草稿
      for (const r of rows) {
        if (next[r.order_id] === undefined) next[r.order_id] = r.valid_until; // 默认当前止日
      }
      return next;
    });
  }, [rows]);

  const exportCsv = () => {
    const headers = [
      "order_id",
      "tool_id",
      "tool_name",
      "tool_slug",
      "purchaser_user_id",
      "purchaser_email",
      "amount_usd",
      "payment_status",
      "valid_from",
      "valid_until",
      "created_at",
      "promo_pv",
      "promo_uv",
      "promo_uid",
    ];
    const body = rows
      .map((r) =>
        [
          r.order_id,
          r.tool_id,
          r.tool_name,
          r.tool_slug,
          r.purchaser_user_id,
          r.purchaser_email,
          r.amount_usd,
          r.payment_status,
          r.valid_from,
          r.valid_until,
          r.created_at,
          r.promo_pv,
          r.promo_uv,
          r.promo_uid,
        ]
          .map(csvEscape)
          .join(",")
      )
      .join("\n");
    const csv = `${headers.join(",")}\n${body}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monetization-orders-${statusFilter}-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = summaryQuery.data;
  const pendingCount = summary?.by_status?.pending ?? 0; // 待付笔数

  const filterTabs: { key: PaymentFilter; label: string }[] = useMemo(
    () => [
      { key: "all", label: t("monet.filterAll") },
      { key: "pending", label: t("monet.filterPending") },
      { key: "paid", label: t("monet.filterPaid") },
      { key: "refunded", label: t("monet.filterRefunded") },
      { key: "cancelled", label: t("monet.filterCancelled") },
    ],
    [t]
  );

  const setStatus = (s: PaymentFilter) => {
    setStatusFilter(s); // 切换筛选重拉列表
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("monet.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("monet.subtitle")}</p>
        </div>
        <div className="text-right">
          <button
            type="button"
            onClick={exportCsv}
            disabled={ordersQuery.isLoading || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-admin-border/90 bg-white/[0.04] px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.07] disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            {t("monet.exportCsv")}
          </button>
        </div>
      </div>

      {summaryQuery.isLoading ? (
        <p className="text-gray-500 text-sm">{t("monet.loading")}</p>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={t("monet.summaryTotal")}
            value={summary.total_orders}
            hint={t("fieldHelp.monet.summaryTotal")}
          />
          <MetricCard
            title={t("monet.summaryRevenue")}
            value={`$${summary.revenue_paid_usd.toFixed(2)}`}
            hint={t("fieldHelp.monet.summaryRevenue")}
          />
          <MetricCard
            title={t("monet.summaryActive")}
            value={summary.active_promotions}
            hint={t("fieldHelp.monet.summaryActive")}
          />
          <MetricCard
            title={t("monet.summaryPending")}
            value={pendingCount}
            hint={t("fieldHelp.monet.summaryPending")}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs ${
              statusFilter === tab.key ? "bg-white/10 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {flash === "ok" ? <p className="text-sm text-emerald-400">{t("monet.patchOk")}</p> : null}
      {flash === "err" ? <p className="text-sm text-rose-400">{t("monet.patchErr")}</p> : null}

      <div className="rounded-xl border border-admin-border/90 overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-admin-surface text-gray-400 text-left">
            <tr>
              <ThHelp title={t("monet.colOrder")} help={t("fieldHelp.monet.colOrder")} />
              <ThHelp title={t("monet.colTool")} help={t("fieldHelp.monet.colTool")} />
              <ThHelp title={t("monet.colToolId")} help={t("fieldHelp.monet.colToolId")} />
              <ThHelp title={t("monet.colBuyer")} help={t("fieldHelp.monet.colBuyer")} />
              <ThHelp title={t("monet.colBuyerId")} help={t("fieldHelp.monet.colBuyerId")} />
              <ThHelp title={t("monet.colAmount")} help={t("fieldHelp.monet.colAmount")} />
              <ThHelp title={t("monet.colPayment")} help={t("fieldHelp.monet.colPayment")} />
              <ThHelp title={t("monet.colValidity")} help={t("fieldHelp.monet.colValidity")} />
              <ThHelp title={t("monet.colCreated")} help={t("fieldHelp.monet.colCreated")} />
              <ThHelp title={t("monet.colPromo")} help={t("fieldHelp.monet.colPromo")} />
              <ThHelp title={t("monet.colWindow")} help={t("fieldHelp.monet.colWindow")} />
              <ThHelp title={t("monet.colActions")} help={t("fieldHelp.monet.colActions")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {ordersQuery.isLoading && (
              <tr>
                <td colSpan={12} className="p-4 text-gray-500">
                  {t("monet.loading")}
                </td>
              </tr>
            )}
            {!ordersQuery.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-gray-500">
                  {t("monet.emptyList")}
                </td>
              </tr>
            )}
            {!ordersQuery.isLoading &&
              rows.map((r) => (
                <tr key={r.order_id} className="hover:bg-white/[0.03]">
                  <td className="p-2 tabular-nums">{r.order_id}</td>
                  <td className="p-2">
                    <div className="text-gray-100">{r.tool_name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{r.tool_slug}</div>
                    <Link href={`/admin/tools/${r.tool_id}/edit`} className="text-[11px] text-admin-link hover:underline">
                      {t("monet.linkEditTool")}
                    </Link>
                  </td>
                  <td className="p-2 tabular-nums text-xs text-gray-400">{r.tool_id}</td>
                  <td className="p-2 text-xs text-gray-300">{r.purchaser_email}</td>
                  <td className="p-2 tabular-nums text-xs text-gray-400">{r.purchaser_user_id}</td>
                  <td className="p-2 tabular-nums">${r.amount_usd.toFixed(2)}</td>
                  <td className="p-2 text-xs uppercase">{r.payment_status}</td>
                  <td className="p-2 text-xs text-gray-400 whitespace-nowrap">
                    {r.valid_from} — {r.valid_until}
                  </td>
                  <td className="p-2 text-xs text-gray-500 whitespace-nowrap">{r.created_at}</td>
                  <td className="p-2 tabular-nums text-xs">
                    {r.promo_pv}/{r.promo_uv}/{r.promo_uid}
                  </td>
                  <td className="p-2 text-xs">
                    {r.payment_status === "paid" ? (
                      isWindowActive(r) ? (
                        <span className="text-emerald-400">{t("monet.badgeActive")}</span>
                      ) : (
                        <span className="text-gray-500">{t("monet.badgeExpired")}</span>
                      )
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="p-2 align-top">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(
                        [
                          ["pending", t("monet.filterPending")] as const,
                          ["paid", t("monet.filterPaid")] as const,
                          ["refunded", t("monet.filterRefunded")] as const,
                          ["cancelled", t("monet.filterCancelled")] as const,
                        ] as const
                      ).map(([st, label]) => (
                        <button
                          key={st}
                          type="button"
                          disabled={patchMut.isPending}
                          onClick={() => patchMut.mutate({ id: r.order_id, body: { payment_status: st } })}
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            r.payment_status === st ? "bg-admin-btn/35 text-gray-200" : "bg-white/10 text-gray-400 hover:bg-white/15"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className="w-full max-w-[12rem] rounded border border-admin-border/90 bg-black/30 px-2 py-1 text-[11px] text-gray-200"
                      placeholder={t("monet.extendPlaceholder")}
                      value={extendUntil[r.order_id] ?? r.valid_until}
                      onChange={(e) =>
                        setExtendUntil((prev) => ({ ...prev, [r.order_id]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      disabled={patchMut.isPending}
                      onClick={() =>
                        patchMut.mutate({
                          id: r.order_id,
                          body: {
                            valid_until: (extendUntil[r.order_id] ?? r.valid_until).trim() || r.valid_until,
                          },
                        })
                      }
                      className="mt-1 w-full rounded bg-admin-btn/80 py-1 text-[11px] text-white hover:bg-admin-btn-hover disabled:opacity-50"
                    >
                      {t("monet.extendSubmit")}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
