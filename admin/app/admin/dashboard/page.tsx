"use client";

/**
 * 管理后台首页：展示今日 PV/UV/UID、注册用户与工具数、待审核与举报评论等；
 * 折线图数据来自 GET /api/admin/dashboard/trend。
 */
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import Link from "next/link";
import { DateRangePicker } from "@/components/date-range-picker";
import { useAdminStore } from "@/lib/store";
import { apiGET } from "@/lib/admin-api";
import { useI18n } from "@/lib/i18n/context";
import { FieldHint } from "@/components/field-hint";
import { MetricCard } from "@/components/metric-card";
import { AlertCircle, Download } from "lucide-react";

const TrafficTrendChart = dynamic(
  () => import("@/components/traffic-trend-chart").then((m) => m.TrafficTrendChart),
  {
    ssr: false,
    loading: () => <div className="text-gray-500 text-sm h-80 flex items-center justify-center">…</div>,
  }
);

type Summary = {
  today: { pv: number; uv: number; uid: number; pct: { pv: number; uv: number; uid: number } };
  total_registered_users: number;
  total_active_tools: number;
  pending_tools: number;
  reported_reviews: number;
};

type Trend = { data: { date: string; pv: number; uv: number; uid: number }[] };

function csvEscape(value: string | number) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function AdminDashboardPage() {
  const token = useAdminStore((s) => s.token)!;
  const { t, locale } = useI18n(); // locale 给区间日历；t 含 fieldHelp
  const defaultTrend = useMemo(() => {
    const end = new Date(); // 今天
    const start = subDays(end, 29); // 含今日共 30 天
    return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") }; // 与旧默认 30 日窗对齐
  }, []);
  const [trendStart, setTrendStart] = useState(defaultTrend.start); // 趋势起日
  const [trendEnd, setTrendEnd] = useState(defaultTrend.end); // 趋势止日

  const quickTrend = (days: number) => {
    const end = new Date(); // 今日
    const start = subDays(end, days - 1); // 连续 N 日
    setTrendStart(format(start, "yyyy-MM-dd")); // 写回起点
    setTrendEnd(format(end, "yyyy-MM-dd")); // 写回终点
  };

  const presetActive = (days: number) => {
    const end = new Date(); // 参照今日
    const start = subDays(end, days - 1); // 快捷区间起点
    return trendStart === format(start, "yyyy-MM-dd") && trendEnd === format(end, "yyyy-MM-dd"); // 是否恰好等于该快捷
  };

  const { data: summary } = useQuery({
    queryKey: ["admin", "summary", token],
    queryFn: () => apiGET<Summary>("/api/admin/dashboard/summary", token),
    enabled: !!token,
  });

  const { data: trend } = useQuery({
    queryKey: ["admin", "trend", trendStart, trendEnd, token],
    queryFn: () =>
      apiGET<Trend>(
        `/api/admin/dashboard/trend?start_date=${encodeURIComponent(trendStart)}&end_date=${encodeURIComponent(trendEnd)}`,
        token
      ),
    enabled: !!token,
  });

  if (!summary) {
    return <div className="text-gray-500 text-sm">{t("dashboard.loading")}</div>;
  }

  const exportSummaryCsv = () => {
    const rows: Array<[string, string | number]> = [
      [t("dashboard.metricTodayPv"), summary.today.pv],
      [t("dashboard.metricTodayUv"), summary.today.uv],
      [t("dashboard.metricTodayUid"), summary.today.uid],
      [t("dashboard.metricRegisteredUsers"), summary.total_registered_users],
      [t("dashboard.metricActiveTools"), summary.total_active_tools],
      [t("dashboard.pendingTools"), summary.pending_tools],
      [t("dashboard.reportedReviews"), summary.reported_reviews],
    ];
    const body = rows.map(([k, v]) => `${csvEscape(k)},${csvEscape(v)}`).join("\n");
    const csv = `metric,value\n${body}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = summary.today;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("dashboard.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("dashboard.subtitle")}</p>
        </div>
        <div className="text-right max-w-md">
          <button
            type="button"
            onClick={exportSummaryCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-admin-border/90 bg-white/[0.04] px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.07]"
          >
            <Download className="w-4 h-4" />
            {t("dashboard.exportCsv")}
          </button>
          <FieldHint text={t("fieldHelp.dashboard.exportCsv")} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title={t("dashboard.metricTodayPv")}
          value={today.pv}
          pct={today.pct.pv}
          hint={t("fieldHelp.dashboard.todayPv")}
        />
        <MetricCard
          title={t("dashboard.metricTodayUv")}
          value={today.uv}
          pct={today.pct.uv}
          hint={t("fieldHelp.dashboard.todayUv")}
        />
        <MetricCard
          title={t("dashboard.metricTodayUid")}
          value={today.uid}
          pct={today.pct.uid}
          hint={t("fieldHelp.dashboard.todayUid")}
        />
        <MetricCard
          title={t("dashboard.metricRegisteredUsers")}
          value={summary.total_registered_users}
          sub={t("dashboard.subTotalRegistered")}
          hint={t("fieldHelp.dashboard.registeredUsers")}
        />
        <MetricCard
          title={t("dashboard.metricActiveTools")}
          value={summary.total_active_tools}
          sub={t("dashboard.subActiveTools")}
          hint={t("fieldHelp.dashboard.activeTools")}
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <Link
            href="/admin/tools"
            className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-200 hover:bg-amber-500/15"
          >
            <AlertCircle className="w-4 h-4" />
            {t("dashboard.pendingTools")}：{summary.pending_tools}
          </Link>
          <FieldHint text={t("fieldHelp.dashboard.pendingTools")} />
        </div>
        <div>
          <Link
            href="/admin/reviews"
            className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-rose-200 hover:bg-rose-500/15"
          >
            {t("dashboard.reportedReviews")}：{summary.reported_reviews}
          </Link>
          <FieldHint text={t("fieldHelp.dashboard.reportedReviews")} />
        </div>
      </div>

      <div className="rounded-xl border border-admin-border/90 bg-admin-surface/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h2 className="text-lg font-medium text-white">{t("dashboard.trafficTrend")}</h2>
            <FieldHint text={t("fieldHelp.dashboard.trafficTrend")} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker
              locale={locale}
              startDate={trendStart}
              endDate={trendEnd}
              label={t("dashboard.trendDateRange")}
              onRangeChange={(s, e) => {
                setTrendStart(s); // 自定义区间起点
                setTrendEnd(e); // 自定义区间终点
              }}
            />
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                title={t("fieldHelp.dashboard.rangeQuick")}
                onClick={() => quickTrend(d)}
                className={`px-3 py-1 rounded-md text-xs ${
                  presetActive(d)
                    ? "bg-white/[0.12] text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {t("dashboard.rangeDays", { n: d })}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 mb-3">
          <span>{t("fieldHelp.dashboard.trendRange")}</span>
        </div>
        {trend?.data?.length ? (
          <TrafficTrendChart
            data={trend.data}
            seriesNames={{ pv: t("chart.pv"), uv: t("chart.uv"), uid: t("chart.uid") }}
          />
        ) : (
          <p className="text-gray-500 text-sm">{t("dashboard.noTrend")}</p>
        )}
      </div>
    </div>
  );
}
