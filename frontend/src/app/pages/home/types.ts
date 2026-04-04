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
