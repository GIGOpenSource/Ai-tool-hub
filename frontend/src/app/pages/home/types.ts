export type ApiTool = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rating: number;
  pricing: string;
  category: string;
  category_slug: string;
  review_count: number;
  popularity: number;
  recommend_score: number; // 与 GET /api/tools 排序一致（推荐 1.0）；未返回时前端按 0
  created_at: string;
};

export type ApiCategory = {
  slug: string;
  name: string;
  icon_key: string;
  color_class: string;
  sort_order: number;
};

export type HomeSeo = { keywords?: string; brand_title?: string; brand_icon_emoji?: string }; // 顶栏可选 emoji，与站点 JSON home_seo 一致
export type UiToasts = Record<string, string>;
