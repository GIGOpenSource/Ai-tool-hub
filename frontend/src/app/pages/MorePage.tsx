import { Link } from "react-router";
import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";
import { DynamicLucide } from "../../lib/lucideMap";
import { SEO } from "../components/SEO"; // 更多入口 TDK
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // /more
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 更多页 SEO

type MoreData = {
  page_subtitle: string; // 页顶副标题（API 仍可能含 quick_access / nav_links，前端不再展示）
  resources_title: string; // 「资源」区标题
  stats: Array<{ value: string; label: string }>; // 底部统计四格
  resource_links: Array<{ icon_key: string; title: string; description: string; href: string }>; // 资源卡片列表
};

function resolveResourceHref(href: string): string {
  const map: Record<string, string> = {
    "#faq": "/support/faq",
    "#contact": "/support/contact",
    "#privacy": "/support/privacy",
    "#terms": "/support/terms",
  };
  return map[href] || href;
}

export function MorePage() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<MoreData | null>(null);

  useEffect(() => {
    apiGet<MoreData>("/api/site/more").then(setData).catch(() => setData(null));
  }, []);

  const seoMerged = useResolvedPageSeo("/more", {
    title: t("nav.more"),
    description: data?.page_subtitle ?? "",
    keywords: `${t("nav.more")},AI Tools Hub,navigation`,
  }); // 副标题来自 more 块

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("common.loading")} description={t("nav.more")} htmlLang={language} /> {/* 加载 */}
        {t("common.loading")}
      </div>
    );
  }

  const origin = getPublicSiteOrigin(); // 站点根
  const moreUrl = origin ? `${origin}/more` : ""; // 更多页

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || moreUrl || undefined}
        canonical={seoMerged.canonical || moreUrl || undefined}
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t("nav.more")}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{data.page_subtitle}</p>
        </motion.div>

        {/* 无 Quick Access 后资源区整体上移，动效 delay 略提前 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="text-2xl font-bold text-white mb-6">{data.resources_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.resource_links.map((link, index) => (
              <motion.div key={link.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + index * 0.05 }}>
                <Link to={resolveResourceHref(link.href)}>
                  <div className="group bg-[#1a0b2e]/30 border border-purple-500/10 rounded-xl p-4 hover:border-purple-400/30 hover:bg-purple-900/20 transition-all cursor-pointer flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                      <DynamicLucide name={link.icon_key} className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{link.title}</h3>
                      <p className="text-gray-500 text-sm">{link.description}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-16 bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/20 rounded-2xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {data.stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-cyan-400 mb-1">{s.value}</div>
                <div className="text-gray-400 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
