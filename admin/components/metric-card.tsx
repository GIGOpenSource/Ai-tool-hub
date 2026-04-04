"use client";

import clsx from "clsx";
import { useI18n } from "@/lib/i18n/context";

export function MetricCard({
  title,
  value,
  sub,
  pct,
  hint,
}: {
  title: string;
  value: string | number;
  sub?: string;
  pct?: number;
  hint?: string; // 指标口径说明（fieldHelp）
}) {
  const { t } = useI18n();
  const up = pct !== undefined && pct >= 0;
  return (
    <div className="rounded-xl border border-purple-500/20 bg-[#120822]/60 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
      {hint ? <p className="text-[10px] text-gray-500 leading-snug mt-1 normal-case">{hint}</p> : null}
      <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      {pct !== undefined && (
        <p className={clsx("text-xs mt-1 font-medium", up ? "text-emerald-400" : "text-rose-400")}>
          {t("metric.vsYesterday")} {up ? "+" : ""}
          {pct}%
        </p>
      )}
    </div>
  );
}
