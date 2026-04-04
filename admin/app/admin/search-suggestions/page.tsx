"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 列表与变更缓存
import { useMemo, useState } from "react"; // 表单状态
import { useAdminStore } from "@/lib/store"; // 管理员 JWT
import { apiDELETE, apiGET, apiPOST, apiPUT } from "@/lib/admin-api"; // REST 封装
import { useI18n } from "@/lib/i18n/context"; // 管理端语言

type Row = { id: number; text: string; sort_order: number }; // 与 GET items 元素一致

export default function AdminSearchSuggestionsPage() {
  const token = useAdminStore((s) => s.token)!; // 非空由 layout 保障
  const { t, locale: uiLocale } = useI18n(); // 侧栏键与页内双语
  const qc = useQueryClient(); // 失效查询用
  const [draftNew, setDraftNew] = useState({ text: "", sort_order: 0 }); // 新增草稿
  const [draftEdit, setDraftEdit] = useState<Row | null>(null); // 当前编辑行；null 表示未选

  const qkey = ["admin", "search-suggestions", token] as const; // react-query 键
  const { data, isLoading, error } = useQuery({
    queryKey: qkey, // 缓存键
    queryFn: async () => apiGET<{ items: Row[] }>("/api/admin/search-suggestions", token), // 拉全表
    enabled: !!token, // 有 token 才请求
  });

  const prettyError = useMemo(() => (error instanceof Error ? error.message : ""), [error]); // 展示用

  const invalidate = () => void qc.invalidateQueries({ queryKey: qkey }); // 统一刷新列表

  const postMut = useMutation({
    mutationFn: () =>
      apiPOST("/api/admin/search-suggestions", token, {
        text: draftNew.text.trim(), // 服务端再校验
        sort_order: Number(draftNew.sort_order) || 0, // 数字兜底
      }),
    onSuccess: () => {
      setDraftNew({ text: "", sort_order: 0 }); // 清空新增表单
      invalidate(); // 刷新表
    },
  });

  const putMut = useMutation({
    mutationFn: (row: Row) =>
      apiPUT("/api/admin/search-suggestions", token, {
        id: row.id, // 主键
        text: row.text.trim(), // 必带以简化后端分支
        sort_order: row.sort_order, // 同步排序
      }),
    onSuccess: () => {
      setDraftEdit(null); // 关闭编辑态
      invalidate(); // 刷新
    },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDELETE(`/api/admin/search-suggestions?id=${encodeURIComponent(String(id))}`, token), // 按 id 删
    onSuccess: () => {
      setDraftEdit(null); // 防指向已删行
      invalidate(); // 刷新
    },
  });

  const L = (zh: string, en: string) => (uiLocale === "zh" ? zh : en); // 页内短文案

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("sidebar.searchSuggestions")}</h1>
      <p className="text-sm text-gray-500">
        {L("维护首页搜索框联想词，对应公开接口 GET /api/search-suggestions。", "Manage homepage search hints; public API GET /api/search-suggestions.")}
      </p>

      <div className="rounded-xl border border-purple-500/20 p-4 space-y-2 bg-[#0a011890]">
        <p className="text-xs text-gray-400">{L("新增", "Add")}</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            className="rounded border border-purple-500/30 bg-[#120822] px-2 py-1 text-sm text-white min-w-[200px]"
            placeholder="text"
            value={draftNew.text}
            onChange={(e) => setDraftNew({ ...draftNew, text: e.target.value })}
          />
          <label className="text-xs text-gray-400 flex items-center gap-1">
            sort
            <input
              type="number"
              className="w-24 rounded border border-purple-500/30 bg-[#120822] px-2 py-1 text-sm text-white"
              value={draftNew.sort_order}
              onChange={(e) => setDraftNew({ ...draftNew, sort_order: Number(e.target.value) })}
            />
          </label>
          <button
            type="button"
            disabled={postMut.isPending || !draftNew.text.trim()}
            onClick={() => postMut.mutate()}
            className="rounded-lg bg-cyan-700/80 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {L("添加", "Add")}
          </button>
        </div>
        {postMut.isError && (
          <p className="text-rose-400 text-xs">{(postMut.error as Error).message}</p>
        )}
      </div>

      {draftEdit && (
        <div className="rounded-xl border border-cyan-500/30 p-4 space-y-2 bg-[#0a011890]">
          <p className="text-xs text-gray-400">
            {L("编辑 id=", "Edit id=")}
            {draftEdit.id}
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="rounded border border-purple-500/30 bg-[#120822] px-2 py-1 text-sm text-white min-w-[200px]"
              value={draftEdit.text}
              onChange={(e) => setDraftEdit({ ...draftEdit, text: e.target.value })}
            />
            <label className="text-xs text-gray-400 flex items-center gap-1">
              sort
              <input
                type="number"
                className="w-24 rounded border border-purple-500/30 bg-[#120822] px-2 py-1 text-sm text-white"
                value={draftEdit.sort_order}
                onChange={(e) => setDraftEdit({ ...draftEdit, sort_order: Number(e.target.value) })}
              />
            </label>
            <button
              type="button"
              disabled={putMut.isPending || !draftEdit.text.trim()}
              onClick={() => putMut.mutate(draftEdit)}
              className="rounded-lg bg-cyan-700/80 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {L("保存", "Save")}
            </button>
            <button
              type="button"
              onClick={() => setDraftEdit(null)}
              className="rounded-lg border border-purple-500/40 px-3 py-1.5 text-sm text-gray-300"
            >
              {L("取消", "Cancel")}
            </button>
          </div>
          {putMut.isError && (
            <p className="text-rose-400 text-xs">{(putMut.error as Error).message}</p>
          )}
        </div>
      )}

      {isLoading && <p className="text-gray-500 text-sm">…</p>}
      {prettyError && <p className="text-rose-400 text-sm">{prettyError}</p>}

      <div className="overflow-auto rounded-xl border border-purple-500/20">
        <table className="min-w-full text-sm text-left text-gray-200">
          <thead className="bg-purple-900/30 text-xs text-gray-400">
            <tr>
              <th className="px-3 py-2">id</th>
              <th className="px-3 py-2">text</th>
              <th className="px-3 py-2">sort_order</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((r) => (
              <tr key={r.id} className="border-t border-purple-500/10">
                <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-2 max-w-xl truncate" title={r.text}>
                  {r.text}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.sort_order}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-rose-400 text-xs hover:underline"
                    onClick={() => {
                      if (confirm(L("确认删除？", "Delete this row?"))) delMut.mutate(r.id);
                    }}
                  >
                    {L("删", "Del")}
                  </button>
                  <button
                    type="button"
                    className="text-cyan-400 text-xs ml-2 hover:underline"
                    onClick={() => setDraftEdit({ ...r })}
                  >
                    {L("编辑", "Edit")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {delMut.isError && (
        <p className="text-rose-400 text-xs">{(delMut.error as Error).message}</p>
      )}
    </div>
  );
}
