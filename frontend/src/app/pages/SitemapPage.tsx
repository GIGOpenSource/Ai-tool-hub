import { Link } from "react-router";
import { Map, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "../components/Navigation";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";
import { toast } from "sonner"; // 未登录点锁页时提示，避免「死链」感
import { DynamicLucide } from "../../lib/lucideMap";
import { SEO } from "../components/SEO"; // 站内地图页 TDK
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // /sitemap URL
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 网站地图页 SEO

type SitemapPayload = {
  title: string;
  subtitle: string;
  platform_overview_title: string;
  category_suffix: string;
  stat_labels: string[];
  unlock_title: string;
  unlock_body: string;
  unlock_cta: string;
  badge_login_required: string;
  pages: Array<{
    name: string;
    path: string;
    icon_key: string;
    description: string;
    category: string;
    color: string;
    requires_auth: boolean;
  }>;
};

export function SitemapPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [s, setS] = useState<SitemapPayload | null>(null);

  useEffect(() => {
    apiGet<SitemapPayload>("/api/site/sitemap").then(setS).catch(() => setS(null));
  }, []);

  const seoMerged = useResolvedPageSeo("/sitemap", {
    title: s?.title ?? "",
    description: s?.subtitle ?? "",
    keywords: `sitemap,${t("nav.sitemap")},AI Tools Hub`,
  }); // 配置块 + 覆盖

  if (!s) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("common.loading")} description={t("nav.sitemap")} htmlLang={language} /> {/* 加载 */}
        {t("common.loading")}
      </div>
    );
  }

  const categories = Array.from(new Set(s.pages.map((p) => p.category)));
  const origin = getPublicSiteOrigin(); // 站点根
  const smUrl = origin ? `${origin}/sitemap` : ""; // 网站地图页

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || smUrl || undefined}
        canonical={seoMerged.canonical || smUrl || undefined}
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Map className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">{s.title}</h1>
          </div>
          <p className="text-gray-400">{s.subtitle}</p>
        </motion.div>

        {categories.map((category, catIndex) => (
          <motion.div key={category} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: catIndex * 0.1 }} className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              {category} {s.category_suffix}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {s.pages
                .filter((page) => page.category === category)
                .map((page, index) => {
                  const isLocked = page.requires_auth && !user;
                  return (
                    <Link
                      key={index}
                      to={isLocked ? "#" : page.path}
                      onClick={(e) => {
                        if (isLocked) {
                          e.preventDefault(); // 阻止跳到 #
                          toast.info(s.unlock_body, { duration: 4000 }); // 引导先登录
                        }
                      }}
                      className={`group ${isLocked ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div
                        className={`bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6 transition-all ${
                          isLocked ? "" : "hover:border-cyan-400/50 hover:bg-purple-900/30 hover:transform hover:scale-105"
                        }`}
                      >
                        <div className="flex items-start gap-4 mb-3">
                          <div
                            className={`p-3 rounded-lg bg-gradient-to-br ${
                              isLocked ? "from-gray-500/20 to-gray-600/20" : "from-purple-500/20 to-cyan-500/20"
                            }`}
                          >
                            <DynamicLucide name={page.icon_key} className={`w-6 h-6 ${isLocked ? "text-gray-400" : page.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`text-lg font-bold ${isLocked ? "text-gray-400" : "text-white group-hover:text-cyan-400 transition-colors"}`}>
                                {page.name}
                              </h3>
                              {page.requires_auth && (
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">{s.badge_login_required}</Badge>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm">{page.description}</p>
                          </div>
                          {!isLocked && <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />}
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </motion.div>
        ))}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">{s.platform_overview_title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <div className="text-3xl font-bold text-cyan-400 mb-1">{s.pages.length}</div>
              <div className="text-gray-400 text-sm">{s.stat_labels[0] ?? ""}</div>
            </div>
            <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <div className="text-3xl font-bold text-purple-400 mb-1">{s.pages.filter((p) => p.category === "Main").length}</div>
              <div className="text-gray-400 text-sm">{s.stat_labels[1] ?? ""}</div>
            </div>
            <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <div className="text-3xl font-bold text-pink-400 mb-1">{s.pages.filter((p) => p.category === "User").length}</div>
              <div className="text-gray-400 text-sm">{s.stat_labels[2] ?? ""}</div>
            </div>
            <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <div className="text-3xl font-bold text-green-400 mb-1">{s.pages.filter((p) => p.requires_auth).length}</div>
              <div className="text-gray-400 text-sm">{s.stat_labels[3] ?? ""}</div>
            </div>
          </div>
        </motion.div>

        {!user && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-6 mt-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">{s.unlock_title}</h3>
            <p className="text-gray-400 mb-4">{s.unlock_body}</p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">{s.unlock_cta}</Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
