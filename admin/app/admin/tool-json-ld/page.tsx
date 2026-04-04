"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 读写字典缓存
import { useEffect, useMemo, useState } from "react"; // global_merge 文本与全量载荷
import { Braces } from "lucide-react"; // 页头图标
import { useAdminStore } from "@/lib/store"; // 管理员 JWT
import { apiGET, apiPUT } from "@/lib/admin-api"; // site_json 白名单 API
import { useI18n } from "@/lib/i18n/context"; // 侧栏与页内语言

const JSONLD_KEY = "seo_tool_json_ld" as const; // 与 admin_site_json._ALLOWED_KEYS、前台 GET 路径一致

export default function AdminToolJsonLdPage() {
  const token = useAdminStore((s) => s.token)!; // Shell 已校验登录
  const { locale } = useI18n(); // zh / en
  const qc = useQueryClient(); // 保存后失效查询
  const [fullPayload, setFullPayload] = useState<Record<string, unknown>>({}); // 除 global_merge 外原样回写
  const [mergeText, setMergeText] = useState("{}"); // global_merge 的 JSON 文本

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "site-json", JSONLD_KEY, token] as const, // 与站点块缓存键风格一致
    queryFn: () => apiGET<{ payload: Record<string, unknown>; exists: boolean }>(`/api/admin/site-json/${JSONLD_KEY}`, token),
    enabled: !!token, // 无 token 不发请求
  });

  useEffect(() => {
    if (!data) return; // 等首包
    const p = data.payload ?? {}; // 服务端对象
    setFullPayload({ ...p }); // 保留未知顶层键
    const gm = p.global_merge; // 浅合并源
    try {
      setMergeText(JSON.stringify(gm && typeof gm === "object" && !Array.isArray(gm) ? gm : {}, null, 2)); // 缩进展示
    } catch {
      setMergeText("{}"); // 序列化失败则空对象
    }
  }, [data]);

  const prettyError = useMemo(() => (error instanceof Error ? error.message : ""), [error]); // 列表查询错误文案

  const save = useMutation({
    mutationFn: async () => {
      let mergeObj: Record<string, unknown>; // 解析后的 global_merge
      try {
        const raw = JSON.parse(mergeText) as unknown; // 用户编辑
        if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("global_merge"); // 须对象
        mergeObj = raw as Record<string, unknown>; // 写入载荷
      } catch {
        throw new Error(locale === "zh" ? "global_merge 须为合法 JSON 对象" : "global_merge must be a JSON object"); // 校验失败
      }
      const merged = { ...fullPayload, global_merge: mergeObj }; // 与校验器 validate_seo_tool_json_ld 一致
      return apiPUT(`/api/admin/site-json/${JSONLD_KEY}`, token, { payload: merged }); // 白名单 PUT
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "site-json", JSONLD_KEY] }), // 刷新表单
  });

  const L = (zh: string, en: string) => (locale === "zh" ? zh : en); // 页内短双语文案

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Braces className="h-8 w-8 text-admin-link shrink-0 mt-1" aria-hidden /> {/* 与侧栏 Braces 一致 */}
        <div>
          <h1 className="text-2xl font-semibold text-white">{L("工具详情 JSON-LD", "Tool detail JSON-LD")}</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">
            {L(
              "编辑 site_json.seo_tool_json_ld.global_merge：会与前台 SoftwareApplication 结构化数据浅合并（同名字段覆盖）。亦可在「站点 JSON」中选 seo_tool_json_ld。",
              "Edit site_json.seo_tool_json_ld.global_merge: shallow-merged into the SoftwareApplication JSON-LD on tool detail (same keys win). Also editable under Site JSON → seo_tool_json_ld.",
            )}
          </p>
        </div>
      </div>

      {prettyError ? <p className="text-sm text-red-400">{prettyError}</p> : null}

      {isLoading ? <p className="text-gray-400 text-sm">{L("加载中…", "Loading…")}</p> : null}

      <label className="block text-xs text-gray-400">
        global_merge (JSON)
        <textarea
          className="mt-1 w-full max-w-3xl min-h-[220px] rounded-lg border border-admin-border/90 bg-admin-bg/90 p-3 font-mono text-sm text-white"
          value={mergeText}
          onChange={(e) => setMergeText(e.target.value)}
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        className="rounded-lg bg-admin-btn px-4 py-2 text-sm font-medium text-white hover:bg-admin-btn-hover disabled:opacity-50"
        disabled={save.isPending}
        onClick={() => void save.mutateAsync()}
      >
        {save.isPending ? L("保存中…", "Saving…") : L("保存", "Save")}
      </button>

      {save.isError ? (
        <p className="text-sm text-red-400">{save.error instanceof Error ? save.error.message : L("保存失败", "Save failed")}</p>
      ) : null}
      {save.isSuccess ? <p className="text-sm text-green-400">{L("已保存", "Saved")}</p> : null}
    </div>
  );
}
