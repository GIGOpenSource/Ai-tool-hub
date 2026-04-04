import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Edit2, Save, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { toast } from "sonner";
import { motion } from "motion/react";
import { apiGet } from "../../lib/api";
import { SEO } from "../components/SEO"; // 个人页 TDK
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // canonical
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // /profile 运营覆盖

type ProfilePayload = {
  activity: Array<{ type: string; tool: string; action: string; date: string; icon: string }>;
  stats: Array<{ label: string; value: number; color: string }>;
  ui: Record<string, string>;
  login_prompt_title: string;
  login_prompt_cta: string;
  breadcrumb_profile: string;
};

type MeActivityPayload = {
  activity: ProfilePayload["activity"];
  stats: ProfilePayload["stats"];
};

/** GET /api/me/orders 单项（与 monetization_order + tool 联接一致） */
type MeOrderItem = {
  id: number;
  tool_name: string;
  tool_slug: string;
  amount_cents: number;
  payment_status: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
};

export function ProfilePage() {
  const { t, language } = useLanguage();
  const { user, updateProfile } = useAuth();
  const [remote, setRemote] = useState<ProfilePayload | null>(null);
  const [meActivity, setMeActivity] = useState<MeActivityPayload | null>(null); // 登录态服务端动态与统计
  const [orders, setOrders] = useState<MeOrderItem[] | null>(null); // 商业化订单列表；未拉取前 null
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    email: user?.email || "",
  });

  useEffect(() => {
    apiGet<ProfilePayload>("/api/site/profile").then(setRemote).catch(() => setRemote(null));
  }, []);

  useEffect(() => {
    if (!user) {
      setMeActivity(null); // 未登录不请求用户维动态
      return;
    }
    let on = true; // StrictMode 卸载防抖
    apiGet<MeActivityPayload>(`/api/me/activity?locale=${encodeURIComponent(language)}`)
      .then((d) => {
        if (on) setMeActivity(d); // 与库表对齐的 activity/stats
      })
      .catch(() => {
        if (on) setMeActivity(null); // 回退仅用 site_json
      });
    return () => {
      on = false;
    };
  }, [user, language]); // 登录态或语言变更时刷新

  useEffect(() => {
    if (!user) {
      setOrders(null); // 未登录不请求订单
      return;
    }
    let active = true; // 防卸载后 setState
    apiGet<{ items: MeOrderItem[] }>("/api/me/orders")
      .then((d) => {
        if (active) setOrders(d.items); // 写入列表
      })
      .catch(() => {
        if (active) setOrders([]); // 失败时置空数组避免无限加载
      });
    return () => {
      active = false;
    };
  }, [user]); // 仅随登录用户变

  const profileTitleFb = remote ? (user ? remote.breadcrumb_profile : remote.login_prompt_title) : ""; // 已登录用面包屑名
  const profileDescFb =
    remote && user
      ? remote.ui["profile_meta_desc"] ?? user.name
      : remote
        ? t("nav.profile")
        : ""; // meta 描述：登录用配置或昵称；未登录用导航文案
  const seoMerged = useResolvedPageSeo("/profile", {
    title: profileTitleFb,
    description: profileDescFb,
    keywords: user ? `${user.name},profile,AI Tools Hub` : "profile,AI Tools Hub",
  }); // 全路径 /profile 统一键（未登录亦同页）

  if (!remote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("common.loading")} description={t("nav.profile")} htmlLang={language} /> {/* 加载 */}
        {t("common.loading")}
      </div>
    );
  }

  const origin = getPublicSiteOrigin(); // 站点根
  const profileUrl = origin ? `${origin}/profile` : ""; // 个人页 URL

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <SEO
          {...seoMerged}
          title={remote.login_prompt_title}
          description={seoMerged.description || t("nav.profile")}
          ogUrl={seoMerged.ogUrl || profileUrl || undefined}
          canonical={seoMerged.canonical || profileUrl || undefined}
          htmlLang={language}
        /> {/* 未登录引导页；title 以 login 文案为准 */}
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">{remote.login_prompt_title}</h1>
          <Link to="/">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">{remote.login_prompt_cta}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const pui = remote.ui;
  const pu = (k: string, fb: string) => pui[k] ?? fb;
  const activityData = meActivity?.activity ?? remote.activity; // 优先服务端聚合动态
  const stats = meActivity?.stats ?? remote.stats; // 优先真实计数

  const handleSave = () => {
    updateProfile(editedUser);
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleCancel = () => {
    setEditedUser({
      name: user.name,
      bio: user.bio || "",
      email: user.email,
    });
    setIsEditing(false);
  };

  const breadcrumbs = [{ label: t("nav.home"), href: "/" }, { label: remote.breadcrumb_profile }];
  const zhUi = language.toLowerCase().startsWith("zh"); // 个人页订单区简短中英切换

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        description={seoMerged.description || pu("profile_meta_desc", user.name)}
        ogUrl={seoMerged.ogUrl || profileUrl || undefined}
        canonical={seoMerged.canonical || profileUrl || undefined}
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 sticky top-24"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4 mx-auto w-24 h-24 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full border-2 border-cyan-400/50">
                  {user.avatar}
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
                <p className="text-gray-400 text-sm mb-4">{user.email}</p>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  {pu("member_since", "").replace("{date}", user.joinDate ?? "")}
                </Badge>
                
                {/* Edit Profile Button */}
                <Link to="/edit-profile" className="block mt-4">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                    <Edit2 className="w-4 h-4 mr-2" />
                    {pu("edit_profile_btn", "")}
                  </Button>
                </Link>
              </div>

              {user.bio && (
                <div className="mb-6 pb-6 border-b border-purple-500/20">
                  <p className="text-gray-300 text-center">{user.bio}</p>
                </div>
              )}

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-purple-500/20">
                <h3 className="text-lg font-bold text-white mb-4">{pu("statistics_title", "")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((stat, index) => (
                    <div
                      key={index}
                      className="bg-purple-900/20 rounded-lg p-3 text-center border border-purple-500/20"
                    >
                      <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                      <div className="text-gray-400 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Edit Profile Form */}
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6">{pu("edit_profile_title", "")}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 mb-2 block">{pu("label_name", "")}</label>
                    <Input
                      value={editedUser.name}
                      onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 mb-2 block">{pu("label_email", "")}</label>
                    <Input
                      value={editedUser.email}
                      onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                      type="email"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 mb-2 block">{pu("label_bio", "")}</label>
                    <Textarea
                      value={editedUser.bio}
                      onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                      placeholder={pu("bio_placeholder", "")}
                      rows={4}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">{pu("quick_actions_title", "")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/favorites">
                  <Button
                    variant="outline"
                    className="w-full h-auto flex-col py-6 border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50"
                  >
                    <span className="text-3xl mb-2">❤️</span>
                    <span>{t("nav.favorites")}</span>
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    className="w-full h-auto flex-col py-6 border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50"
                  >
                    <span className="text-3xl mb-2">📊</span>
                    <span>{t("nav.dashboard")}</span>
                  </Button>
                </Link>
                <Link to="/settings">
                  <Button
                    variant="outline"
                    className="w-full h-auto flex-col py-6 border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50"
                  >
                    <span className="text-3xl mb-2">⚙️</span>
                    <span>{t("nav.settings")}</span>
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* 推广/商业化订单（GET /api/me/orders） */}
            {orders !== null && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
                data-testid="profile-orders-section"
              >
                <h2 className="text-2xl font-bold text-white mb-4">{zhUi ? "推广订单" : "Promotion orders"}</h2>
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-sm">{zhUi ? "暂无订单。" : "No orders yet."}</p>
                ) : (
                  <ul className="space-y-3">
                    {orders.map((o) => (
                      <li key={o.id} className="rounded-lg border border-purple-500/15 overflow-hidden">
                        <Link
                          to={`/orders/${o.id}`}
                          className="flex flex-wrap items-center justify-between gap-2 p-3 bg-purple-900/15 text-sm hover:bg-purple-900/25 transition-colors"
                        >
                          <div>
                            <span className="text-white font-medium">{o.tool_name}</span>
                            <span className="text-gray-500 mx-2">·</span>
                            <span className="text-gray-400">{o.payment_status}</span>
                          </div>
                          <div className="text-gray-400 text-xs">
                            {(o.amount_cents / 100).toFixed(2)} {zhUi ? "（金额演示，单位见后台配置）" : "(amount demo)"}
                            <span className="mx-2">|</span>
                            {(o.created_at || "").slice(0, 10)}
                            <span className="ml-2 text-cyan-400/80">{zhUi ? "详情 →" : "Details →"}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">{pu("recent_activity_title", "")}</h2>
              <div className="space-y-4">
                {activityData.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex items-start gap-4 p-4 bg-purple-900/20 rounded-lg border border-purple-500/10 hover:border-cyan-400/30 transition-all"
                  >
                    <div className="text-2xl">{activity.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-white font-semibold">{activity.tool}</h4>
                        <span className="text-gray-500 text-xs">{activity.date}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{activity.action}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}