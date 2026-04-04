import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router"; // ?add=slug 从详情页带入当前工具
import { Plus, X, Search, CheckCircle2, XCircle, Star, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { SEO } from "../components/SEO";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { apiGet } from "../../lib/api";
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 合并后台 /compare SEO
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // 生成 /compare 规范链接

type CompareTool = {
  id: string;
  name: string;
  logo: string;
  category: string;
  rating: number;
  pricing: string;
  description: string;
  features: string[];
  pros: string[];
  cons: string[];
};

type ComparePayload = {
  tools: CompareTool[];
  max_compare: number;
  toast_max: string;
  toast_added: string;
  toast_removed: string;
  seo: { title: string; description: string; keywords: string };
  ui: Record<string, string>;
};

export function CompareToolsPage() {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams(); // 读取 add / tool 预选项
  const [cfg, setCfg] = useState<ComparePayload | null>(null);
  const [selectedTools, setSelectedTools] = useState<CompareTool[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showToolSelector, setShowToolSelector] = useState(true);

  useEffect(() => {
    apiGet<ComparePayload>("/api/site/compare_interactive").then(setCfg).catch(() => setCfg(null));
  }, []);

  useEffect(() => {
    if (!cfg) return; // 等目录加载后再消费查询串
    const raw = (searchParams.get("add") ?? searchParams.get("tool") ?? "").trim(); // 详情 Compare All 带 add=
    if (!raw) return; // 无预选项则跳过
    const nextSp = new URLSearchParams(searchParams.toString()); // 拷贝避免直接改只读视图
    nextSp.delete("add"); // 清掉避免刷新重复注入
    nextSp.delete("tool"); // 兼容备用键名
    setSearchParams(nextSp, { replace: true }); // replace 不留历史垃圾
    const match = (cfg.tools ?? []).find((x) => x.id === raw); // catalog 项 id 即工具 slug
    if (!match) return; // 不在对比池内则静默忽略
    const cap = cfg.max_compare ?? 4; // 与 addTool 一致
    setSelectedTools((prev) => {
      if (prev.some((x) => x.id === match.id)) return prev; // 已在选中区
      if (prev.length >= cap) {
        toast.error(cfg.toast_max ?? "Max"); // 与手动添加相同提示
        return prev;
      }
      const tmpl = cfg.toast_added ?? "{name}"; // 站点可配文案
      toast.success(tmpl.replace("{name}", match.name)); // 与 addTool 一致
      return [...prev, match]; // 预填当前工具
    });
  }, [cfg, searchParams, setSearchParams]); // cfg 就绪或 URL 变化时尝试一次

  const max = cfg?.max_compare ?? 4;
  const catalog = cfg?.tools ?? [];
  const ui = cfg?.ui ?? {};

  const seoProps = useResolvedPageSeo("/compare", {
    title: cfg?.seo.title,
    description: cfg?.seo.description,
    keywords: cfg?.seo.keywords ?? "",
  }); // compare_interactive 作底，page_seo 可覆写

  const filteredTools = useMemo(
    () =>
      catalog.filter(
        (tool) =>
          !selectedTools.find((x) => x.id === tool.id) &&
          (tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.category.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [catalog, selectedTools, searchQuery]
  );

  const addTool = (tool: CompareTool) => {
    if (selectedTools.length >= max) {
      toast.error(cfg?.toast_max ?? "Max");
      return;
    }
    setSelectedTools([...selectedTools, tool]);
    const tmpl = cfg?.toast_added ?? "{name}";
    toast.success(tmpl.replace("{name}", tool.name));
  };

  const removeTool = (toolId: string) => {
    setSelectedTools(selectedTools.filter((x) => x.id !== toolId));
    toast.success(cfg?.toast_removed ?? "");
  };

  if (!cfg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("common.loading")} description={t("nav.compare")} htmlLang={language} /> {/* 首屏占位 TDK */}
        {t("common.loading")}
      </div>
    );
  }

  const origin = getPublicSiteOrigin(); // 公网根
  const pageUrl = origin ? `${origin}/compare` : ""; // 对比工具入口页

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoProps}
        ogUrl={seoProps.ogUrl || pageUrl || undefined}
        canonical={seoProps.canonical || pageUrl || undefined}
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t("nav.compare")}
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">{ui.page_intro}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              {ui.selected_prefix} ({selectedTools.length}/{max})
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowToolSelector(!showToolSelector)}
              className="border-purple-500/30 text-cyan-400 hover:bg-purple-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showToolSelector ? ui.hide_selector : ui.show_selector}
            </Button>
          </div>

          {selectedTools.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              <AnimatePresence>
                {selectedTools.map((tool) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-full px-4 py-2 hover:border-cyan-400/60 transition-all"
                  >
                    <span className="text-2xl">{tool.logo}</span>
                    <span className="text-white font-semibold">{tool.name}</span>
                    <button type="button" onClick={() => removeTool(tool.id)} className="ml-2 p-1 rounded-full hover:bg-red-500/20 transition-colors">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-8 bg-[#1a0b2e]/30 border border-purple-500/20 rounded-xl">
              <p className="text-gray-400">{ui.no_selected}</p>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {showToolSelector && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-8">
              <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">{ui.available_title}</h2>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder={ui.search_placeholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 bg-[#0a0118]/50 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTools.map((tool) => (
                    <motion.div
                      key={tool.id}
                      role="button"
                      tabIndex={0}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-[#0a0118]/50 border border-purple-500/20 rounded-xl p-4 hover:border-cyan-400/50 hover:bg-purple-900/20 transition-all cursor-pointer"
                      onClick={() => addTool(tool)}
                      onKeyDown={(e) => e.key === "Enter" && addTool(tool)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{tool.logo}</span>
                          <div>
                            <h3 className="text-white font-bold group-hover:text-cyan-400 transition-colors">{tool.name}</h3>
                            <Badge className="bg-purple-500/20 text-purple-300 text-xs mt-1">{tool.category}</Badge>
                          </div>
                        </div>
                        <Plus className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{tool.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-white text-sm font-semibold">{tool.rating}</span>
                        </div>
                        <Badge className="bg-cyan-500/20 text-cyan-300 text-xs">{tool.pricing}</Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {filteredTools.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">{ui.no_search_results}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedTools.length >= 2 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-900/30 border-b border-purple-500/20">
                  <tr>
                    <th className="text-left p-4 text-gray-300 font-semibold min-w-[150px]">{ui.table_feature}</th>
                    {selectedTools.map((tool) => (
                      <th key={tool.id} className="text-center p-4 min-w-[250px]">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl">{tool.logo}</span>
                          <span className="text-white font-bold">{tool.name}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-white text-sm">{tool.rating}</span>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-purple-500/10">
                    <td className="p-4 text-gray-300 font-semibold">{ui.row_category}</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4 text-center">
                        <Badge className="bg-purple-500/20 text-purple-300">{tool.category}</Badge>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-purple-500/10 bg-[#0a0118]/30">
                    <td className="p-4 text-gray-300 font-semibold">{ui.row_pricing}</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4 text-center">
                        <Badge
                          className={`${
                            tool.pricing === "Free"
                              ? "bg-green-500/20 text-green-300"
                              : tool.pricing === "Paid"
                                ? "bg-orange-500/20 text-orange-300"
                                : "bg-cyan-500/20 text-cyan-300"
                          }`}
                        >
                          {tool.pricing}
                        </Badge>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-purple-500/10">
                    <td className="p-4 text-gray-300 font-semibold">{ui.row_description}</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4 text-center text-gray-400 text-sm">
                        {tool.description}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-purple-500/10 bg-[#0a0118]/30">
                    <td className="p-4 text-gray-300 font-semibold">{ui.row_key_features}</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4">
                        <ul className="space-y-2 text-left">
                          {tool.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-400 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-purple-500/10">
                    <td className="p-4 text-gray-300 font-semibold">{ui.row_pros}</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4">
                        <ul className="space-y-2 text-left">
                          {tool.pros.map((pro, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-400 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-purple-500/10 bg-[#0a0118]/30">
                    <td className="p-4 text-gray-300 font-semibold">{ui.row_cons}</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4">
                        <ul className="space-y-2 text-left">
                          {tool.cons.map((con, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-400 text-sm">
                              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-300 font-semibold">{ui.row_visit}</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4 text-center">
                        <Link to={`/tool/${tool.id}`}>
                          <Button type="button" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {ui.view_details}
                          </Button>
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : selectedTools.length === 1 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 bg-[#1a0b2e]/30 border border-purple-500/20 rounded-2xl">
            <ArrowRight className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">{ui.need_more_title}</h3>
            <p className="text-gray-400">{ui.need_more_body}</p>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
