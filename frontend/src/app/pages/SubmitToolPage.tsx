/**
 * 提交新工具页：元数据来自 GET /api/submit-options（分类、定价选项、多语文案）；
 * 提交走 POST /api/submissions/tool，需已登录（JWT 由 apiPost 自动带上）。
 */
import React, { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Upload, Image, Link as LinkIcon, Tag, DollarSign, FileText, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { toast } from "sonner";
import { motion } from "motion/react";
import { apiGet, apiPost } from "../../lib/api";
import { useLanguage } from "../contexts/LanguageContext";
import { SEO } from "../components/SEO"; // 提交页各状态 TDK
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // /submit canonical
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 提交页 TDK 可后台覆写

/** 可选分类：slug 提交给后端，name 仅展示 */
type Cat = { slug: string; name: string };

/** /api/submit-options 返回结构（与后端 catalog.submit_options 一致） */
type SubmitOpts = {
  categories: Cat[];
  pricing_options: string[];
  /** 页面文案、气泡提示等可配置项；guidelines 为字符串数组 */
  ui: Record<string, string | string[]>;
};

export function SubmitToolPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opts, setOpts] = useState<SubmitOpts | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    website: "",
    description: "",
    longDescription: "",
    categorySlug: "",
    pricing: "",
    features: "",
    logo: "",
  });

  const [loading, setLoading] = useState(false);
  /** 提交成功后展示感谢页，并在数秒后回首页 */
  const [submitted, setSubmitted] = useState(false);

  /** 语言切换时重新拉取可提交分类与 UI 文案 */
  useEffect(() => {
    apiGet<SubmitOpts>(`/api/submit-options?locale=${encodeURIComponent(language)}`)
      .then(setOpts)
      .catch(() => setOpts(null));
  }, [language]);

  /** 后端下发的界面文案；str 取单条字符串，guidelines 取列表 */
  const ui = (opts?.ui ?? {}) as Record<string, string | string[]>;
  const str = (k: string, fb: string) => (typeof ui[k] === "string" ? (ui[k] as string) : fb);
  const guidelines = Array.isArray(ui.guidelines) ? (ui.guidelines as string[]) : [];
  const uiEarly = (opts?.ui ?? {}) as Record<string, string | string[]>; // opts 可能为空，与 str 同步键源
  const strSeoFb = (k: string, fb: string) => (typeof uiEarly[k] === "string" ? (uiEarly[k] as string) : fb); // 供 hook 使用的稳定取词
  const seoSubmit = useResolvedPageSeo("/submit", {
    title: strSeoFb("page_title", t("nav.submit")),
    description: strSeoFb("page_intro", t("home.subtitle")),
    keywords: "submit AI tool,developer listing,AI Tools Hub",
  }); // 与站点块 submit 文案对齐的兜底

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(str("toast_need_login", "Login required"));
      return;
    }
    setLoading(true);
    try {
      /** 字段名与 FastAPI SubmitToolBody 对齐；后端写入 moderation_status=pending */
      await apiPost("/api/submissions/tool", {
        name: formData.name,
        website: formData.website,
        description: formData.description,
        long_description: formData.longDescription,
        category_slug: formData.categorySlug,
        pricing: formData.pricing,
        features: formData.features,
      });
      setSubmitted(true);
      toast.success(str("toast_success", "Submitted"));
      setTimeout(() => navigate("/"), 3000); // 给用户阅读成功提示的时间
    } catch {
      toast.error(str("toast_error", "Submit failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  /** 元数据未加载完成 */
  if (!opts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("common.loading")} description={t("nav.submit")} htmlLang={language} /> {/* 提交页加载 */}
        {t("common.loading")}
      </div>
    );
  }

  const origin = getPublicSiteOrigin(); // 公网根
  const submitUrl = origin ? `${origin}/submit` : ""; // 提交工具入口

  /** 未登录：仅提示回首页（提交接口也会 401） */
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <SEO
          {...seoSubmit}
          title={str("login_title", seoSubmit.title ?? t("nav.submit"))}
          description={str("page_intro", seoSubmit.description ?? t("home.subtitle"))}
          ogUrl={seoSubmit.ogUrl || submitUrl || undefined}
          canonical={seoSubmit.canonical || submitUrl || undefined}
          htmlLang={language}
        /> {/* 未登录提示 */}
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">{str("login_title", "")}</h1>
          <Link to="/">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">{str("login_cta", "Home")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  /** 提交成功后的结果态 */
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
        <SEO
          {...seoSubmit}
          title={str("success_title", t("common.success"))}
          description={String(str("success_body", "")).replace("{name}", formData.name)}
          noindex
          htmlLang={language}
        /> {/* 成功感谢页：避免重复收录；noindex 优先 */}
        <Navigation />
        <div className="container mx-auto px-4 py-20">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="max-w-md mx-auto text-center">
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-12">
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">{str("success_title", "")}</h2>
              <p className="text-gray-400 mb-6">{String(str("success_body", "")).replace("{name}", formData.name)}</p>
              <p className="text-gray-500 text-sm">{str("success_redirect", "")}</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoSubmit}
        title={str("page_title", seoSubmit.title ?? t("nav.submit"))}
        description={str("page_intro", seoSubmit.description ?? t("home.subtitle"))}
        ogUrl={seoSubmit.ogUrl || submitUrl || undefined}
        canonical={seoSubmit.canonical || submitUrl || undefined}
        htmlLang={language}
      />
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: str("breadcrumb", "Submit Tool") }]} />

        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-white">{str("page_title", "")}</h1>
            </div>
            <p className="text-gray-400">{str("page_intro", "")}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="submit-tool-form">
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  {str("section_basic", "")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300 mb-2 block">
                      {str("label_tool_name", "")} <span className="text-red-400">*</span>
                    </Label>
                    <Input id="name" type="text" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} required className="bg-purple-900/20 border-purple-500/30 text-white" placeholder={str("placeholder_tool_name", "")} />
                  </div>
                  <div>
                    <Label htmlFor="website" className="text-gray-300 mb-2 block">
                      {str("label_website", "")} <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="website" type="url" value={formData.website} onChange={(e) => handleInputChange("website", e.target.value)} required className="pl-10 bg-purple-900/20 border-purple-500/30 text-white" placeholder={str("placeholder_website", "")} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-gray-300 mb-2 block">
                      {str("label_short_desc", "")} <span className="text-red-400">*</span>
                    </Label>
                    <Input id="description" type="text" value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} required maxLength={100} className="bg-purple-900/20 border-purple-500/30 text-white" placeholder={str("placeholder_short_desc", "")} />
                    <p className="text-gray-500 text-xs mt-1">{String(str("char_count", "{n}/100")).replace("{n}", String(formData.description.length))}</p>
                  </div>
                  <div>
                    <Label htmlFor="longDescription" className="text-gray-300 mb-2 block">
                      {str("label_long_desc", "")} <span className="text-red-400">*</span>
                    </Label>
                    <Textarea id="longDescription" value={formData.longDescription} onChange={(e) => handleInputChange("longDescription", e.target.value)} required rows={6} className="bg-purple-900/20 border-purple-500/30 text-white" placeholder={str("placeholder_long_desc", "")} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-cyan-400" />
                  {str("section_category", "")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300 mb-3 block">
                      {str("label_category", "")} <span className="text-red-400">*</span>
                    </Label>
                    {/* 分类单选：存 category_slug 提交后端 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {opts.categories.map((c) => (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => handleInputChange("categorySlug", c.slug)}
                          className={`p-3 rounded-lg border transition-all text-sm ${
                            formData.categorySlug === c.slug ? "border-cyan-400 bg-cyan-500/20 text-cyan-400" : "border-purple-500/30 bg-purple-900/20 text-gray-300 hover:border-cyan-400/50"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-3 block">
                      {str("label_pricing", "")} <span className="text-red-400">*</span>
                    </Label>
                    {/* 定价模型多选一，文案来自运营配置 */}
                    <div className="flex gap-3 flex-wrap">
                      {opts.pricing_options.map((pricing) => (
                        <button
                          key={pricing}
                          type="button"
                          onClick={() => handleInputChange("pricing", pricing)}
                          className={`flex-1 min-w-[100px] p-3 rounded-lg border transition-all ${
                            formData.pricing === pricing ? "border-cyan-400 bg-cyan-500/20 text-cyan-400" : "border-purple-500/30 bg-purple-900/20 text-gray-300 hover:border-cyan-400/50"
                          }`}
                        >
                          {pricing}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-cyan-400" />
                  {str("section_additional", "")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="features" className="text-gray-300 mb-2 block">
                      {str("label_features", "")}
                    </Label>
                    <Textarea id="features" value={formData.features} onChange={(e) => handleInputChange("features", e.target.value)} rows={4} className="bg-purple-900/20 border-purple-500/30 text-white" placeholder={str("placeholder_features", "")} />
                  </div>
                  {/* logo URL 已采集进 formData，但当前 POST body 未传给后端；扩展 API 时可一并提交 */}
                  <div>
                    <Label htmlFor="logo" className="text-gray-300 mb-2 block">
                      {str("label_logo_url", "")}
                    </Label>
                    <div className="relative">
                      <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="logo" type="url" value={formData.logo} onChange={(e) => handleInputChange("logo", e.target.value)} className="pl-10 bg-purple-900/20 border-purple-500/30 text-white" placeholder={str("placeholder_logo", "")} />
                    </div>
                    <p className="text-gray-500 text-xs mt-1">{str("logo_hint", "")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">{str("guidelines_title", "")}</h4>
                <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
                  {guidelines.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/")} className="flex-1 border-purple-500/30 text-gray-300 hover:bg-purple-500/20">
                  {str("cancel", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading || !formData.name || !formData.website || !formData.description || !formData.longDescription || !formData.categorySlug || !formData.pricing
                  }
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="submit-tool-submit"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {str("submitting", "")}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {str("submit_btn", "")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
