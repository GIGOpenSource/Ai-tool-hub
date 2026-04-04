/*
 * 工具详情：useToolDetail(slug, locale) → GET /api/tools/{slug}/detail；404 时读 /api/site/not_found。
 * SEO/JsonLd 与 useResolvedPageSeo；收藏走 apiGet/apiPost/apiDelete + JWT；promotion_active 展示弱曝光标。
 */
import { Link, useParams } from "react-router";
import {
  ExternalLink,
  Star,
  ThumbsUp,
  ThumbsDown,
  Play,
  Sparkles,
  Heart,
  Share2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react"; // useMemo 用于稳定 JSON-LD 对象引用
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ReviewModal } from "../components/ReviewModal";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useToolDetail } from "./tool/useToolDetail";
import { apiDelete, apiGet, apiPost, getAccessToken } from "../../lib/api"; // 收藏增删与 JWT  Presence 校验
import { SEO } from "../components/SEO"; // 页面级 TDK 与 canonical
import { JsonLd } from "../components/JsonLd"; // SoftwareApplication 结构化数据
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // 绝对 URL 生成
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // /tool/{slug} 的 page_seo
import { useAuth } from "../contexts/AuthContext"; // 登录态才写 user_favorite

type NotFoundCopy = { tool_title: string; cta_home: string };

