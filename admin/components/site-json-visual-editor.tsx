"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"; // 受控表单、同步嵌套 JSON 文本

/** sitemap 静态条目中一行（与种子 seo_sitemap_static.urls 一致） */
export type SeoStaticUrlRow = { path: string; priority: string; changefreq: string };

/** 将任意值规范成站点块用的对象，避免 null/非对象 */
function asObject(v: unknown): Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return {}; // 非法则空对象
  return v as Record<string, unknown>; // 下游按 Record 编辑
}

/** 判断除 Object 外是否可作为「标量」单行编辑 */
function isScalar(v: unknown): v is string | number | boolean {
  const t = typeof v; // 运行时类型
  return t === "string" || t === "number" || t === "boolean"; // 三类可简单控件
}

/** 从 payload 读出 urls 数组并规范化 */
function readUrlRows(payload: Record<string, unknown>): SeoStaticUrlRow[] {
  const raw = payload.urls; // 约定键名 urls
  if (!Array.isArray(raw)) return [{ path: "/", priority: "0.8", changefreq: "weekly" }]; // 默认一行
  const rows: SeoStaticUrlRow[] = []; // 累加
  for (const item of raw) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>; // 单行对象
      rows.push({
        path: typeof o.path === "string" ? o.path : "/", // 路径
        priority: typeof o.priority === "string" ? o.priority : "0.5", // priority 字符串化
        changefreq: typeof o.changefreq === "string" ? o.changefreq : "weekly", // 变更频率
      });
    }
  }
  return rows.length ? rows : [{ path: "/", priority: "0.8", changefreq: "weekly" }]; // 至少一行
}

/** SEO 静态路径表：仅编辑 seo_sitemap_static.urls */
function SeoSitemapTable({
  payload,
  onChange,
  labels,
}: {
  payload: Record<string, unknown>; // 整块
  onChange: (next: Record<string, unknown>) => void; // 回写整块
  labels: {
    path: string; // 列标题
    priority: string;
    changefreq: string;
    addRow: string;
    remove: string;
  };
}) {
  const rows = useMemo(() => readUrlRows(payload), [payload]); // 由 props 派生行
  const setRows = useCallback(
    (nextRows: SeoStaticUrlRow[]) => {
      const rest = { ...payload }; // 拷贝保留其它键
      delete rest.urls; // 先删旧（若有）
      onChange({ ...rest, urls: nextRows }); // 写回 urls
    },
    [payload, onChange],
  ); // 稳定回调

  return (
    <div className="space-y-3 rounded-xl border border-admin-border/90 bg-admin-bg/90 p-4">
      <p className="text-xs text-gray-500">{labels.path} / {labels.priority} / {labels.changefreq}</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              className="min-w-[140px] flex-1 rounded-lg border border-admin-border bg-admin-bg px-2 py-1.5 text-sm text-white"
              value={row.path}
              onChange={(e) => {
                const cp = rows.slice(); // 拷贝
                cp[i] = { ...cp[i], path: e.target.value }; // 更新 path
                setRows(cp); // 提交
              }}
            />
            <input
              className="w-24 rounded-lg border border-admin-border bg-admin-bg px-2 py-1.5 text-sm text-white"
              value={row.priority}
              onChange={(e) => {
                const cp = rows.slice();
                cp[i] = { ...cp[i], priority: e.target.value };
                setRows(cp);
              }}
            />
            <input
              className="w-28 rounded-lg border border-admin-border bg-admin-bg px-2 py-1.5 text-sm text-white"
              value={row.changefreq}
              onChange={(e) => {
                const cp = rows.slice();
                cp[i] = { ...cp[i], changefreq: e.target.value };
                setRows(cp);
              }}
            />
            <button
              type="button"
              className="rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
            >
              {labels.remove}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="rounded-lg border border-admin-border px-3 py-1.5 text-sm text-admin-accent hover:bg-white/[0.04]"
        onClick={() => setRows([...rows, { path: "/", priority: "0.5", changefreq: "monthly" }])}
      >
        {labels.addRow}
      </button>
    </div>
  );
}

