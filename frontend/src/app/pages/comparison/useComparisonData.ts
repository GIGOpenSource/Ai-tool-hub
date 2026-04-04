import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";

/** GET /api/comparisons/{slug} 解析后的对比页结构（主工具、替代、特性矩阵、SEO 文案等） */
export type ComparisonPayload = {
  mainTool: {
    name: string;
    logo: string;
    developer: string;
    rating: number;
    pricing: string;
    description: string;
    promotion_active?: boolean; // 后端按名解析工具后的推广标
  };
  alternatives: Array<{
    name: string;
    logo: string;
    developer: string;
    rating: number;
    pricing: string;
    description: string;
    promotion_active?: boolean;
  }>;
  features: Array<{
    category: string;
    items: Array<Record<string, string | boolean>>;
  }>;
  pros: Record<string, string[]>;
  cons: Record<string, string[]>;
  seo_title_suffix: string;
  seo_intro: string;
  seo_chooser_title: string;
  seo_chooser_intro: string;
  seo_cards: Array<{ title: string; body: string }>;
  footer_note: string;
};

/** 路由参数 toolName 对应 comparison_page.slug */
export function useComparisonData(slug: string | undefined) {
  const [data, setData] = useState<ComparisonPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!slug) {
      setFailed(true);
      return;
    }
    let on = true;
    apiGet<ComparisonPayload>(`/api/comparisons/${encodeURIComponent(slug)}`)
      .then((d) => {
        if (on) {
          setData(d);
          setFailed(false);
        }
      })
      .catch(() => {
        if (on) {
          setData(null);
          setFailed(true);
        }
      });
    return () => {
      on = false;
    };
  }, [slug]);

  return { data, failed };
}
