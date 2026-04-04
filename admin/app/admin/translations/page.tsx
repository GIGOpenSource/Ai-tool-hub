"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // CRUD 缓存
import { useMemo, useRef, useState } from "react"; // 表单与隐藏 file input
import { useAdminStore } from "@/lib/store"; // JWT
import { apiDELETE, apiGET, apiPUT } from "@/lib/admin-api"; // REST
import { useI18n } from "@/lib/i18n/context"; // 文案

type Row = { locale: string; msg_key: string; msg_value: string }; // 与 GET 项一致

type ExportJson = { format?: string; count?: number; items: Row[] }; // GET /translations/export?format=json

export default function AdminTranslationsPage() {
  const token = useAdminStore((s) => s.token)!; // 管理员 token
  const { locale: uiLocale } = useI18n(); // zh / en
  const qc = useQueryClient(); // react-query 客户端
  const fileRef = useRef<HTMLInputElement>(null); // 选文件导入
  const [filterLocale, setFilterLocale] = useState(""); // 可选过滤 language
  const [edit, setEdit] = useState<Row>({ locale: "en", msg_key: "", msg_value: "" }); // 单条编辑草稿
  const [replaceLocale, setReplaceLocale] = useState(""); // 导入前可选清空该语言全部键
  const [bulkMsg, setBulkMsg] = useState(""); // 导入/导出结果提示

  const qkey = ["admin", "translations", filterLocale, token] as const; // 查询键
  const { data, isLoading, error } = useQuery({
    queryKey: qkey,
    queryFn: async () => {
      const q = filterLocale.trim() ? `?locale=${encodeURIComponent(filterLocale.trim())}` : ""; // 拼查询串
      return apiGET<{ items: Row[] }>(`/api/admin/translations${q}`, token); // 列表
    },
    enabled: !!token,
  });

  const prettyError = useMemo(() => (error instanceof Error ? error.message : ""), [error]);

  const save = useMutation({
    mutationFn: () => apiPUT(`/api/admin/translations`, token, edit), // upsert
    onSuccess: () => void qc.invalidateQueries({ queryKey: qkey }),
  });

  const del = useMutation({
    mutationFn: (r: Row) =>
      apiDELETE(
        `/api/admin/translations?locale=${encodeURIComponent(r.locale)}&msg_key=${encodeURIComponent(r.msg_key)}`,
        token
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qkey }),
  });

  const L = (zh: string, en: string) => (uiLocale === "zh" ? zh : en); // 页内短双语文案

  const downloadBlob = (name: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime }); // 文件体
    const url = URL.createObjectURL(blob); // 临时 URL
    const a = document.createElement("a"); // 触发下载
    a.href = url; // 绑定
    a.download = name; // 文件名
    a.click(); // 打开保存对话框
    URL.revokeObjectURL(url); // 释放
  };

  const exportJson = async () => {
    setBulkMsg(""); // 清旧提示
    const q = filterLocale.trim() ? `?locale=${encodeURIComponent(filterLocale.trim())}&format=json` : "?format=json"; // 随列表筛选语言
    const data = await apiGET<ExportJson>(`/api/admin/translations/export${q}`, token); // 拉 JSON 包
    const body = JSON.stringify(data, null, 2); // 可读缩进
    downloadBlob(`translations${filterLocale.trim() ? `-${filterLocale.trim()}` : ""}.json`, body, "application/json"); // 落盘
    setBulkMsg(L(`已导出 ${data.count ?? data.items?.length ?? 0} 条`, `Exported ${data.count ?? data.items?.length ?? 0} rows`)); // 反馈
  };

  const exportNdjson = async () => {
    setBulkMsg(""); // 清旧提示
    const q = filterLocale.trim()
      ? `?locale=${encodeURIComponent(filterLocale.trim())}&format=ndjson`
      : "?format=ndjson"; // NDJSON
    const res = await fetch(`/api/admin/translations/export${q}`, { headers: { Authorization: `Bearer ${token}` } }); // 原文响应
    if (!res.ok) throw new Error(`${res.status}`); // 失败
    const text = await res.text(); // 行分隔 JSON
    downloadBlob(`translations${filterLocale.trim() ? `-${filterLocale.trim()}` : ""}.ndjson`, text, "application/x-ndjson"); // 下载
    const lines = text.trim() ? text.trim().split("\n").length : 0; // 粗计行数
    setBulkMsg(L(`已导出 ${lines} 行 NDJSON`, `Exported ${lines} NDJSON lines`)); // 反馈
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{L("多语言词条", "Translations")}</h1>
      <p className="text-sm text-gray-500">{L("按 locale + msg_key upsert；删除仅移除一行。", "Upsert by locale + msg_key; delete removes one row.")}</p>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-gray-400">
          filter locale
          <input
            className="ml-2 rounded border border-purple-500/30 bg-[#0a011890] px-2 py-1 text-sm text-white"
            value={filterLocale}
            onChange={(e) => setFilterLocale(e.target.value)}
            placeholder="en | zh | …"
          />
        </label>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4 space-y-3 max-w-3xl">
        <p className="text-xs text-gray-400 font-medium text-cyan-200/90">{L("批量导入/导出", "Bulk import / export")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/10"
            onClick={() => void exportJson().catch((e) => setBulkMsg(String(e)))}
          >
            {L("导出 JSON", "Export JSON")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/10"
            onClick={() => void exportNdjson().catch((e) => setBulkMsg(String(e)))}
          >
            {L("导出 NDJSON", "Export NDJSON")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-purple-500/40 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-500/10"
            onClick={() => fileRef.current?.click()}
          >
            {L("选择文件导入…", "Choose file to import…")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.ndjson,application/json,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]; // 单文件
              e.target.value = ""; // 允许重复选同一文件
              if (!f) return; // 取消
              const reader = new FileReader(); // 读文本
              reader.onload = () => {
                const text = String(reader.result ?? ""); // 全文
                void (async () => {
                  const postItems = async (items: Row[]) => {
                    const q = replaceLocale.trim() ? `?replace_locale=${encodeURIComponent(replaceLocale.trim())}` : ""; // 可选清空语言
                    const res = await fetch(`/api/admin/translations/import${q}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ items }),
                    }); // 批量 upsert
                    if (!res.ok) throw new Error(`import ${res.status}`); // HTTP
                    const out = (await res.json()) as { upserted?: number }; // 条数
                    void qc.invalidateQueries({ queryKey: qkey }); // 刷新表格
                    setBulkMsg(L(`已写入 ${out.upserted ?? 0} 条`, `Upserted ${out.upserted ?? 0} rows`)); // 提示
                  };
                  try {
                    const parsed = JSON.parse(text) as unknown; // 先试整文件 JSON
                    if (Array.isArray(parsed)) {
                      await postItems(parsed as Row[]); // 纯数组导出
                      return; // 完成
                    }
                    if (parsed && typeof parsed === "object" && Array.isArray((parsed as ExportJson).items)) {
                      await postItems((parsed as ExportJson).items); // { items } 导出包
                      return; // 完成
                    }
                  } catch {
                    /* 非单一 JSON，走 NDJSON 行解析 */
                  }
                  const lines = text.trim().split("\n").filter(Boolean); // 按行
                  const items: Row[] = []; // 累加
                  for (const line of lines) items.push(JSON.parse(line) as Row); // 每行一对象
                  await postItems(items); // 提交
                })().catch((err) => setBulkMsg(String(err))); // 任一步失败上屏
              };
              reader.readAsText(f); // 异步读
            }}
          />
        </div>
        <label className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          {L("导入前删除整语言（可选，填 locale）", "Delete locale before import (optional)")}
          <input
            className="rounded border border-purple-500/30 bg-[#0a011890] px-2 py-1 text-sm text-white w-28"
            value={replaceLocale}
            onChange={(e) => setReplaceLocale(e.target.value)}
            placeholder="en"
          />
        </label>
        {bulkMsg && <p className="text-xs text-emerald-300/90">{bulkMsg}</p>}
      </div>

      <div className="rounded-xl border border-purple-500/20 p-4 space-y-2 bg-[#0a011890]">
        <p className="text-xs text-gray-400">{L("新增/更新", "Add / update")}</p>
        <div className="grid md:grid-cols-3 gap-2">
          <input
            className="rounded border border-purple-500/30 bg-[#120822] px-2 py-1 text-sm text-white"
            placeholder="locale"
            value={edit.locale}
            onChange={(e) => setEdit({ ...edit, locale: e.target.value })}
          />
          <input
            className="rounded border border-purple-500/30 bg-[#120822] px-2 py-1 text-sm text-white"
            placeholder="msg_key"
            value={edit.msg_key}
            onChange={(e) => setEdit({ ...edit, msg_key: e.target.value })}
          />
          <input
            className="rounded border border-purple-500/30 bg-[#120822] px-2 py-1 text-sm text-white md:col-span-3"
            placeholder="msg_value"
            value={edit.msg_value}
            onChange={(e) => setEdit({ ...edit, msg_value: e.target.value })}
          />
        </div>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate()}
          className="rounded-lg bg-cyan-700/80 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {L("保存", "Save")}
        </button>
        {save.isError && <p className="text-rose-400 text-xs">{(save.error as Error).message}</p>}
      </div>

      {isLoading && <p className="text-gray-500 text-sm">…</p>}
      {prettyError && <p className="text-rose-400 text-sm">{prettyError}</p>}

      <div className="overflow-auto rounded-xl border border-purple-500/20">
        <table className="min-w-full text-sm text-left text-gray-200">
          <thead className="bg-purple-900/30 text-xs text-gray-400">
            <tr>
              <th className="px-3 py-2">locale</th>
              <th className="px-3 py-2">msg_key</th>
              <th className="px-3 py-2">msg_value</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((r) => (
              <tr key={`${r.locale}\0${r.msg_key}`} className="border-t border-purple-500/10">
                <td className="px-3 py-2 font-mono text-xs">{r.locale}</td>
                <td className="px-3 py-2 font-mono text-xs max-w-[200px] truncate" title={r.msg_key}>
                  {r.msg_key}
                </td>
                <td className="px-3 py-2 max-w-xl truncate" title={r.msg_value}>
                  {r.msg_value}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-rose-400 text-xs hover:underline"
                    onClick={() => {
                      if (confirm(L("确认删除？", "Delete this row?"))) del.mutate(r);
                    }}
                  >
                    {L("删", "Del")}
                  </button>
                  <button
                    type="button"
                    className="text-cyan-400 text-xs ml-2 hover:underline"
                    onClick={() => setEdit({ locale: r.locale, msg_key: r.msg_key, msg_value: r.msg_value })}
                  >
                    {L("编辑", "Edit")}
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
