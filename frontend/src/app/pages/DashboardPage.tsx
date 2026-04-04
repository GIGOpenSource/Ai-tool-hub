import { Link } from "react-router"; // 仪表盘 CTA 跳转提交页、详情页
import { toast } from "sonner"; // 上架说明等轻提示
import { TrendingUp, MousePointerClick, Star, Plus, Eye, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button, buttonVariants } from "../components/ui/button"; // buttonVariants：单独 <Link> 复用按钮样式，避免 asChild 与路由冲突
import { cn } from "../components/ui/utils"; // 合并 Tailwind 类名
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card } from "../components/ui/card";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext"; // 未登录不展示「添加工具」
import { Navigation } from "../components/Navigation";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";
import { SEO } from "../components/SEO"; // 仪表盘 TDK
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // /dashboard canonical
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // 仪表盘 SEO 覆写

type DashPayload = {
  stat_badges: string[];
  summary_numbers: { views: string; clicks: string; rating: string; ctr: string };
  page_views_data: Array<{ date: string; views: number; clicks: number }>;
  ratings_data: Array<{ date: string; rating: number; reviews: number }>;
  category_performance: Array<{ category: string; tools: number; views: number; engagement: number }>;
  my_tools: Array<{
    id: number;
    slug?: string; // 与 GET /api/tools 的 id（slug）一致时可链到详情
    name: string;
    category: string;
    status: string;
    views: number;
    clicks: number;
    rating: number;
    featured: boolean;
  }>;
  ui: Record<string, string | string[]>;
};

/** 将 /api/dashboard-data 规范为完整结构，缺键（含 `{}`）不再触发 badges[0] / myTools.map 崩溃 */
function normalizeDash(raw: Partial<DashPayload> | null | undefined): DashPayload {
  const r = raw ?? {}; // 无体或空对象走壳数据
  const nums = r.summary_numbers; // 摘要数字
  const rawBadges = Array.isArray(r.stat_badges) ? r.stat_badges.filter((x): x is string => typeof x === "string") : []; // 仅字符串徽章
  const stat_badges = [...rawBadges]; // 可变副本
  while (stat_badges.length < 4) stat_badges.push("—"); // 四格卡占位
  return {
    stat_badges: stat_badges.slice(0, 4), // 只保留前四个
    summary_numbers: {
      views: typeof nums?.views === "string" ? nums.views : "—", // 缺省占位
      clicks: typeof nums?.clicks === "string" ? nums.clicks : "—",
      rating: typeof nums?.rating === "string" ? nums.rating : "—",
      ctr: typeof nums?.ctr === "string" ? nums.ctr : "—",
    },
    page_views_data: Array.isArray(r.page_views_data) ? r.page_views_data : [], // 图表数据源
    ratings_data: Array.isArray(r.ratings_data) ? r.ratings_data : [],
    category_performance: Array.isArray(r.category_performance) ? r.category_performance : [],
    my_tools: Array.isArray(r.my_tools) ? r.my_tools : [], // 表格必为数组
    ui: r.ui && typeof r.ui === "object" && !Array.isArray(r.ui) ? (r.ui as Record<string, string | string[]>) : {}, // 运营文案块
  };
}

