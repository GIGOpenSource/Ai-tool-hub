import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";

/** 与 GET /api/tools/{slug}/detail 返回结构对应（前端展示用） */
export type ToolDetailApi = {
  slug: string;
  name: string;
  logo: string;
  tagline: string;
  rating: number;
  totalReviews: number;
  category: string;
  category_slug: string;
  pricing: string;
  website: string;
  description: string;
  features: string[];
  screenshots: string[];
  alternatives: { id: string; name: string; rating: number; pricing: string }[];
  pricingPlans: { name: string; price: string; features: string[] }[];
  reviews: { user: string; avatar: string; rating: number; date: string; comment: string; helpful: number }[];
  created_at: string;
  messages?: Record<string, string>; // 详情接口附带全量 i18n（可选；当前页仍用 LanguageProvider）
  promotion_active?: boolean; // paid 且在约的推广标（与 monetization_order 一致）
};

/**
 * 拉取单个工具详情；404 或网络错误时 notFound=true、tool=null。
 * slug 来自路由参数（实为后端 slug）。
 */
export function useToolDetail(slug: string | undefined, locale: string) {
  const [tool, setTool] = useState<ToolDetailApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let on = true;
    setLoading(true);
    apiGet<ToolDetailApi>(`/api/tools/${encodeURIComponent(slug)}/detail?locale=${encodeURIComponent(locale)}`)
      .then((d) => {
        if (on) {
          setTool(d);
          setNotFound(false);
        }
      })
      .catch(() => {
        if (on) {
          setTool(null);
          setNotFound(true);
        }
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, [slug, locale]);

  return { tool, loading, notFound };
}
