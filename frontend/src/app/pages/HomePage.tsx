/*
 * 首页数据流：useHomeData 并行请求 /api/tools、/api/categories、/api/search-suggestions、
 * /api/site/home_seo、/api/site/ui_toasts；SEO 由 useResolvedPageSeo 合并 i18n 与后台 page_seo。
 * 搜索筛选、价格与排序、收藏 Set 为客户端状态；canonical 使用 getPublicSiteOrigin。
 */
import React, { useMemo, useState } from "react"; // React：满足 TS 对 JSX 的隐式引用；hooks 为具名导入
import { useNavigate } from "react-router"; // 搜索进 /s/:keyword
import { toast } from "sonner";
import { Navigation } from "../components/Navigation";
import { SEO } from "../components/SEO";
import { useLanguage } from "../contexts/LanguageContext";
import { HomeCategoryStrip } from "./home/HomeCategoryStrip";
import { HomeFiltersBar } from "./home/HomeFiltersBar";
import { HomeHero } from "./home/HomeHero";
import { HomeToolGrid } from "./home/HomeToolGrid";
import { useHomeData } from "./home/useHomeData";
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // 首页 canonical
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 后台 page_seo 覆写
import { FullPageLoadError } from "../components/FullPageLoadError"; // 数据加载失败整页态

export function HomePage() {
  const navigate = useNavigate(); // 客户端路由
  const { t, language } = useLanguage();
  const { tools, categories, suggestions, homeSeo, uiToasts, error, retryLoad } = useHomeData(language);
  const seoMerged = useResolvedPageSeo("/", {
    title: t("home.title"),
    description: t("home.subtitle"),
    keywords: homeSeo?.keywords ?? "",
  }); // 翻译与 home_seo 为底，运营可按路径覆盖
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery) return suggestions;
    const q = searchQuery.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(q));
  }, [searchQuery, suggestions]);

  const displayTools = useMemo(() => {
    let list = tools.filter((tool) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!tool.name.toLowerCase().includes(q) && !tool.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedSlug !== "all" && tool.category_slug !== selectedSlug) return false;
      if (priceFilter === "free" && tool.pricing !== "Free") return false;
      if (priceFilter === "paid" && tool.pricing === "Free") return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating; // 按星
      if (sortBy === "newest") return (b.created_at || "").localeCompare(a.created_at || ""); // 新到旧
      const ar = a.recommend_score ?? 0; // 推荐分（与 API 热门序一致）
      const br = b.recommend_score ?? 0; // 同上
      if (br !== ar) return br - ar; // 主序
      return b.popularity - a.popularity; // 兜底热度
    });
    return list;
  }, [tools, searchQuery, selectedSlug, priceFilter, sortBy]);

  const toggleFavorite = (toolId: string) => {
    const next = new Set(favorites);
    if (next.has(toolId)) {
      next.delete(toolId);
      toast.info(uiToasts.removed_favorite ?? "");
    } else {
      next.add(toolId);
      toast.success(t("notif.addedToFavorites"));
    }
    setFavorites(next);
  };

  const handleShare = (toolName: string) => {
    const tmpl = uiToasts.share_fallback ?? "Check out {name}";
    const text = tmpl.replace("{name}", toolName);
    if (navigator.share) {
      navigator.share({ title: toolName, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(uiToasts.link_copied ?? "");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSlug("all");
    setPriceFilter("all");
    toast.success(uiToasts.cleared_filters ?? "");
  };

  if (error) {
    return <FullPageLoadError technicalMessage={error} onRetry={retryLoad} />;
  }

  const origin = getPublicSiteOrigin(); // 配置的站点根
  const homeUrl = origin ? `${origin}/` : ""; // 首页绝对地址

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || homeUrl || undefined}
        canonical={seoMerged.canonical || homeUrl || undefined}
        htmlLang={language}
      />
      <Navigation />

      <HomeHero
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        filteredSuggestions={filteredSuggestions}
        onSearchNavigate={(q) => navigate(`/s/${encodeURIComponent(q)}`)}
      />

      <HomeFiltersBar
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        priceFilter={priceFilter}
        setPriceFilter={setPriceFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        displayCount={displayTools.length}
        uiToasts={uiToasts}
      />

      <HomeCategoryStrip categories={categories} selectedSlug={selectedSlug} setSelectedSlug={setSelectedSlug} />

      <HomeToolGrid
        tools={displayTools}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        handleShare={handleShare}
        emptyMessage={uiToasts.no_tools ?? ""}
        clearFiltersLabel={uiToasts.clear_filters ?? ""}
        onClearFilters={clearFilters}
      />

      <footer className="border-t border-purple-900/20 bg-[#0a0118]/80 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-500">
            <p>{t("footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
