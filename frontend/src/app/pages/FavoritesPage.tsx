import { Link } from "react-router";
import { Heart, Search, Star, Trash2, Home, ExternalLink } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { SEO } from "../components/SEO";
import { toast } from "sonner";
import { motion } from "motion/react";
import { apiDelete, apiGet } from "../../lib/api"; // 登录态删除走 DELETE /api/me/favorites
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 合并后台 /favorites SEO
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // 收藏页规范链接
import { Breadcrumbs } from "../components/Breadcrumbs"; // 与全站统一的面包屑
import { useAuth } from "../contexts/AuthContext"; // 判断是否读用户维收藏

type FavItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rating: number;
  pricing: string;
  category: string;
  saved_date: string;
};

type FavPayload = {
  breadcrumb_label: string;
  items: FavItem[];
  filter_categories: string[];
};

export function FavoritesPage() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth(); // 登录则同步服务端收藏表
  const [payload, setPayload] = useState<FavPayload | null>(null);
  const [favorites, setFavorites] = useState<FavItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    let on = true;
    const load = isAuthenticated
      ? apiGet<FavPayload>(`/api/me/favorites?locale=${encodeURIComponent(language)}`) // JWT 附带在 apiGet
      : apiGet<FavPayload>("/api/site/favorites"); // 访客演示静态站点块
    load
      .then((p) => {
        if (!on) return;
        setPayload(p);
        setFavorites(p.items);
      })
      .catch(() => {
        if (on) setPayload(null);
      });
    return () => {
      on = false;
    };
  }, [isAuthenticated, language]); // 语言或登录态切换重拉

  const categories = payload?.filter_categories ?? ["all"];

  const seoProps = useResolvedPageSeo("/favorites", {
    title: payload?.breadcrumb_label ?? "",
    description: t("home.subtitle"),
    keywords: "AI tools favorites,saved tools,AI Tools Hub",
  }); // 默认 keywords 与 page_seo 二选一合并

  const filteredFavorites = useMemo(() => {
    return favorites.filter((tool) => {
      const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [favorites, searchQuery, selectedCategory]);

  const removeFavorite = (id: string, name: string) => {
    const run = async () => {
      if (isAuthenticated) {
        try {
          await apiDelete(`/api/me/favorites/${encodeURIComponent(id)}`); // 服务端删除一行
        } catch {
          toast.error(t("common.error")); // 网络或 401
          return;
        }
      }
      setFavorites(favorites.filter((f) => f.id !== id)); // 乐观更新列表
      toast.success(t("notif.favoriteRemoved")); // i18n 统一移除提示
    };
    void run();
  };

  if (!payload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("common.loading")} description={t("nav.favorites")} htmlLang={language} /> {/* 加载 */}
        {t("common.loading")}
      </div>
    );
  }

  const breadcrumbs = [{ label: t("nav.home"), href: "/" }, { label: payload.breadcrumb_label }];

  const origin = getPublicSiteOrigin(); // 站点根
  const favUrl = origin ? `${origin}/favorites` : ""; // 收藏页

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoProps}
        ogUrl={seoProps.ogUrl || favUrl || undefined}
        canonical={seoProps.canonical || favUrl || undefined}
        htmlLang={language}
      />
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-pink-400 fill-pink-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">{payload.breadcrumb_label}</h1>
          </div>
          <p className="text-gray-400">{t("home.subtitle")}</p>
        </motion.div>
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("common.search")} className="pl-10 bg-[#1a0b2e]/50 border-purple-500/30 text-white" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button key={cat} type="button" variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)} className={selectedCategory === cat ? "" : "border-purple-500/30 text-gray-300"}>
                {cat === "all" ? t("home.all") : cat}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFavorites.map((tool, index) => (
            <motion.div key={tool.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 hover:border-pink-400/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{tool.icon}</span>
                  <div>
                    <Link to={`/tool/${tool.id}`}>
                      <h3 className="text-xl font-bold text-white hover:text-cyan-400 transition-colors">{tool.name}</h3>
                    </Link>
                    <Badge variant="outline" className="border-purple-500/50 text-purple-300 text-xs mt-1">
                      {tool.category}
                    </Badge>
                  </div>
                </div>
                <button type="button" onClick={() => removeFavorite(tool.id, tool.name)} className="text-gray-400 hover:text-red-400 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-400 mb-4 line-clamp-2">{tool.description}</p>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-semibold">{tool.rating}</span>
                </div>
                <span className="text-gray-500 text-sm">{tool.saved_date}</span>
              </div>
              <div className="flex gap-2">
                <Link to={`/tool/${tool.id}`} className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white text-sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t("tool.visitWebsite")}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
        {filteredFavorites.length === 0 && (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-4">
              {favorites.length === 0
                ? isAuthenticated
                  ? t("favorites.emptyLoggedIn")
                  : t("favorites.emptyDemo")
                : t("favorites.emptyFiltered")}
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">
                <Home className="w-4 h-4 mr-2" />
                {t("nav.home")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
