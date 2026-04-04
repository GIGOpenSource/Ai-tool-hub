import { Link, useLocation } from "react-router"; // 404 使用真实 pathname 匹配 page_seo
import { Home, Search, ArrowLeft, Compass } from "lucide-react";
import { Button } from "../components/ui/button";
import { Navigation } from "../components/Navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { motion } from "motion/react";
import { SEO } from "../components/SEO"; // 404：noindex
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 可选按 path 定制 404 文案

export function NotFoundPage() {
  const { t, language } = useLanguage();
  const { pathname } = useLocation(); // 用户访问的无效路径
  const seoMerged = useResolvedPageSeo(pathname, {
    title: "404",
    description: t("nav.home"),
    keywords: "404,not found",
  }); // 一般无配置则走兜底

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        noindex
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center"
        >
          {/* 404 Animation */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <div className="text-[120px] md:text-[180px] font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-none">
                404
              </div>
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 0.9, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="absolute -top-4 -right-4"
              >
                <Compass className="w-16 h-16 md:w-24 md:h-24 text-cyan-400 opacity-50" />
              </motion.div>
            </div>
          </motion.div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Page Not Found
            </h1>
            <p className="text-gray-400 text-lg mb-2">
              Oops! The page you're looking for doesn't exist.
            </p>
            <p className="text-gray-500">
              It might have been moved, deleted, or the URL might be incorrect.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Link to="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link to="/sitemap">
              <Button
                variant="outline"
                className="border-purple-500/30 text-cyan-400 hover:bg-purple-500/20 w-full sm:w-auto"
              >
                <Search className="w-4 h-4 mr-2" />
                Browse Sitemap
              </Button>
            </Link>
          </motion.div>

          {/* Helpful Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-8"
          >
            <h2 className="text-xl font-bold text-white mb-6">
              You might be looking for:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/"
                className="group flex items-center gap-3 p-4 bg-purple-900/20 rounded-xl border border-purple-500/20 hover:border-cyan-400/50 hover:bg-purple-900/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Home className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                    AI Tools Directory
                  </div>
                  <div className="text-gray-400 text-sm">Browse all tools</div>
                </div>
              </Link>

              <Link
                to="/compare"
                className="group flex items-center gap-3 p-4 bg-purple-900/20 rounded-xl border border-purple-500/20 hover:border-cyan-400/50 hover:bg-purple-900/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Search className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                    Compare Tools
                  </div>
                  <div className="text-gray-400 text-sm">Side-by-side comparison</div>
                </div>
              </Link>

              <Link
                to="/dashboard"
                className="group flex items-center gap-3 p-4 bg-purple-900/20 rounded-xl border border-purple-500/20 hover:border-cyan-400/50 hover:bg-purple-900/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-pink-500/20">
                  <ArrowLeft className="w-5 h-5 text-pink-400" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                    Dashboard
                  </div>
                  <div className="text-gray-400 text-sm">Analytics & stats</div>
                </div>
              </Link>

              <Link
                to="/guide"
                className="group flex items-center gap-3 p-4 bg-purple-900/20 rounded-xl border border-purple-500/20 hover:border-cyan-400/50 hover:bg-purple-900/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Compass className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                    User Guide
                  </div>
                  <div className="text-gray-400 text-sm">Learn how to use</div>
                </div>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
