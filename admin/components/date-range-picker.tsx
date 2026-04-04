"use client";

import { useEffect, useMemo, useRef, useState } from "react"; // 弹层、外点关闭、受控区间
import { format, parse } from "date-fns"; // 与后台统一的 yyyy-MM-dd
import { enUS, zhCN } from "date-fns/locale"; // DayPicker 月份/星期文案
import { CalendarRange } from "lucide-react"; // 触发按钮图标
import { DayPicker, type DateRange } from "react-day-picker"; // 区间模式日历
import "react-day-picker/style.css"; // 官方基础样式，再由 globals .rdp-admin-scope 覆盖色盘
import type { AdminLocale } from "@/lib/i18n/messages"; // 与后台语言开关一致

export type DateRangePickerProps = {
  locale: AdminLocale; // zh | en
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onRangeChange: (start: string, end: string) => void; // 选定完整区间后回传
  label: string; // 按钮 aria 与标题
  className?: string; // 外层可选 class
};

function parseYmd(s: string): Date | undefined {
  try {
    const d = parse(s, "yyyy-MM-dd", new Date()); // 本地午夜解析
    if (Number.isNaN(d.getTime())) return undefined; // 非法则放弃
    return d;
  } catch {
    return undefined;
  }
}

export function DateRangePicker({
  locale,
  startDate,
  endDate,
  onRangeChange,
  label,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false); // 弹层开关
  const rootRef = useRef<HTMLDivElement | null>(null); // 外点判断根
  const dfLocale = locale === "zh" ? zhCN : enUS; // DayPicker locale

  const selected: DateRange | undefined = useMemo(() => {
    const from = parseYmd(startDate); // 起
    const to = parseYmd(endDate); // 止
    if (!from || !to) return undefined; // 缺一不渲染选中
    return { from, to }; // 受控选中区间
  }, [startDate, endDate]);

  useEffect(() => {
    if (!open) return; // 仅打开时监听
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current; // 当前根
      if (el && !el.contains(e.target as Node)) setOpen(false); // 点击外部关闭
    };
    document.addEventListener("mousedown", onDoc); // 捕获阶段用默认冒泡即可
    return () => document.removeEventListener("mousedown", onDoc); // 卸载清理
  }, [open]);

  const display = `${startDate} — ${endDate}`; // 按钮上展示原文本区间

  return (
    <div ref={rootRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-black/30 px-3 py-1.5 text-sm text-gray-200 hover:border-cyan-500/40 hover:bg-purple-900/20"
      >
        <CalendarRange className="w-4 h-4 text-cyan-300 shrink-0" />
        <span className="tabular-nums">{display}</span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-purple-500/30 bg-[#120822] p-3 shadow-xl rdp-admin-scope"
        >
          <div className="mb-2 text-xs font-medium text-gray-400">{label}</div>
          <DayPicker
            mode="range"
            numberOfMonths={2}
            locale={dfLocale}
            selected={selected}
            disabled={{ after: new Date() }} // 不可选未来日
            onSelect={(r) => {
              if (!r?.from || !r?.to) return; // 待用户点满两端
              let a = r.from; // 可能乱序
              let b = r.to;
              if (b < a) [a, b] = [b, a]; // 归一化
              onRangeChange(format(a, "yyyy-MM-dd"), format(b, "yyyy-MM-dd")); // 写回父级
              setOpen(false); // 选定后收起
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
