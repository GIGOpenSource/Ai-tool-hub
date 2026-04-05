/**
 * PRD 静态分类目录：/category/:slug — 服务端按 category_slug 筛选，利于 SEO 与 sitemap 收录。
 */
import { useEffect, useMemo, useState } from "react"; // 列表与筛选状态
import { Link, useLocation, useParams } from "react-router"; // 分类 slug 与当前 path（page_seo 键）
import { toast } from "sonner"; // 收藏与分享提示
import { Navigation } from "../components/Navigation"; // 顶栏
import { SEO } from "../components/SEO"; // TDK
import { useLanguage } from "../contexts/LanguageContext"; // i18n
import { apiGet } from "../../lib/api"; // REST
import { HomeFiltersBar } from "./home/HomeFiltersBar"; // 价格与排序
import { HomeToolGrid } from "./home/HomeToolGrid"; // 卡片栅格
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // page_seo 合并
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // canonical 绝对根
import { FullPageLoadError } from "../components/FullPageLoadError"; // 加载失败
import type { ApiCategory, ApiTool, UiToasts } from "./home/types"; // 与首页同源类型

export function CategoryBrowsePage() {
  const { slug = "" } = useParams<{ slug: string }>(); // 路由参数
  const location = useLocation(); // 原始 pathname（含编码），与 page_seo 键一致
  const { t, language } = useLanguage(); // 文案与 locale
  const [tools, setTools] = useState<ApiTool[]>([]); // 本类工具
  const [categories, setCategories] = useState<ApiCategory[]>([]); // 用于校验 slug 与展示名
  const [error, setError] = useState<string | null>(null); // 请求错误
  const [priceFilter, setPriceFilter] = useState("all"); // 与首页相同筛选
  const [sortBy, setSortBy] = useState("popular"); // 排序键
  const [showFilters, setShowFilters] = useState(false); // 折叠筛选条
  const [favorites, setFavorites] = useState<Set<string>>(new Set()); // 本地心形状态
  const [uiToasts, setUiToasts] = useState<UiToasts>({}); // 与 HomeFiltersBar 对齐

  useEffect(() => {
    let on = true; // 卸载防 setState
    setError(null); // 重试清错
    Promise.all([
      apiGet<ApiTool[]>(
        `/api/tools?locale=${encodeURIComponent(language)}&category_slug=${encodeURIComponent(slug)}`,
      ),
      apiGet<ApiCategory[]>(`/api/categories?locale=${encodeURIComponent(language)}`),
      apiGet<UiToasts>("/api/site/ui_toasts"),
    ])
      .then(([tlist, cats, ut]) => {
        if (!on) return; // 已卸载
        setTools(tlist); // 列表
        setCategories(cats); // 分类元数据
        setUiToasts(ut); // Toast 文案
      })
      .catch((e: Error) => {
        if (on) setError(e.message); // 网络/5xx
      });
    return () => {
      on = false; // 标记卸载
    };
  }, [language, slug]); // slug 或语言变化重拉

  const categoryRow = useMemo(() => categories.find((c) => c.slug === slug), [categories, slug]); // 当前类
  const catName = categoryRow?.name ?? slug; // 展示名；未知类时回落 slug
  const unknownCategory = categories.length > 0 && !categoryRow; // 数据已到却无匹配 slug

  const displayTools = useMemo(() => {
    let list = tools.filter((tool) => {
      if (priceFilter === "free" && tool.pricing !== "Free") return false; // 仅免费
      if (priceFilter === "paid" && tool.pricing === "Free") return false; // 仅付费
      return true; // 保留
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating; // 评分
      if (sortBy === "newest") return (b.created_at || "").localeCompare(a.created_at || ""); // 新旧
      const ar = a.recommend_score ?? 0; // 推荐分与 API 一致
      const br = b.recommend_score ?? 0; // 同上
      if (br !== ar) return br - ar; // 主序
      return b.popularity - a.popularity; // 兜底
    });
    return list; // 展示用
  }, [tools, priceFilter, sortBy]); // 依赖

  const origin = getPublicSiteOrigin(); // 站点根
  const absUrl = origin ? `${origin}${location.pathname}` : ""; // canonical 候选

  const seoMerged = useResolvedPageSeo(location.pathname, {
    title: t("discover.toolsInCategory").replace("{category}", catName), // H1 级标题
    description: t("discover.categoryMeta").replace("{category}", catName), // meta
    keywords: `${catName}, AI tools`,
    noindex: unknownCategory, // 未知分类不鼓励收录
  }); // 与后台 page_seo 按 path 合并

  const toggleFavorite = (toolId: string) => {
    const next = new Set(favorites); // 拷贝
    if (next.has(toolId)) {
      next.delete(toolId); // 取消
      toast.info(uiToasts.removed_favorite ?? "");
    } else {
      next.add(toolId); // 添加
      toast.success(t("notif.addedToFavorites"));
    }
    setFavorites(next); // 更新
  }; // 与首页一致（仅前端态）

  const handleShare = (toolName: string) => {
    const tmpl = uiToasts.share_fallback ?? "Check out {name}"; // 站点可配
    const text = tmpl.replace("{name}", toolName); // 替换
    if (navigator.share) {
      navigator.share({ title: toolName, text, url: window.location.href }); // 系统分享
    } else {
      navigator.clipboard.writeText(window.location.href); // 退回复制链接
      toast.success(uiToasts.link_copied ?? "");
    }
  }; // 与首页一致

  const clearFilters = () => {
    setPriceFilter("all"); // 清价格
    setSortBy("popular"); // 清排序
    toast.success(uiToasts.cleared_filters ?? "");
  }; // 重置筛选

  if (error) {
    return <FullPageLoadError technicalMessage={error} onRetry={() => window.location.reload()} />; // 整页错
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
        {unknownCategory ? (
          <p className="mt-6 text-red-300 text-sm">{t("discover.unknownCategory")}</p>
        ) : (
          <h1 className="mt-4 text-3xl font-bold text-white">{t("discover.toolsInCategory").replace("{category}", catName)}</h1>
        )}
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
      {!unknownCategory ? (
        <HomeToolGrid
          tools={displayTools}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          handleShare={handleShare}
          emptyMessage={t("discover.noToolsCategory")}
          clearFiltersLabel={uiToasts.clear_filters ?? ""}
          onClearFilters={clearFilters}
          gridHeading={t("home.featured")}
          gridBadge={catName}
        />
      ) : null}
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
