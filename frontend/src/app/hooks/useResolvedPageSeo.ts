import { useLanguage, type Language } from "../contexts/LanguageContext"; // 当前界面语言
import { normalizeFrontendPath, usePageSeoContext } from "../contexts/PageSeoContext"; // 归一 path 与站点 SEO 表

/** 传给 <SEO /> 的合并结果（未配置字段可留 undefined 交由 SEO 默认） */
export type ResolvedPageSeoProps = {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  ogUrl?: string;
  /** 后台 noindex=1 或与 fallback 合并 */
  noindex?: boolean;
  /** 后台 og_type 或页面兜底 */
  ogType?: string;
};

/** 解析站点 JSON 中的 noindex 开关字符串 */
function parseNoindexToken(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase(); // 规范化
  return v === "1" || v === "true" || v === "yes" || v === "on"; // 任一为真则 noindex
}

/** 从一行 SEO 配置里按语言取值 */
function pickLocalized(row: Record<string, string> | undefined, base: string, lang: Language): string | undefined {
  if (!row) return undefined; // 无该行
  const zhKey = `${base}_zh`; // 中文字段名
  const enKey = `${base}_en`; // 英文字段名
  const single = row[base]?.trim(); // 未分语言的单一字段
  const zhV = row[zhKey]?.trim(); // 中文
  const enV = row[enKey]?.trim(); // 英文
  if (lang === "zh") return zhV || single || enV; // 中文界面顺序
  return enV || single || zhV; // 其它语言：英优先再回退中文
}

/** 合并站点 page_seo 与页面兜底文案 */
export function useResolvedPageSeo(pagePath: string, fallback: ResolvedPageSeoProps): ResolvedPageSeoProps {
  const { language } = useLanguage(); // 当前语言代码
  const { map } = usePageSeoContext(); // 全站 path→字段
  const path = normalizeFrontendPath(pagePath); // 与后台键一致
  const rawRow = map[path]; // 当前路径覆盖（可能不存在）
  const title = pickLocalized(rawRow, "title", language) ?? fallback.title; // 文档标题
  const description = pickLocalized(rawRow, "description", language) ?? fallback.description; // meta description
  const keywords = pickLocalized(rawRow, "keywords", language) ?? fallback.keywords; // meta keywords
  const ogPickTitle = pickLocalized(rawRow, "og_title", language); // OG title
  const ogPickDesc = pickLocalized(rawRow, "og_description", language); // OG description
  const ogImage = rawRow?.og_image?.trim() || fallback.ogImage; // og:image
  const canonical = rawRow?.canonical?.trim() || fallback.canonical; // link rel=canonical
  const ogUrl = rawRow?.og_url?.trim() || fallback.ogUrl; // og:url
  const fromRowNoindex = parseNoindexToken(rawRow?.noindex); // 运营显式禁止收录
  const noindex = fromRowNoindex || !!fallback.noindex; // 与页面级兜底合并（如 404）
  const ogTypeRaw = rawRow?.og_type?.trim(); // 后台 og:type
  const ogType = ogTypeRaw || fallback.ogType; // 未配则用页面默认

  return {
    title,
    description,
    keywords,
    ogTitle: ogPickTitle || undefined, // 未设则 SEO 组件回退到 title
    ogDescription: ogPickDesc || undefined,
    ogImage,
    canonical,
    ogUrl,
    noindex: noindex || undefined, // false 时不传，减少无意义属性
    ogType: ogType || undefined,
  };
}
