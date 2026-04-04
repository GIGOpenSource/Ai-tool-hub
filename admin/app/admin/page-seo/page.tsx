"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 服务端状态
import { useMemo, useState, useEffect } from "react"; // 本地筛选与选中 path
import { useAdminStore } from "@/lib/store"; // 管理员 token
import { apiGET, apiPUT } from "@/lib/admin-api"; // 受保护 API
import { FieldHint } from "@/components/field-hint"; // 字段说明
import { useI18n } from "@/lib/i18n/context"; // 后台界面语言

/** GET /api/admin/page-seo 响应结构（与 FastAPI 一致） */
type AdminPageSeoResponse = {
  paths: string[];
  path_labels: Record<string, { zh: string; en: string }>;
  entries: Record<string, Record<string, string>>;
};

/** 可编辑字段（与后端 _ALLOWED_ENTRY_KEYS 一致，便于表单生成） */
const EDIT_KEYS = [
  "title",
  "description",
  "keywords",
  "og_title",
  "og_description",
  "title_zh",
  "title_en",
  "description_zh",
  "description_en",
  "keywords_zh",
  "keywords_en",
  "og_title_zh",
  "og_title_en",
  "og_description_zh",
  "og_description_en",
  "og_image",
  "canonical",
  "og_url",
] as const;

/** 草稿里 noindex 字段是否为勾选态（兼容历史 true 文本） */
function parseNoindexDraft(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase(); // 规范化
  return s === "1" || s === "true" || s === "yes" || s === "on"; // 与前台解析一致
}

/** 与后端 normalize_page_path 一致：去 query/hash、去尾斜杠（根为 /） */
function normalizePathInput(raw: string): string {
  let p = raw.trim().split("?")[0]?.split("#")[0]?.trim() ?? ""; // 去掉 query 与 hash
  if (!p.startsWith("/")) p = `/${p}`; // 以内路径 leading slash
  const cut = p.replace(/\/+$/, ""); // 去掉尾部 /
  return cut === "" ? "/" : cut; // 空则当首页
}