export function ToolDetailPage() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const { isAuthenticated, logout } = useAuth(); // 与 /api/me/favorites 联动；401 时清假登录态
  const { tool, loading, notFound } = useToolDetail(id, language);
  const toolPath = id ? `/tool/${id}` : "/tool"; // 与后台配置键一致（slug）
  const descFb =
    tool && !loading && !notFound ? (tool.description || tool.tagline || "").slice(0, 160) : ""; // 兜底描述
  const kwFb =
    tool && !loading && !notFound
      ? `${tool.name},${tool.category},AI tools,${tool.pricing},AI Tools Hub`
      : ""; // 兜底关键词
  const seoMerged = useResolvedPageSeo(toolPath, {
    title: tool?.name,
    description: descFb,
    keywords: kwFb,
  }); // 工具名/描述为底，可按 path 精细覆盖
  const [nf, setNf] = useState<NotFoundCopy | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [helpfulReviews, setHelpfulReviews] = useState<Set<number>>(new Set());
  const [jsonLdGlobalMerge, setJsonLdGlobalMerge] = useState<Record<string, unknown>>({}); // site_json.seo_tool_json_ld.global_merge 浅合并

  useEffect(() => {
    apiGet<NotFoundCopy>("/api/site/not_found")
      .then(setNf)
      .catch(() => setNf({ tool_title: "Tool not found", cta_home: "Back to Home" }));
  }, []);

  useEffect(() => {
    apiGet<Record<string, unknown>>("/api/site/seo_tool_json_ld") // 运营可配的 JSON-LD 附加字段
      .then((blob) => {
        const gm = blob.global_merge; // 与后台约定键名
        if (gm && typeof gm === "object" && !Array.isArray(gm)) setJsonLdGlobalMerge(gm as Record<string, unknown>); // 浅合并源
        else setJsonLdGlobalMerge({}); // 缺省或类型不对则忽略
      })
      .catch(() => setJsonLdGlobalMerge({})); // 无行/网络失败不阻塞详情
  }, []);

  useEffect(() => {
    const slug = (tool?.slug && String(tool.slug).trim()) || (id && String(id).trim()) || ""; // 与路由 /tool/:id 一致，详情 slug 缺省时用 id
    if (!slug || !isAuthenticated || !getAccessToken()) {
      setIsFavorite(false); // 无 slug、访客或无 token 时不打 check
      return; // 避免 401 无效请求
    }
    let on = true; // 卸载后忽略回包
    apiGet<{ favorited: boolean }>(
      `/api/me/favorites/check?slug=${encodeURIComponent(slug)}`, // 与 user_favorite.tool_slug 对齐
    )
      .then((r) => {
        if (on) setIsFavorite(!!r.favorited); // 点亮状态
      })
      .catch(() => {
        if (on) setIsFavorite(false); // 401 等则视为未收藏
      });
    return () => {
      on = false; // 取消订阅
    };
  }, [tool?.slug, id, isAuthenticated]); // 路由或详情 slug、登录态变化重验

  // 以下 hook 须在任何 early return 之前，否则 loading → 有数据时多跑一次 hook 会触发 React 报错
  const pageUrl = useMemo(() => {
    const o = getPublicSiteOrigin(); // 站点根
    if (!tool?.slug || !o) return ""; // 无 slug 或未配置公网根则不拼 canonical
    return `${o}/tool/${tool.slug}`; // 详情绝对路径
  }, [tool]); // tool 引用随详情请求更新

  const toolJsonLd = useMemo(() => {
    if (!tool) {
      // 仅占位：加载/404 分支不渲染 JsonLd，但 hook 次数须与有数据时一致
      return { "@context": "https://schema.org", "@type": "Thing" };
    }
    const base: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: tool.name,
      description: tool.description || tool.tagline || tool.name,
      applicationCategory: tool.category,
      operatingSystem: "Web",
    };
    if (pageUrl) {
      base.url = pageUrl; // 可抓取规范地址
    }
    if (tool.website) {
      base.sameAs = tool.website; // 官网外链
    }
    if (tool.totalReviews > 0) {
      base.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: tool.rating,
        ratingCount: tool.totalReviews,
        bestRating: 5,
        worstRating: 1,
      };
    }
    return { ...base, ...jsonLdGlobalMerge }; // 后台 global_merge 覆盖同名键（如 publisher）
  }, [tool, pageUrl, jsonLdGlobalMerge]); // 合并块变更时更新结构化数据

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("common.loading")} description={t("home.subtitle")} htmlLang={language} /> {/* 加载态也写入基础 TDK */}
        {t("common.loading")}
      </div>
    );
  }

  if (notFound || !tool) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <SEO noindex title={nf?.tool_title ?? t("common.error")} description="" htmlLang={language} /> {/* 软 404：不索引 */}
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">{nf?.tool_title ?? t("common.error")}</h1>
          <Link to="/">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">{nf?.cta_home ?? "Home"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const toggleFavorite = () => {
    if (!tool) return; // 无数据不操作
    const run = async () => {
      if (!isAuthenticated || !getAccessToken()) {
        toast.info(t("notif.loginToSaveFavorite")); // 无 JWT 时勿发 /api/me/*，避免误报「通用错误」
        return;
      }
      const slug = (tool.slug && String(tool.slug).trim()) || (id && String(id).trim()) || ""; // POST/DELETE 与 check 同键
      if (!slug) {
        toast.error(t("common.error")); // 极端脏数据
        return;
      }
      try {
        if (isFavorite) {
          await apiDelete(`/api/me/favorites/${encodeURIComponent(slug)}`); // 取消收藏
          setIsFavorite(false); // 本地同步
          toast.success(t("notif.favoriteRemoved")); // 与收藏页一致
        } else {
          await apiPost<object, { slug: string }>(`/api/me/favorites`, { slug }); // 须保证 body 含 slug，勿传 undefined 致 {}
          setIsFavorite(true);
          toast.success(t("notif.addedToFavorites"));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : ""; // 与 api.ts 抛错格式对齐
        if (/\b401\b/.test(msg)) {
          logout(); // 与 AuthContext 一致：过期/无效 token 清除本地「假登录」
          toast.info(t("notif.loginToSaveFavorite")); // 引导重新登录而非笼统失败
          return;
        }
        toast.error(t("common.error")); // 其它 HTTP/网络错误
      }
    };
    void run();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: tool.name, text: tool.tagline, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(t("common.success"));
    }
  };

  const toggleHelpful = (index: number) => {
    const next = new Set(helpfulReviews);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setHelpfulReviews(next);
  };

  const zhUi = language.toLowerCase().startsWith("zh"); // 推广标识中英（与 Profile 订单区一致）
  const breadcrumbs = [
    { label: t("nav.home"), href: "/" },
    { label: tool.category },
    { label: tool.name },
  ];

  const slugForCompare =
    (tool.slug && String(tool.slug).trim()) || (id && String(id).trim()) || ""; // 与 compare_interactive 目录 id 对齐（勿用 comparison_page slug）
  const compareAllHref = slugForCompare
    ? `/compare?add=${encodeURIComponent(slugForCompare)}`
    : "/compare"; // 无 slug 时仍进交互对比页

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || pageUrl || undefined}
        canonical={seoMerged.canonical || pageUrl || undefined}
        ogType={seoMerged.ogType || "article"}
        htmlLang={language}
      />
      <JsonLd id="tool-detail" data={toolJsonLd} />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 md:p-8 mb-6"
            >
              <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
                <div className="text-6xl">{tool.logo}</div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">{tool.name}</h1>
                    {tool.promotion_active ? (
                      <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40 text-xs shrink-0">
                        {zhUi ? "付费推广" : "Promoted"}
                      </Badge>
                    ) : null}
                  </div>
                  {tool.promotion_active ? (
                    <p className="text-xs text-gray-500 mb-2">
                      {zhUi
                        ? "本工具在付费推广合约有效期内展示此标识，与后台订单数据一致。"
                        : "Promotional label shown while a paid sponsorship is active; aligned with admin orders."}
                    </p>
                  ) : null}
                  <p className="text-lg text-gray-300 mb-4">{tool.tagline}</p>
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-semibold text-lg">{tool.rating}</span>
                      <span className="text-gray-400">
                        ({tool.totalReviews.toLocaleString()} {t("tool.reviews")})
                      </span>
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{tool.category}</Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">{tool.pricing}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-8">
                      <a href={tool.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-5 h-5 mr-2" />
                        {t("tool.visitWebsite")}
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleFavorite}
                      className={`border-purple-500/30 ${
                        isFavorite ? "bg-pink-500/20 text-pink-400 border-pink-500/30" : "text-gray-300"
                      } hover:bg-purple-500/20`}
                    >
                      <Heart className={`w-5 h-5 mr-2 ${isFavorite ? "fill-pink-400" : ""}`} />
                      {t("tool.addToFavorites")}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleShare} className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20">
                      <Share2 className="w-5 h-5 mr-2" />
                      {t("tool.share")}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            <Tabs defaultValue="overview" className="mb-6">
              <TabsList className="bg-[#1a0b2e]/50 border border-purple-500/20 mb-6">
                <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  {t("detail.overview")}
                </TabsTrigger>
                <TabsTrigger value="features" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  {t("detail.features")}
                </TabsTrigger>
                <TabsTrigger value="gallery" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  {t("detail.gallery")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    {t("detail.about")} {tool.name}
                  </h2>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">{tool.description}</p>
                </motion.div>
              </TabsContent>

              <TabsContent value="features">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">{t("detail.keyFeatures")}</h2>
                  {tool.features.length === 0 ? (
                    <p className="text-gray-500">—</p>
                  ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tool.features.map((feature, index) => (
                        <motion.li key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex items-start gap-2 text-gray-300">
                          <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="gallery">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">{t("detail.screenshots")}</h2>
                  {tool.screenshots.length === 0 ? (
                    <p className="text-gray-500">—</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tool.screenshots.map((screenshot, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="aspect-video bg-gradient-to-br from-purple-900/30 to-cyan-900/30 rounded-xl flex items-center justify-center border border-purple-500/20"
                        >
                          <div className="text-center">
                            <div className="text-6xl mb-2">{screenshot}</div>
                            {index === 0 && (
                              <div className="flex items-center justify-center gap-2 text-cyan-400">
                                <Play className="w-5 h-5" />
                                <span>{t("detail.watchDemo")}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{t("detail.userReviews")}</h2>
                <Button type="button" onClick={() => setReviewModalOpen(true)} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                  {t("detail.writeReview")}
                </Button>
              </div>

              {tool.reviews.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-purple-500/20">
                    <div className="text-center md:text-left">
                      <div className="text-5xl font-bold text-white mb-2">{tool.rating}</div>
                      <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-gray-400">
                        {tool.totalReviews.toLocaleString()} {t("tool.reviews")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <div key={stars} className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm w-12">{stars} star</span>
                          <Progress value={stars === 5 ? 80 : stars === 4 ? 15 : 5} className="flex-1 h-2" />
                          <span className="text-gray-400 text-sm w-12">{stars === 5 ? "80%" : stars === 4 ? "15%" : "5%"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {tool.reviews.map((review, index) => (
                      <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="border-b border-purple-500/10 last:border-0 pb-6 last:pb-0">
                        <div className="flex items-start gap-4">
                          <div className="text-3xl">{review.avatar}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h4 className="text-white font-semibold">{review.user}</h4>
                                <p className="text-gray-500 text-sm">{review.date}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: review.rating }).map((_, i) => (
                                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-300 mb-3">{review.comment}</p>
                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => toggleHelpful(index)}
                                className={`flex items-center gap-1 transition-colors text-sm ${
                                  helpfulReviews.has(index) ? "text-cyan-400" : "text-gray-400 hover:text-cyan-400"
                                }`}
                              >
                                <ThumbsUp className="w-4 h-4" />
                                <span>
                                  {t("detail.helpful")} ({review.helpful + (helpfulReviews.has(index) ? 1 : 0)})
                                </span>
                              </button>
                              <button type="button" className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors text-sm">
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 sticky top-24">
              <h3 className="text-xl font-bold text-white mb-4">{t("detail.pricingPlans")}</h3>
              {tool.pricingPlans.length === 0 ? (
                <p className="text-gray-500">—</p>
              ) : (
                <div className="space-y-4">
                  {tool.pricingPlans.map((plan, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 hover:border-cyan-400/50 transition-all">
                      <div className="flex items-baseline gap-2 mb-2">
                        <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                        <span className="text-2xl font-bold text-cyan-400">{plan.price}</span>
                        {plan.price !== "$0" && <span className="text-gray-400 text-sm">{t("detail.perMonth")}</span>}
                      </div>
                      <ul className="space-y-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-green-400 mt-1">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">{t("detail.topAlternatives")}</h3>
              <div className="space-y-3">
                {tool.alternatives.map((alt) => (
                  <Link key={alt.id} to={`/tool/${alt.id}`} className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg hover:bg-purple-900/40 transition-all group">
                    <div>
                      <h4 className="text-white font-semibold group-hover:text-cyan-400 transition-colors">{alt.name}</h4>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-gray-400">{alt.rating}</span>
                      </div>
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">{alt.pricing}</Badge>
                  </Link>
                ))}
              </div>
              <Link to={compareAllHref}>
                <Button type="button" variant="outline" className="w-full mt-4 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20">
                  {t("detail.compareAll")}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* open 须与 ReviewModal 受控 props 一致（误写 isOpen 会导致弹窗永远不收 true） */}
      <ReviewModal open={reviewModalOpen} onClose={() => setReviewModalOpen(false)} toolName={tool.name} />
    </div>
  );
}
