"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Download } from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import { FieldHint } from "@/components/field-hint";
import { ThHelp } from "@/components/th-help";
import { useAdminStore } from "@/lib/store";
import { apiGET } from "@/lib/admin-api";
import { useI18n } from "@/lib/i18n/context";

type Row = {
  page_path: string;
  page_name_zh: string;
  page_name_en: string;
  page_type: string;
  pv: number;
  uv: number;
  uid: number;
  avg_time_seconds: number;
  bounce_rate: number;
};

function csvEscape(value: string | number) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function AdminAnalyticsPage() {
  const token = useAdminStore((s) => s.token)!;
  const { t, locale } = useI18n(); // locale 传给区间日历
  const [sortBy, setSortBy] = useState<"pv" | "uv" | "uid">("pv");
  const [groupBy, setGroupBy] = useState<"path" | "type">("path");
  const defaultRange = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 13);
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const quickPick = (days: number) => {
    const end = new Date();
    const start = subDays(end, days - 1);
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "analytics", startDate, endDate, sortBy, token],
    queryFn: () =>
      apiGET<{ data: Row[] }>(
        `/api/admin/analytics/pages?start_date=${startDate}&end_date=${endDate}&sort_by=${sortBy}`,
        token
      ),
    enabled: !!token,
  });

  const typeRows = useMemo(() => {
    const grouped = new Map<
      string,
      { page_type: string; pv: number; uv: number; uid: number; avgWeighted: number; bounceWeighted: number }
    >();
    for (const r of data?.data ?? []) {
      const k = r.page_type || "other";
      const hit = grouped.get(k) ?? {
        page_type: k,
        pv: 0,
        uv: 0,
        uid: 0,
        avgWeighted: 0,
        bounceWeighted: 0,
      };
      hit.pv += r.pv;
      hit.uv += r.uv;
      hit.uid += r.uid;
      hit.avgWeighted += r.avg_time_seconds * r.pv;
      hit.bounceWeighted += r.bounce_rate * r.pv;
      grouped.set(k, hit);
    }
    const out = Array.from(grouped.values()).map((g) => ({
      page_type: g.page_type,
      pv: g.pv,
      uv: g.uv,
      uid: g.uid,
      avg_time_seconds: g.pv > 0 ? Math.round(g.avgWeighted / g.pv) : 0,
      bounce_rate: g.pv > 0 ? g.bounceWeighted / g.pv : 0,
    }));
    if (sortBy === "uv") out.sort((a, b) => b.uv - a.uv || a.page_type.localeCompare(b.page_type));
    else if (sortBy === "uid") out.sort((a, b) => b.uid - a.uid || a.page_type.localeCompare(b.page_type));
    else out.sort((a, b) => b.pv - a.pv || a.page_type.localeCompare(b.page_type));
    return out;
  }, [data?.data, sortBy]);

  const exportCsv = () => {
    const headers =
      groupBy === "type"
        ? ["page_type", "pv", "uv", "uid", "avg_time_seconds", "bounce_rate_percent"]
        : [
            "page_name_zh",
            "page_name_en",
            "page_path",
            "page_type",
            "pv",
            "uv",
            "uid",
            "avg_time_seconds",
            "bounce_rate_percent",
          ];
    const body =
      groupBy === "type"
        ? typeRows
            .map((r) =>
              [r.page_type, r.pv, r.uv, r.uid, r.avg_time_seconds, (r.bounce_rate * 100).toFixed(1)]
                .map(csvEscape)
                .join(",")
            )
            .join("\n")
        : (data?.data ?? [])
            .map((r) =>
              [
                r.page_name_zh,
                r.page_name_en,
                r.page_path,
                r.page_type,
                r.pv,
                r.uv,
                r.uid,
                r.avg_time_seconds,
                (r.bounce_rate * 100).toFixed(1),
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
    a.download = `page-analytics-${groupBy}-${startDate}-${endDate}-${sortBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("analytics.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("analytics.subtitle", { start: startDate, end: endDate })}
          </p>
        </div>
        <div className="text-right max-w-sm">
          <button
            type="button"
            onClick={exportCsv}
            disabled={isLoading || (data?.data?.length ?? 0) === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            {t("analytics.exportCsv")}
          </button>
          <FieldHint text={t("fieldHelp.analytics.exportCsv")} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <DateRangePicker
          locale={locale}
          startDate={startDate}
          endDate={endDate}
          label={t("analytics.dateRange")}
          onRangeChange={(s, e) => {
            setStartDate(s); // 区间起点
            setEndDate(e); // 区间终点
          }}
          />
          <FieldHint text={t("fieldHelp.analytics.dateRange")} />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              title={t("fieldHelp.analytics.quickDays")}
              onClick={() => quickPick(days)}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-300 hover:bg-white/10"
            >
              {t("analytics.quickDays", { n: String(days) })}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex gap-2 flex-wrap">
          {(["path", "type"] as const).map((k) => (
            <button
              key={k}
              type="button"
              title={k === "path" ? t("fieldHelp.analytics.groupByPath") : t("fieldHelp.analytics.groupByType")}
              onClick={() => setGroupBy(k)}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                groupBy === k ? "bg-purple-500/35 text-white" : "bg-white/5 text-gray-400"
              }`}
            >
              {k === "path" ? t("analytics.groupByPath") : t("analytics.groupByType")}
            </button>
          ))}
        </div>
        <FieldHint text={t("fieldHelp.analytics.groupByIntro")} />
      </div>

      <div className="space-y-1">
        <div className="flex gap-2 flex-wrap">
          {(["pv", "uv", "uid"] as const).map((k) => (
            <button
              key={k}
              type="button"
              title={t("fieldHelp.analytics.sortBy")}
              onClick={() => setSortBy(k)}
              className={`px-3 py-1.5 rounded-lg text-xs uppercase ${
                sortBy === k ? "bg-cyan-500/25 text-cyan-200" : "bg-white/5 text-gray-400"
              }`}
            >
              {t("analytics.sortBy", { key: k })}
            </button>
          ))}
        </div>
        <FieldHint text={t("fieldHelp.analytics.sortBy")} />
      </div>

      <div className="rounded-xl border border-purple-500/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#120822] text-left text-gray-400">
            <tr>
              <ThHelp title={t("analytics.colType")} help={t("fieldHelp.analytics.colType")} />
              {groupBy === "path" && (
                <ThHelp title={t("analytics.colPageNameZh")} help={t("fieldHelp.analytics.colPageNameZh")} />
              )}
              {groupBy === "path" && (
                <ThHelp title={t("analytics.colPath")} help={t("fieldHelp.analytics.colPath")} />
              )}
              <ThHelp title={t("analytics.colPv")} help={t("fieldHelp.analytics.colPv")} />
              <ThHelp title={t("analytics.colUv")} help={t("fieldHelp.analytics.colUv")} />
              <ThHelp title={t("analytics.colUid")} help={t("fieldHelp.analytics.colUid")} />
              <ThHelp title={t("analytics.colAvgTime")} help={t("fieldHelp.analytics.colAvgTime")} />
              <ThHelp title={t("analytics.colBounce")} help={t("fieldHelp.analytics.colBounce")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {isLoading && (
              <tr>
                <td colSpan={groupBy === "path" ? 8 : 6} className="p-6 text-gray-500">
                  {t("analytics.loading")}
                </td>
              </tr>
            )}
            {!isLoading &&
              groupBy === "path" &&
              (data?.data ?? []).map((r) => (
                <tr key={r.page_path} className="hover:bg-white/[0.03]">
                  <td className="p-3 text-gray-400">{r.page_type}</td>
                  <td className="p-3 text-gray-200 max-w-[14rem]">{r.page_name_zh}</td>
                  <td className="p-3 text-cyan-100/90 font-mono text-xs">{r.page_path}</td>
                  <td className="p-3 tabular-nums">{r.pv}</td>
                  <td className="p-3 tabular-nums">{r.uv}</td>
                  <td className="p-3 tabular-nums">{r.uid}</td>
                  <td className="p-3 tabular-nums">{r.avg_time_seconds}</td>
                  <td className="p-3 tabular-nums">{(r.bounce_rate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            {!isLoading &&
              groupBy === "type" &&
              typeRows.map((r) => (
                <tr key={r.page_type} className="hover:bg-white/[0.03]">
                  <td className="p-3 text-gray-300">{r.page_type}</td>
                  <td className="p-3 tabular-nums">{r.pv}</td>
                  <td className="p-3 tabular-nums">{r.uv}</td>
                  <td className="p-3 tabular-nums">{r.uid}</td>
                  <td className="p-3 tabular-nums">{r.avg_time_seconds}</td>
                  <td className="p-3 tabular-nums">{(r.bounce_rate * 100).toFixed(1)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