export default function AdminPageSeoPage() {
  const token = useAdminStore((s) => s.token)!; // 登录后必有
  const { t } = useI18n(); // 文案
  const qc = useQueryClient(); // 失效缓存
  const [filter, setFilter] = useState(""); // 路径筛选关键字
  const [selected, setSelected] = useState<string | null>(null); // 当前编辑 path
  const [newPath, setNewPath] = useState(""); // 自定义新增 path 输入
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({}); // 工作副本

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "page-seo", token],
    queryFn: () => apiGET<AdminPageSeoResponse>("/api/admin/page-seo", token),
    enabled: !!token,
  });

  useEffect(() => {
    if (data?.entries) setDraft(data.entries); // 初次加载把工作副本设为服务端数据
  }, [data?.entries]);

  const displayPaths = useMemo(() => {
    const base = data?.paths ?? []; // 服务端汇总路径
    const extra = Object.keys(draft).filter((k) => !base.includes(k)); // 仅存在于草稿的新 path
    const merged = [...base, ...extra.sort()]; // 追加自定义 path
    const q = filter.trim().toLowerCase(); // 筛选词
    if (!q) return merged; // 无筛选
    return merged.filter((p) => p.toLowerCase().includes(q)); // 子串匹配
  }, [data?.paths, draft, filter]);

  const save = useMutation({
    mutationFn: () => apiPUT("/api/admin/page-seo", token, { entries: draft }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "page-seo"] }),
  });

  const row = selected ? draft[selected] ?? {} : {}; // 当前 path 已有字段

  const setField = (key: string, value: string) => {
    if (!selected) return; // 未选 path 不写入
    setDraft((prev) => {
      const next = { ...prev }; // 浅拷贝顶层
      const cur = { ...(next[selected] ?? {}) }; // 当前 path 条目
      const v = value.trim(); // 去空白
      if (v) cur[key] = v; // 非空则 set
      else delete cur[key]; // 空则删键
      if (Object.keys(cur).length === 0) delete next[selected]; // 空对象则删 path
      else next[selected] = cur; // 写回
      return next;
    });
  };

  const addCustomPath = () => {
    const raw = newPath.trim(); // 用户输入
    if (!raw) return; // 无输入忽略
    const norm = normalizePathInput(raw); // 与埋点、后台键一致
    setDraft((prev) => ({ ...prev, [norm]: { ...(prev[norm] ?? {}) } })); // 确保左侧列表出现该 path
    setSelected(norm); // 进入编辑
    setNewPath(""); // 清空输入
  };

  const keyLabel = (key: (typeof EDIT_KEYS)[number]): string => {
    const map: Record<(typeof EDIT_KEYS)[number], string> = {
      title: t("pageSeo.titleAny"),
      description: t("pageSeo.descAny"),
      keywords: t("pageSeo.kwAny"),
      og_title: t("pageSeo.ogTitleAny"),
      og_description: t("pageSeo.ogDescAny"),
      title_zh: t("pageSeo.titleZh"),
      title_en: t("pageSeo.titleEn"),
      description_zh: t("pageSeo.descZh"),
      description_en: t("pageSeo.descEn"),
      keywords_zh: t("pageSeo.kwZh"),
      keywords_en: t("pageSeo.kwEn"),
      og_title_zh: t("pageSeo.ogTitleZh"),
      og_title_en: t("pageSeo.ogTitleEn"),
      og_description_zh: t("pageSeo.ogDescZh"),
      og_description_en: t("pageSeo.ogDescEn"),
      og_image: t("pageSeo.ogImage"),
      canonical: t("pageSeo.canonical"),
      og_url: t("pageSeo.ogUrl"),
    };
    return map[key];
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="text-2xl font-semibold text-white">{t("pageSeo.title")}</h1>
      <p className="text-sm text-gray-500">{t("pageSeo.subtitle")}</p>

      {isLoading && <p className="text-gray-400 text-sm">{t("pageSeo.loading")}</p>}

      {!isLoading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-purple-500/25 bg-black/30 p-4 flex flex-col min-h-[420px]">
            <input
              type="search"
              className="w-full mb-1 rounded-lg bg-black/40 border border-purple-500/30 px-3 py-2 text-sm text-gray-200"
              placeholder={t("pageSeo.search")}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <FieldHint text={t("fieldHelp.pageSeo.filter")} />
            <div className="flex gap-2 mb-1 mt-3">
              <input
                type="text"
                className="flex-1 rounded-lg bg-black/40 border border-purple-500/30 px-3 py-2 text-xs text-gray-200"
                placeholder={t("pageSeo.addPathPlaceholder")}
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
              />
              <button
                type="button"
                onClick={addCustomPath}
                className="shrink-0 px-3 py-2 rounded-lg bg-purple-600/80 text-white text-xs"
              >
                {t("pageSeo.addPath")}
              </button>
            </div>
            <FieldHint text={t("fieldHelp.pageSeo.addPathRow")} />
            <div className="flex-1 overflow-auto space-y-1 text-sm max-h-[480px] mt-3">
              {displayPaths.map((p) => {
                const lbl = data.path_labels[p]; // 中英文名
                const active = selected === p; // 是否选中
                const hasSeo = !!draft[p] && Object.keys(draft[p]).length > 0; // 是否有覆盖
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelected(p)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      active
                        ? "border-cyan-500/50 bg-cyan-500/10 text-white"
                        : "border-transparent hover:bg-white/5 text-gray-300"
                    }`}
                  >
                    <div className="font-mono text-xs text-cyan-200/90 break-all">{p}</div>
                    {lbl && (
                      <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                        {lbl.zh} · {lbl.en}
                      </div>
                    )}
                    {hasSeo && <span className="text-[10px] text-emerald-400/90">●</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-purple-500/25 bg-black/30 p-4">
            <p className="text-xs text-gray-500 mb-4">{t("pageSeo.hintSelect")}</p>
            {selected ? (
              <div className="space-y-3">
                <p className="text-sm text-cyan-300/90 font-mono break-all">{selected}</p>
                <p className="text-xs text-gray-500">{t("pageSeo.fieldsHint")}</p>
                <div className="grid grid-cols-1 gap-2 max-h-[52vh] overflow-y-auto pr-1">
                  {EDIT_KEYS.map((key) => (
                    <label key={key} className="block text-xs text-gray-400">
                      <span className="text-[11px] text-gray-500 block mb-1">
                        {keyLabel(key)} <span className="text-gray-600 font-mono">({key})</span>
                      </span>
                      <FieldHint text={t(`fieldHelp.pageSeo.k.${key}`)} />
                      <input
                        type="text"
                        className="w-full rounded-lg bg-black/40 border border-purple-500/25 px-3 py-2 text-sm text-gray-100"
                        value={row[key] ?? ""}
                        onChange={(e) => setField(key, e.target.value)}
                      />
                    </label>
                  ))}
                  <label className="flex flex-col gap-1 text-xs text-gray-400 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-purple-500/40"
                        checked={parseNoindexDraft(row.noindex)}
                        onChange={(e) => setField("noindex", e.target.checked ? "1" : "")}
                      />
                      <span>
                        {t("pageSeo.noindex")} <span className="text-gray-600 font-mono">(noindex)</span>
                      </span>
                    </span>
                    <FieldHint text={t("fieldHelp.pageSeo.k.noindex")} />
                  </label>
                  <label className="block text-xs text-gray-400">
                    <span className="text-[11px] text-gray-500 block mb-1">
                      {t("pageSeo.ogType")} <span className="text-gray-600 font-mono">(og_type)</span>
                    </span>
                    <FieldHint text={t("fieldHelp.pageSeo.k.og_type")} />
                    <select
                      className="w-full rounded-lg bg-black/40 border border-purple-500/25 px-3 py-2 text-sm text-gray-100"
                      value={row.og_type ?? ""}
                      onChange={(e) => setField("og_type", e.target.value)}
                    >
                      <option value="">{t("pageSeo.ogTypeDef")}</option>
                      <option value="website">{t("pageSeo.ogTypeWebsite")}</option>
                      <option value="article">{t("pageSeo.ogTypeArticle")}</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t("pageSeo.hintSelect")}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || isLoading}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm disabled:opacity-50"
          >
            {save.isPending ? t("pageSeo.saving") : t("pageSeo.save")}
          </button>
          <FieldHint text={t("fieldHelp.pageSeo.save")} />
        </div>
        {save.isError && <p className="text-sm text-rose-400">{t("pageSeo.errSave")}</p>}
        {save.isSuccess && <p className="text-sm text-emerald-400">{t("pageSeo.success")}</p>}
      </div>
    </div>
  );
}
