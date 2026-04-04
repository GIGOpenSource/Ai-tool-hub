import { Link } from "react-router";
import { BookOpen, Home, CheckCircle, ChevronRight, User, Heart } from "lucide-react";
import { Button } from "../components/ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";
import { DynamicLucide } from "../../lib/lucideMap";
import { SEO } from "../components/SEO"; // 指南页 TDK
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // /guide
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 指南页 SEO

type GuideData = {
  page_title: string;
  page_subtitle: string;
  steps: Array<{
    title: string;
    icon_key: string;
    description: string;
    color: string;
    features: string[];
    path: string;
  }>;
  feature_highlights: Array<{ icon_key: string; title: string; description: string }>;
  workflow_title: string;
  try_cta: string;
  key_features_title: string;
  account_section_title: string;
  profile_card: { title: string; bullets: string[]; cta: string; href: string };
  favorites_card: { title: string; bullets: string[]; cta: string; href: string };
  tips_title: string;
  tips_discovery_title: string;
  tips_discovery_bullets: string[];
  tips_contrib_title: string;
  tips_contrib_bullets: string[];
  cta_title: string;
  cta_body: string;
  cta_primary: string;
  cta_secondary: string;
};

export function GuidePage() {
  const { t, language } = useLanguage();
  const [g, setG] = useState<GuideData | null>(null);

  useEffect(() => {
    apiGet<GuideData>("/api/site/guide").then(setG).catch(() => setG(null));
  }, []);

  const seoMerged = useResolvedPageSeo("/guide", {
    title: g?.page_title ?? "",
    description: g ? g.page_subtitle.slice(0, 160) : "",
    keywords: `${t("nav.guide")},AI Tools Hub,onboarding`,
  }); // site/guide 与 page_seo 合并

  if (!g) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("common.loading")} description={t("nav.guide")} htmlLang={language} /> {/* 加载 */}
        {t("common.loading")}
      </div>
    );
  }

  const origin = getPublicSiteOrigin(); // 站点根
  const guideUrl = origin ? `${origin}/guide` : ""; // 指南页

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || guideUrl || undefined}
        canonical={seoMerged.canonical || guideUrl || undefined}
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-cyan-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              {g.page_title}
            </h1>
          </div>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">{g.page_subtitle}</p>
        </motion.div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">{g.workflow_title}</h2>
          <div className="max-w-4xl mx-auto space-y-6">
            {g.steps.map((step, index) => (
              <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 hover:border-cyan-400/50 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 shrink-0">
                      <DynamicLucide name={step.icon_key} className={`w-8 h-8 ${step.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                      <p className="text-gray-400 mb-4">{step.description}</p>
                      <ul className="space-y-2 mb-4">
                        {step.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-2 text-gray-300">
                            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link to={step.path}>
                        <Button variant="outline" className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50 group-hover:text-cyan-400">
                          {g.try_cta}
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">{g.key_features_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {g.feature_highlights.map((feature, index) => (
              <div key={index} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6 hover:border-cyan-400/50 hover:bg-purple-900/30 transition-all">
                <DynamicLucide name={feature.icon_key} className="w-8 h-8 text-cyan-400 mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">{g.account_section_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6">
              <User className="w-8 h-8 text-cyan-400 mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">{g.profile_card.title}</h3>
              <ul className="space-y-2 text-gray-400">
                {g.profile_card.bullets.map((b, i) => (
                  <li key={i}>• {b}</li>
                ))}
              </ul>
              <Link to={g.profile_card.href} className="mt-4 inline-block">
                <Button variant="outline" className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20">
                  {g.profile_card.cta}
                </Button>
              </Link>
            </div>
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6">
              <Heart className="w-8 h-8 text-pink-400 mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">{g.favorites_card.title}</h3>
              <ul className="space-y-2 text-gray-400">
                {g.favorites_card.bullets.map((b, i) => (
                  <li key={i}>• {b}</li>
                ))}
              </ul>
              <Link to={g.favorites_card.href} className="mt-4 inline-block">
                <Button variant="outline" className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20">
                  {g.favorites_card.cta}
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">{g.tips_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-bold text-cyan-400 mb-3">{g.tips_discovery_title}</h3>
              <ul className="space-y-2 text-gray-300">
                {g.tips_discovery_bullets.map((b, i) => (
                  <li key={i}>✓ {b}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-3">{g.tips_contrib_title}</h3>
              <ul className="space-y-2 text-gray-300">
                {g.tips_contrib_bullets.map((b, i) => (
                  <li key={i}>✓ {b}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="text-center mt-16">
          <h2 className="text-3xl font-bold text-white mb-4">{g.cta_title}</h2>
          <p className="text-gray-400 mb-6">{g.cta_body}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                <Home className="w-4 h-4 mr-2" />
                {g.cta_primary}
              </Button>
            </Link>
            <Link to="/sitemap">
              <Button variant="outline" className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20">
                {g.cta_secondary}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