/** 单层键值：标量用输入框；嵌套用可折叠 JSON */
function FirstLevelFields({
  payload,
  onChange,
  labels,
  syncSig,
}: {
  payload: Record<string, unknown>; // 当前块
  onChange: (next: Record<string, unknown>) => void; // 整体替换
  labels: {
    nestedHint: string; // 折叠说明
    errNested: string; // 解析失败
  };
  syncSig: string; // 仅随服务端拉包变化；避免改标量时冲掉未失焦的嵌套草稿
}) {
  const keys = useMemo(() => Object.keys(payload).sort(), [payload]); // 排序键名
  const [nestedErr, setNestedErr] = useState<Record<string, string>>({}); // 各嵌套段错误
  const [nestedText, setNestedText] = useState<Record<string, string>>({}); // 嵌套段编辑文本

  useEffect(() => {
    const next: Record<string, string> = {}; // 由本轮渲染的 payload 重建（与 syncSig 同源）
    for (const k of Object.keys(payload)) {
      const v = payload[k]; // 逐项
      if (!isScalar(v)) next[k] = JSON.stringify(v, null, 2); // 对象/数组入文本
    }
    setNestedText(next); // 换块或保存后重拉时与服务端对齐
    setNestedErr({}); // 清空校验提示
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随 syncSig 节拍重置，避免改标量时冲掉未失焦的嵌套编辑
  }, [syncSig]);

  const patchScalar = useCallback(
    (k: string, v: string | number | boolean) => {
      onChange({ ...payload, [k]: v }); // 浅合并标量
    },
    [payload, onChange],
  ); // 更新标量

  return (
    <div className="space-y-4">
      {keys.length === 0 && <p className="text-sm text-gray-500">{labels.nestedHint}</p>}
      {keys.map((k) => {
        const v = payload[k]; // 当前值
        if (isScalar(v)) {
          if (typeof v === "boolean") {
            return (
              <label key={k} className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={v}
                  onChange={(e) => patchScalar(k, e.target.checked)}
                  className="rounded border-admin-border"
                />
                <span className="font-mono text-admin-accent">{k}</span>
              </label>
            );
          }
          if (typeof v === "number") {
            return (
              <label key={k} className="block space-y-1">
                <span className="text-xs text-gray-400 font-mono">{k}</span>
                <input
                  type="number"
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-2 py-1.5 text-sm text-white"
                  value={Number.isFinite(v) ? v : 0}
                  onChange={(e) => patchScalar(k, e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </label>
            );
          }
          const long = String(v).length > 80 || String(v).includes("\n"); // 长文本用 textarea
          return (
            <label key={k} className="block space-y-1">
              <span className="text-xs text-gray-400 font-mono">{k}</span>
              {long ? (
                <textarea
                  className="min-h-[72px] w-full rounded-lg border border-admin-border bg-admin-bg px-2 py-1.5 text-sm text-white"
                  value={String(v)}
                  onChange={(e) => patchScalar(k, e.target.value)}
                />
              ) : (
                <input
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-2 py-1.5 text-sm text-white"
                  value={String(v)}
                  onChange={(e) => patchScalar(k, e.target.value)}
                />
              )}
            </label>
          );
        }
        return (
          <details key={k} className="rounded-lg border border-admin-border/90 bg-admin-bg/60 p-3 open:border-admin-border">
            <summary className="cursor-pointer text-sm font-mono text-amber-200/90">
              {k} <span className="text-xs text-gray-500">({labels.nestedHint})</span>
            </summary>
            <textarea
              className="mt-2 min-h-[160px] w-full font-mono text-xs rounded-lg border border-admin-border/90 bg-admin-bg p-2 text-gray-100"
              spellCheck={false}
              value={nestedText[k] ?? ""}
              onChange={(e) => setNestedText((prev) => ({ ...prev, [k]: e.target.value }))}
              onBlur={() => {
                const raw = nestedText[k] ?? ""; // 当前文本
                try {
                  const parsed = JSON.parse(raw) as unknown; // 解析嵌套
                  onChange({ ...payload, [k]: parsed }); // 写回
                  setNestedErr((prev) => {
                    const n = { ...prev }; // 拷贝
                    delete n[k]; // 清错
                    return n;
                  });
                } catch {
                  setNestedErr((prev) => ({ ...prev, [k]: labels.errNested })); // 记录错
                }
              }}
            />
            {nestedErr[k] && <p className="mt-1 text-xs text-rose-400">{nestedErr[k]}</p>}
          </details>
        );
      })}
    </div>
  );
}

type VisualLabels = {
  seoPath: string;
  seoPriority: string;
  seoChangefreq: string;
  seoAddRow: string;
  seoRemove: string;
  nestedHint: string;
  errNested: string;
};

/** 站点块可视化壳：按 blockKey 分派表格或首层表单 */
export function SiteJsonVisualEditor({
  blockKey,
  payload,
  onChange,
  syncSig,
  labels,
}: {
  blockKey: string; // 当前 site_json 键
  payload: Record<string, unknown>; // 当前草稿
  onChange: (next: Record<string, unknown>) => void; // 统一回写
  syncSig: string; // 与服务端快照同步的节拍（见 page serverSyncSig）
  labels: VisualLabels; // 文案
}): ReactNode {
  const safe = useMemo(() => asObject(payload), [payload]); // 规范化
  if (blockKey === "seo_sitemap_static") {
    return (
      <SeoSitemapTable
        payload={safe}
        onChange={onChange}
        labels={{
          path: labels.seoPath,
          priority: labels.seoPriority,
          changefreq: labels.seoChangefreq,
          addRow: labels.seoAddRow,
          remove: labels.seoRemove,
        }}
      />
    );
  }
  return (
    <FirstLevelFields
      payload={safe}
      onChange={onChange}
      syncSig={syncSig}
      labels={{ nestedHint: labels.nestedHint, errNested: labels.errNested }}
    />
  );
}
