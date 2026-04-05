/**
 * PRD 搜索聚合落地页：/s/:keyword — 与 POST 埋点 search_query 互补；URL 可分享、可进 sitemap 仅静态页（搜索词不进 sitemap）。
 */
import { useEffect, useMemo, useState } from "react"; // 状态
import { Link, useLocation, useNavigate, useParams } from "react-router"; // 路由
import { toast } from "sonner"; // 提示
import { Navigation } from "../components/Navigation"; // 顶栏
import { SEO } from "../components/SEO"; // TDK
import { useLanguage } from "../contexts/LanguageContext"; // i18n
import { apiGet } from "../../lib/api"; // REST
import { HomeFiltersBar } from "./home/HomeFiltersBar"; // 排序/价格
import { HomeToolGrid } from "./home/HomeToolGrid"; // 卡片
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // page_seo
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // canonical
import { FullPageLoadError } from "../components/FullPageLoadError"; // 错误页
import type { ApiTool, UiToasts } from "./home/types"; // 类型

export function SearchResultsPage() {
  const { keyword = "" } = useParams<{ keyword: string }>(); // 已解码的搜索词片段
  const location = useLocation(); // pathname
  const navigate = useNavigate(); // 空词回首页
  const { t, language } = useLanguage(); // 文案
  const [tools, setTools] = useState<ApiTool[]>([]); // 服务端筛选结果
  const [error, setError] = useState<string | null>(null); // 错误
  const [priceFilter, setPriceFilter] = useState("all"); // 价格
  const [sortBy, setSortBy] = useState("popular"); // 排序
  const [showFilters, setShowFilters] = useState(false); // 折叠
  const [favorites, setFavorites] = useState<Set<string>>(new Set()); // 收藏 UI
  const [uiToasts, setUiToasts] = useState<UiToasts>({}); // Toast 配置

  const queryText = keyword.trim(); // 有效查询

  useEffect(() => {
    if (!queryText) {
      navigate("/", { replace: true }); // 空关键词不停留
    }
  }, [queryText, navigate]); // 同步重定向

  useEffect(() => {
    if (!queryText) return; // 等重定向
    let on = true; // 卸载守卫
    setError(null); // 清错
    Promise.all([
      apiGet<ApiTool[]>(`/api/tools?locale=${encodeURIComponent(language)}&q=${encodeURIComponent(queryText)}`),
      apiGet<UiToasts>("/api/site/ui_toasts"),
    ])
      .then(([tlist, ut]) => {
        if (!on) return; // 卸载
        setTools(tlist); // 结果
        setUiToasts(ut); // 文案
      })
      .catch((e: Error) => {
        if (on) setError(e.message); // 失败
      });
    return () => {
      on = false; // 结束
    };
  }, [language, queryText]); // 查询或语言变

  const displayTools = useMemo(() => {
    let list = tools.filter((tool) => {
      if (priceFilter === "free" && tool.pricing !== "Free") return false; // 免费
      if (priceFilter === "paid" && tool.pricing === "Free") return false; // 付费
      return true; // 其它
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating; // 评分
      if (sortBy === "newest") return (b.created_at || "").localeCompare(a.created_at || ""); // 时间
      const ar = a.recommend_score ?? 0; // 推荐分
      const br = b.recommend_score ?? 0; // 同上
      if (br !== ar) return br - ar; // 主序
      return b.popularity - a.popularity; // 兜底
    });
    return list; // 展示
  }, [tools, priceFilter, sortBy]); // 依赖

  const origin = getPublicSiteOrigin(); // 根
  const absUrl = origin ? `${origin}${location.pathname}` : ""; // 绝对 URL

  const seoMerged = useResolvedPageSeo(location.pathname, {
    title: t("discover.searchTitle").replace("{query}", queryText), // 标题含词
    description: t("discover.searchMeta").replace("{query}", queryText), // 描述
    keywords: `${queryText}, AI tools, search`,
  }); // 运营可在 page_seo 覆写 /s/…

  const toggleFavorite = (toolId: string) => {
    const next = new Set(favorites); // 拷贝
    if (next.has(toolId)) {
      next.delete(toolId);
      toast.info(uiToasts.removed_favorite ?? "");
    } else {
      next.add(toolId);
      toast.success(t("notif.addedToFavorites"));
    }
    setFavorites(next);
  }; // 本地收藏态

  const handleShare = (toolName: string) => {
    const tmpl = uiToasts.share_fallback ?? "Check out {name}";
    const text = tmpl.replace("{name}", toolName);
    if (navigator.share) {
      navigator.share({ title: toolName, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(uiToasts.link_copied ?? "");
    }
  }; // 分享

  const clearFilters = () => {
    setPriceFilter("all");
    setSortBy("popular");
    toast.success(uiToasts.cleared_filters ?? "");
  }; // 清筛选

  if (!queryText) {
    return null; // 重定向中不闪内容
  }

  if (error) {
    return <FullPageLoadError technicalMessage={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || absUrl || undefined}
        canonical={seoMerged.canonical || absUrl || undefined}
        htmlLang={language}
      />
      <Navigation />
      <div className="container mx-auto px-4 pt-8 pb-4">
        <Link to="/" className="text-sm text-cyan-400 hover:underline">
          ← {t("discover.backHome")}
        </Link>
        <h1 className="mt-4 text-2xl md:text-3xl font-bold text-white break-words">
          {t("discover.searchTitle").replace("{query}", queryText)}
        </h1>
      </div>
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
      <HomeToolGrid
        tools={displayTools}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        handleShare={handleShare}
        emptyMessage={t("discover.noToolsSearch")}
        clearFiltersLabel={uiToasts.clear_filters ?? ""}
        onClearFilters={clearFilters}
        gridHeading={t("home.featured")}
        gridBadge={t("home.search")}
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