export function DashboardPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth(); // 与顶栏 Submit 可见性一致
  const [d, setD] = useState<DashPayload | null>(null);
  const seoMerged = useResolvedPageSeo("/dashboard", {
    title: t("dashboard.title"),
    description: t("dashboard.subtitle"),
    keywords: "AI tools dashboard,developer analytics,AI Tools Hub",
  }); // 文案来自 i18n，可按 path 覆盖

  useEffect(() => {
    apiGet<Partial<DashPayload>>(`/api/dashboard-data?locale=${encodeURIComponent(language)}`)
      .then((raw) => setD(normalizeDash(raw))) // 带 JWT 时后端合并我的工具与埋点；locale 影响分类名
      .catch(() => setD(normalizeDash({}))); // 失败亦退出加载态
  }, [language, user?.id]); // 语言或登录身份变化时重拉

  if (!d) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("common.loading")} description={t("dashboard.subtitle")} htmlLang={language} /> {/* 加载态 */}
        {t("common.loading")}
      </div>
    );
  }

  const origin = getPublicSiteOrigin(); // 公网根
  const dashUrl = origin ? `${origin}/dashboard` : ""; // 仪表盘 URL（需登录，仍可设 canonical）

  const pageViewsData = d.page_views_data;
  const ratingsData = d.ratings_data;
  const categoryPerformance = d.category_performance;
  const myTools = d.my_tools;
  const badges = d.stat_badges;
  const sum = d.summary_numbers;
  const ui = d.ui;
  const g = (k: string, fb: string) => (typeof ui[k] === "string" ? (ui[k] as string) : fb);
  const featBullets = Array.isArray(ui.get_featured_bullets) ? (ui.get_featured_bullets as string[]) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || dashUrl || undefined}
        canonical={seoMerged.canonical || dashUrl || undefined}
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {t("dashboard.title")}
            </h1>
            <p className="text-gray-400">{t("dashboard.subtitle")}</p>
          </div>
          {user ? (
            <Link
              to="/submit"
              className={cn(
                buttonVariants(), // 与 Button 同源尺寸与 focus 环
                "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600 no-underline shrink-0", // 单一 <a>
              )}
            >
              <Plus className="w-4 h-4" />
              {t("dashboard.addNewTool")}
            </Link>
          ) : null}
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <Eye className="w-6 h-6 text-cyan-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{badges[0]}</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{sum.views}</div>
            <div className="text-gray-400 text-sm">{t("dashboard.totalViews")}</div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <MousePointerClick className="w-6 h-6 text-purple-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{badges[1]}</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{sum.clicks}</div>
            <div className="text-gray-400 text-sm">{t("dashboard.outboundClicks")}</div>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/20 rounded-lg">
                <Star className="w-6 h-6 text-pink-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{badges[2]}</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{sum.rating}</div>
            <div className="text-gray-400 text-sm">{t("dashboard.averageRating")}</div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{badges[3]}</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{sum.ctr}</div>
            <div className="text-gray-400 text-sm">{t("dashboard.clickThroughRate")}</div>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="mb-8">
          <TabsList className="bg-[#1a0b2e]/50 border border-purple-500/20 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              {t("dashboard.overview")}
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              {t("dashboard.performance")}
            </TabsTrigger>
            <TabsTrigger value="ratings" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              {t("dashboard.ratings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{g("chart_views_clicks", t("dashboard.viewsClicks"))}</h2>
                <div className="flex items-center gap-2">
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    <Calendar className="w-3 h-3 mr-1" />
                    {g("period_badge", t("dashboard.last30Days"))}
                  </Badge>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={pageViewsData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a855f7" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a0b2e",
                      border: "1px solid #a855f7",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#22d3ee"
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#a855f7"
                    fillOpacity={1}
                    fill="url(#colorClicks)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">{g("chart_category", t("dashboard.categoryPerformance"))}</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a855f7" opacity={0.1} />
                  <XAxis dataKey="category" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a0b2e",
                      border: "1px solid #a855f7",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="views" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="engagement" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="ratings">
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">{g("chart_ratings", t("dashboard.ratingsTrend"))}</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={ratingsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a855f7" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis domain={[0, 5]} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a0b2e",
                      border: "1px solid #a855f7",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="rating" stroke="#22d3ee" strokeWidth={3} dot={{ fill: "#22d3ee", r: 6 }} />
                  <Line type="monotone" dataKey="reviews" stroke="#a855f7" strokeWidth={3} dot={{ fill: "#a855f7", r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* My Tools Management */}
        <div id="dashboard-my-tools" className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">{t("dashboard.myTools")}</h2>
            <Button
              type="button"
              variant="outline"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
              onClick={() => {
                document.getElementById("dashboard-my-tools")?.scrollIntoView({ behavior: "smooth", block: "start" }); // 滚回当前区块
                toast.info(g("manage_all_scroll", t("dashboard.manageAll")), { duration: 2500 }); // 提示仍为当前列表
              }}
            >
              {g("manage_all", t("dashboard.manageAll"))}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">{t("dashboard.toolName")}</th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">{t("dashboard.category")}</th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">{t("dashboard.status")}</th>
                  <th className="text-center text-gray-400 font-semibold py-3 px-4">{t("dashboard.views")}</th>
                  <th className="text-center text-gray-400 font-semibold py-3 px-4">{t("dashboard.clicks")}</th>
                  <th className="text-center text-gray-400 font-semibold py-3 px-4">{t("dashboard.rating")}</th>
                  <th className="text-right text-gray-400 font-semibold py-3 px-4">{t("dashboard.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {myTools.map((tool) => (
                  <tr key={tool.id} className="border-b border-purple-500/10 hover:bg-purple-900/20 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="text-white font-semibold">{tool.name}</div>
                        {tool.featured && (
                          <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0">{g("featured_badge", t("dashboard.featured"))}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                        {tool.category}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        className={
                          tool.status === "Active"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }
                      >
                        {tool.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center text-white">{tool.views.toLocaleString()}</td>
                    <td className="py-4 px-4 text-center text-white">{tool.clicks.toLocaleString()}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white">{tool.rating > 0 ? tool.rating : "-"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                          onClick={() => toast.info(g("edit_listing_hint", "Listing updates are admin-reviewed."), { duration: 4500 })} // 无自助改上架字段 API
                        >
                          {t("dashboard.edit")}
                        </Button>
                        {tool.slug ? (
                          <Button asChild variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20">
                            <Link to={`/tool/${encodeURIComponent(tool.slug)}`}>{t("dashboard.view")}</Link>
                          </Button>
                        ) : (
                          <Button type="button" variant="outline" size="sm" disabled className="border-cyan-500/30 text-cyan-400 opacity-50">
                            {t("dashboard.view")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Get Featured Section */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{g("get_featured_title", t("dashboard.boostVisibility"))}</h2>
              <p className="text-gray-400 mb-4">{g("get_featured_body", t("dashboard.boostDescription"))}</p>
              <ul className="space-y-2 text-gray-300">
                {featBullets.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">✓</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6 text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">{g("price", "$99")}</div>
              <div className="text-gray-400 mb-6">{g("per_month", "")}</div>
              <Button asChild className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                <Link
                  to="/support/contact"
                  onClick={() => toast.info(g("get_featured_hint", g("get_featured_cta", t("dashboard.getFeatured"))), { duration: 3500 })} // 跳转前说明需运营对接
                >
                  {g("get_featured_cta", t("dashboard.getFeatured"))}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}