import { useEffect } from "react";
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // 与 VITE_PUBLIC_SITE_URL 对齐的站点根

interface SEOProps {
  title?: string; // 页面标题片段（会拼上品牌后缀）
  description?: string; // meta description
  keywords?: string;
  ogTitle?: string; // Open Graph 标题覆盖
  ogDescription?: string; // Open Graph 描述覆盖
  ogImage?: string; // 分享预览图
  ogUrl?: string; // 分享规范链接（缺省时用 canonical）
  ogType?: string; // 例如 website / article
  twitterCard?: "summary" | "summary_large_image";
  canonical?: string; // 规范 URL（缺省为当前路径 + 公开站点根）
  /** 为 true 时写入 robots noindex（404、错误态等） */
  noindex?: boolean;
  /** 写入 document.documentElement.lang（可选） */
  htmlLang?: string;
}

const DEFAULT_SEO = {
  title: "AI Tools Hub - Discover the Best AI Tools for Creators & Developers",
  description:
    "Explore our curated directory of cutting-edge AI tools for video editing, copywriting, image generation, code assistance, and more. Find, compare, and discover the perfect AI solution for your needs.",
  keywords:
    "AI tools, artificial intelligence, AI directory, ChatGPT, Midjourney, AI copywriting, AI video editing, code assistant, image generation",
  ogImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop",
};

/**
 * 客户端写入 title / meta / canonical；首屏仍建议 index.html 带默认 meta。
 */
export function SEO({
  title,
  description = DEFAULT_SEO.description,
  keywords = DEFAULT_SEO.keywords,
  ogTitle,
  ogDescription,
  ogImage = DEFAULT_SEO.ogImage,
  ogUrl,
  ogType = "website",
  twitterCard = "summary_large_image",
  canonical,
  noindex = false,
  htmlLang,
}: SEOProps) {
  const fullTitle = title ? `${title} | AI Tools Hub` : DEFAULT_SEO.title; // 浏览器标签标题
  const finalOgTitle = ogTitle || title || DEFAULT_SEO.title; // OG 标题
  const finalOgDescription = ogDescription || description; // OG 描述
  const origin = getPublicSiteOrigin(); // 配置的公开域名
  const pathAndQuery =
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : ""; // 当前路径与查询串
  const derivedCanonical = origin ? `${origin}${pathAndQuery}` : typeof window !== "undefined" ? window.location.href : ""; // 尽量生成绝对 canonical
  const finalCanonical = canonical || derivedCanonical; // 允许调用方显式传入
  const finalOgUrl = ogUrl || finalCanonical; // 分享 URL 与规范链接一致

  useEffect(() => {
    document.title = fullTitle; // 设置 document.title

    if (htmlLang) {
      document.documentElement.lang = htmlLang; // 同步 html lang，利于无障碍与地区信号
    }

    const metaTags: Array<{ name?: string; property?: string; content: string }> = [
      { name: "description", content: description },
      { name: "keywords", content: keywords },
      { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow" },
      { property: "og:title", content: finalOgTitle },
      { property: "og:description", content: finalOgDescription },
      { property: "og:image", content: ogImage },
      { property: "og:type", content: ogType },
      { property: "og:site_name", content: "AI Tools Hub" },
      { name: "twitter:card", content: twitterCard },
      { name: "twitter:title", content: finalOgTitle },
      { name: "twitter:description", content: finalOgDescription },
      { name: "twitter:image", content: ogImage },
    ];

    metaTags.push({ property: "og:url", content: finalOgUrl }); // 补全 og:url

    metaTags.forEach(({ name, property, content }) => {
      const attr = name ? "name" : "property"; // 选用 name 或 property
      const value = name || property; // 查询键名
      let element = document.querySelector(`meta[${attr}="${value}"]`); // 查找已有标签
      if (!element) {
        element = document.createElement("meta"); // 新建 meta
        element.setAttribute(attr, value!); // 写入属性名
        document.head.appendChild(element); // 插入 head
      }
      element.setAttribute("content", content); // 更新 content
    });

    if (finalCanonical) {
      let linkElement = document.querySelector('link[rel="canonical"]'); // 查找 canonical link
      if (!linkElement) {
        linkElement = document.createElement("link"); // 新建 link
        linkElement.setAttribute("rel", "canonical"); // 关系为 canonical
        document.head.appendChild(linkElement); // 插入 head
      }
      linkElement.setAttribute("href", finalCanonical); // href 指向规范 URL
    }

    return () => {
      document.title = DEFAULT_SEO.title; // 卸载时恢复默认标题，下一页 SEO 会立即覆盖
    };
  }, [
    fullTitle,
    description,
    keywords,
    finalOgTitle,
    finalOgDescription,
    ogImage,
    finalOgUrl,
    ogType,
    twitterCard,
    finalCanonical,
    noindex,
    htmlLang,
  ]);

  return null; // 无 DOM 输出
}
