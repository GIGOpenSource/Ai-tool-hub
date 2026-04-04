import { Link, useParams } from "react-router";
import { GitCompare, CheckCircle2, XCircle, Star, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { motion } from "motion/react";
import { useComparisonData } from "./comparison/useComparisonData";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";
import { SEO } from "../components/SEO"; // 对比落地页 TDK
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // 绝对 URL
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 对比落地页 path 级 SEO

type Nf = { compare_title: string; cta_home: string };

export function ComparisonPage() {
  const { toolName } = useParams();
  const { t, language } = useLanguage();
  const zhUi = language.toLowerCase().startsWith("zh"); // 对比卡推广标文案
  const { data, failed } = useComparisonData(toolName);
  const comparePath = toolName ? `/compare/${toolName}` : "/compare"; // 与对比 slug 一致
  const pageTitleFb = data && !failed ? `${data.mainTool.name} ${data.seo_title_suffix}` : ""; // API 组标题
  const introFb =
    data && data.mainTool ? data.seo_intro.replace("{main}", data.mainTool.name).slice(0, 160) : ""; // 简介截断
  const kwFb = data && data.mainTool ? `${data.mainTool.name},AI compare,alternatives,AI Tools Hub` : ""; // 关键词底
  const seoMerged = useResolvedPageSeo(comparePath, {
    title: pageTitleFb,
    description: introFb,
    keywords: kwFb,
  }); // 对比 JSON 为底，page_seo 可覆写
  const [nf, setNf] = useState<Nf | null>(null);

  useEffect(() => {
    apiGet<Nf>("/api/site/not_found")
      .then(setNf)
      .catch(() => setNf({ compare_title: "Comparison not found", cta_home: "Back to Home" }));
  }, []);

  if (failed || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <SEO noindex title={nf?.compare_title ?? t("common.error")} description="" htmlLang={language} /> {/* 对比不存在：不索引 */}
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">{nf?.compare_title ?? t("common.error")}</h1>
          <Link to="/">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">{nf?.cta_home ?? "Home"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const allTools = [data.mainTool, ...data.alternatives];
  const intro = data.seo_intro.replace("{main}", data.mainTool.name);
  const title = `${data.mainTool.name} ${data.seo_title_suffix}`;
  const origin = getPublicSiteOrigin(); // 公网根
  const pageUrl = origin && toolName ? `${origin}/compare/${encodeURIComponent(toolName)}` : ""; // 当前对比页 URL

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || pageUrl || undefined}
        canonical={seoMerged.canonical || pageUrl || undefined}
        ogType={seoMerged.ogType || "article"}
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0 mb-4">
            <GitCompare className="w-4 h-4 mr-1" />
            {t("compare.seoComparison")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">{intro}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {allTools.map((tool, index) => (
            <div
              key={index}
              className={`bg-[#1a0b2e]/50 border rounded-2xl p-6 ${
                index === 0 ? "border-cyan-500/50 ring-2 ring-cyan-500/20" : "border-purple-500/20"
              }`}
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">{tool.logo}</div>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-white">{tool.name}</h3>
                  {tool.promotion_active ? (
                    <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40 text-[10px]">
                      {zhUi ? "付费推广" : "Promoted"}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-gray-500 text-sm mb-3">{tool.developer}</p>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="text-yellow-400">⭐</span>
                  <span className="text-white font-semibold">{tool.rating}</span>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-3">{tool.pricing}</Badge>
                <p className="text-gray-400 text-sm line-clamp-2">{tool.description}</p>
              </div>
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("tool.visitWebsite")}
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl overflow-hidden mb-12">
          <div className="overflow-x-auto">
            {data.features.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <div className="bg-purple-900/30 px-6 py-4 border-b border-purple-500/20">
                  <h2 className="text-xl font-bold text-white">{section.category}</h2>
                </div>
                <div className="divide-y divide-purple-500/10">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-purple-900/20 transition-colors">
                      <div className="col-span-1 text-gray-300 font-medium">{String(item.name)}</div>
                      {(["chatgpt", "claude", "gemini", "copilot"] as const).map((col) => (
                        <div key={col} className="text-center">
                          {typeof item[col] === "boolean" ? (
                            item[col] ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                            )
                          ) : (
                            <span className={col === "chatgpt" ? "text-cyan-400 font-semibold" : "text-gray-300"}>
                              {String(item[col] ?? "")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {allTools.map((tool, index) => {
            const toolKey = index === 0 ? "chatgpt" : index === 1 ? "claude" : index === 2 ? "gemini" : "copilot";
            return (
              <div key={index} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">{tool.name}</h3>
                <div className="mb-4">
                  <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t("compare.pros")}
                  </h4>
                  <ul className="space-y-1">
                    {(data.pros[toolKey] ?? []).map((pro, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {t("compare.cons")}
                  </h4>
                  <ul className="space-y-1">
                    {(data.cons[toolKey] ?? []).map((con, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-red-400 mt-1">-</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">{data.seo_chooser_title}</h2>
          <div className="text-gray-300 space-y-4">
            <p>{data.seo_chooser_intro}</p>
            <div className="space-y-3">
              {data.seo_cards.map((card, i) => (
                <motion.div key={i} className="bg-purple-900/20 rounded-lg p-4">
                  <h3 className="text-cyan-400 font-semibold mb-2">{card.title.replace("{name}", data.mainTool.name)}</h3>
                  <p className="text-gray-400">{card.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-purple-900/20 bg-[#0a0118]/80 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-500">
            <p>{data.footer_note}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
