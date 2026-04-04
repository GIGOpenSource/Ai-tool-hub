"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // React Query 数据与缓存
import Link from "next/link"; // 返回列表的客户端链接
import { useParams, useRouter } from "next/navigation"; // 动态路由 id 与编程式跳转
import { useEffect, useState } from "react"; // 表单 state 与详情同步
import { FieldHint } from "@/components/field-hint"; // 表单项说明
import { useAdminStore } from "@/lib/store"; // 管理员 JWT
import { apiGET, apiPATCH } from "@/lib/admin-api"; // 同源 /api 请求封装
import { useI18n } from "@/lib/i18n/context"; // 管理端文案

/** GET /api/admin/tools/:id/review-detail 响应（与后端字段对齐） */
type ToolReviewDetail = {
  id: number;
  slug: string;
  name: string;
  icon_emoji: string;
  description: string;
  tagline: string;
  long_description: string;
  website_url: string;
  pricing_type: string;
  category_slug: string;
  moderation_status: string;
  reject_reason_code: string | null;
};

/** GET /api/categories 单项 */
type CategoryRow = { slug: string; name: string; icon_key: string; color_class: string; sort_order: number };

export default function AdminToolEditPage() {
  const params = useParams(); // /admin/tools/[id]/edit 段
  const rawId = params?.id; // 可能是 string | string[]
  const id = typeof rawId === "string" ? Number(rawId) : Array.isArray(rawId) ? Number(rawId[0]) : NaN; // 数值化工具 id
  const token = useAdminStore((s) => s.token)!; // 非空由 shell 保证
  const { t, locale } = useI18n(); // 文案与语言（映射到 catalog locale）
  const router = useRouter(); // 保存成功后可选退回
  const qc = useQueryClient(); // 失效工具列表缓存

  const apiLocale = locale === "zh" ? "zh" : "en"; // 与前台 i18n 语言码对齐

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["admin", "tool-detail", id, token] as const, // 缓存键
    queryFn: () => apiGET<ToolReviewDetail>(`/api/admin/tools/${id}/review-detail`, token), // 拉详情
    enabled: !!token && Number.isFinite(id) && id > 0, // 有效 id 才请求
  });

  const { data: categories } = useQuery({
    queryKey: ["catalog", "categories", apiLocale] as const, // 分类列表缓存
    queryFn: async () => {
      const res = await fetch(`/api/categories?locale=${encodeURIComponent(apiLocale)}`); // 公开分类接口
      if (!res.ok) throw new Error("categories"); // 失败抛错触发重试 UI
      return res.json() as Promise<CategoryRow[]>; // 解析 JSON
    },
  });

  const [name, setName] = useState(""); // 名称
  const [tagline, setTagline] = useState(""); // 标语
  const [description, setDescription] = useState(""); // 短描述
  const [longDescription, setLongDescription] = useState(""); // 长描述
  const [websiteUrl, setWebsiteUrl] = useState(""); // 官网
  const [pricingType, setPricingType] = useState(""); // 定价文案
  const [iconEmoji, setIconEmoji] = useState(""); // emoji
  const [categorySlug, setCategorySlug] = useState(""); // 分类 slug

  useEffect(() => {
    if (!detail) return; // 无数据则跳过
    setName(detail.name); // 回填名称
    setTagline(detail.tagline); // 回填标语
    setDescription(detail.description); // 回填短描述
    setLongDescription(detail.long_description); // 回填长文
    setWebsiteUrl(detail.website_url ?? ""); // 回填官网
    setPricingType(detail.pricing_type); // 回填定价
    setIconEmoji(detail.icon_emoji ?? ""); // 回填图标
    setCategorySlug(detail.category_slug); // 回填分类
  }, [detail]); // detail 变更时同步

  const saveMut = useMutation({
    mutationFn: () =>
      apiPATCH(`/api/admin/tools/${id}`, token, {
        name, // 全量 PATCH（后端按字段覆盖）
        tagline,
        description,
        long_description: longDescription,
        website_url: websiteUrl,
        pricing_type: pricingType,
        icon_emoji: iconEmoji,
        category_slug: categorySlug,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "tools"] }); // 刷新列表
      void qc.invalidateQueries({ queryKey: ["admin", "tool-detail", id] }); // 刷新详情
      router.push("/admin/tools"); // 回审核列表
    },
  });

  if (!Number.isFinite(id) || id <= 0) {
    return <p className="text-rose-300 text-sm">{t("tools.editErr")}</p>; // 非法 id
  }

  if (loadingDetail || !detail) {
    return <p className="text-gray-400">{t("tools.loading")}</p>; // 加载中
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // 阻止默认提交
    saveMut.mutate(); // 触发 PATCH
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">{t("tools.editTitle")}</h1>
        <Link href="/admin/tools" className="text-sm text-cyan-300 hover:underline">
          {t("tools.editBack")}
        </Link>
      </div>
      <p className="text-xs text-gray-500">
        ID {detail.id} · slug <span className="text-cyan-200/90">{detail.slug}</span> · {detail.moderation_status}
      </p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-purple-500/20 bg-[#120822]/80 p-4">
        <label className="block space-y-1">
          <span className="text-xs text-gray-400">{t("tools.fieldName")}</span>
          <FieldHint text={t("fieldHelp.toolsEdit.name")} />
          <input
            className="w-full rounded-lg border border-purple-500/25 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-gray-400">{t("tools.fieldTagline")}</span>
          <FieldHint text={t("fieldHelp.toolsEdit.tagline")} />
          <input
            className="w-full rounded-lg border border-purple-500/25 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-gray-400">{t("tools.fieldDescription")}</span>
          <FieldHint text={t("fieldHelp.toolsEdit.description")} />
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-purple-500/25 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-gray-400">{t("tools.fieldLongDesc")}</span>
          <FieldHint text={t("fieldHelp.toolsEdit.longDesc")} />
          <textarea
            className="min-h-[120px] w-full rounded-lg border border-purple-500/25 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-gray-400">{t("tools.fieldWebsite")}</span>
          <FieldHint text={t("fieldHelp.toolsEdit.website")} />
          <input
            type="url"
            className="w-full rounded-lg border border-purple-500/25 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-gray-400">{t("tools.fieldPricing")}</span>
          <FieldHint text={t("fieldHelp.toolsEdit.pricing")} />
          <input
            className="w-full rounded-lg border border-purple-500/25 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={pricingType}
            onChange={(e) => setPricingType(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-gray-400">{t("tools.fieldIcon")}</span>
          <FieldHint text={t("fieldHelp.toolsEdit.icon")} />
          <input
            className="w-full rounded-lg border border-purple-500/25 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={iconEmoji}
            onChange={(e) => setIconEmoji(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-gray-400">{t("tools.fieldCategory")}</span>
          <FieldHint text={t("fieldHelp.toolsEdit.category")} />
          <select
            className="w-full rounded-lg border border-purple-500/25 bg-[#0a011890] px-3 py-2 text-sm text-white"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
          >
            {(categories ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {saveMut.isError && <p className="text-sm text-rose-300">{t("tools.editErr")}</p>}

        <button
          type="submit"
          disabled={saveMut.isPending}
          className="rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saveMut.isPending ? t("tools.editSaving") : t("tools.editSave")}
        </button>
      </form>
    </div>
  );
}
