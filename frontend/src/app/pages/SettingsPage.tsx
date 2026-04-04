import React, { useEffect, useState } from "react";
import { Settings, Bell, Lock, Globe, Moon, Shield, Mail, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { SEO } from "../components/SEO"; // 设置页 TDK
import { getPublicSiteOrigin } from "../../lib/siteUrl"; // canonical
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo"; // /settings 元数据
import { apiGet, apiPut } from "../../lib/api";

type UserSettingsPayload = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  newToolAlerts: boolean;
  darkMode: boolean;
  compactView: boolean;
  autoplayVideos: boolean;
  showTrending: boolean;
  profileSearchable: boolean;
  shareUsageData: boolean;
  loginAlerts: boolean;
  twoFactorRequired: boolean;
  displayLanguage: "en" | "zh";
};

const defaultSettings: UserSettingsPayload = {
  emailNotifications: true,
  pushNotifications: false,
  weeklyDigest: true,
  newToolAlerts: true,
  darkMode: true,
  compactView: false,
  autoplayVideos: false,
  showTrending: true,
  profileSearchable: true,
  shareUsageData: false,
  loginAlerts: true,
  twoFactorRequired: false,
  displayLanguage: "en",
};

export function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState<UserSettingsPayload>(defaultSettings);
  const [activeSection, setActiveSection] = useState("notifications");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const seoMerged = useResolvedPageSeo("/settings", {
    title: t("nav.settings"),
    description: `${t("nav.settings")} — AI Tools Hub`,
    keywords: "account settings,notifications,AI Tools Hub",
  }); // 与其它 hook 同级，避免插在普通语句后

  useEffect(() => {
    let on = true;
    apiGet<{ payload: Partial<UserSettingsPayload> }>("/api/me/settings")
      .then((res) => {
        if (!on) return;
        const merged = { ...defaultSettings, ...(res.payload ?? {}) };
        setSettings(merged);
        if (merged.displayLanguage !== language) setLanguage(merged.displayLanguage);
      })
      .catch(() => {})
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, [language, setLanguage]);

  const handleToggle = (key: keyof UserSettingsPayload) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiPut("/api/me/settings", { payload: settings });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    const top = window.scrollY + target.getBoundingClientRect().top - 96;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveSection(sectionId);
  };

  const breadcrumbs = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.settings") },
  ];

  const origin = getPublicSiteOrigin(); // 站点根
  const settingsUrl = origin ? `${origin}/settings` : ""; // 设置页 URL

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <Navigation />
        Please login first.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <Navigation />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || settingsUrl || undefined}
        canonical={seoMerged.canonical || settingsUrl || undefined}
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">Settings</h1>
          </div>
          <p className="text-gray-400">Manage your account preferences and settings</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-4 sticky top-24"
            >
              <nav className="space-y-2">
                <button
                  type="button"
                  onClick={() => scrollToSection("notifications")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeSection === "notifications"
                      ? "bg-purple-500/20 text-cyan-400"
                      : "text-gray-300 hover:bg-purple-500/20"
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("privacy")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeSection === "account-actions"
                      ? "bg-purple-500/20 text-cyan-400"
                      : "text-gray-300 hover:bg-purple-500/20"
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span>Privacy</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("language")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeSection === "language"
                      ? "bg-purple-500/20 text-cyan-400"
                      : "text-gray-300 hover:bg-purple-500/20"
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span>Language</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("appearance")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeSection === "appearance"
                      ? "bg-purple-500/20 text-cyan-400"
                      : "text-gray-300 hover:bg-purple-500/20"
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span>Appearance</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("security")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeSection === "account-actions"
                      ? "bg-purple-500/20 text-cyan-400"
                      : "text-gray-300 hover:bg-purple-500/20"
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  <span>Security</span>
                </button>
              </nav>
            </motion.div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notifications */}
            <motion.div
              id="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">Notification Preferences</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-purple-500/20">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Email Notifications</h4>
                    <p className="text-gray-400 text-sm">Receive email updates about new tools and features</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={() => handleToggle("emailNotifications")}
                  />
                </div>

                <div className="flex items-center justify-between py-4 border-b border-purple-500/20">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Push Notifications</h4>
                    <p className="text-gray-400 text-sm">Get push notifications for important updates</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={() => handleToggle("pushNotifications")}
                  />
                </div>

                <div className="flex items-center justify-between py-4 border-b border-purple-500/20">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Weekly Digest</h4>
                    <p className="text-gray-400 text-sm">Receive a weekly summary of trending tools</p>
                  </div>
                  <Switch
                    checked={settings.weeklyDigest}
                    onCheckedChange={() => handleToggle("weeklyDigest")}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-white font-semibold mb-1">New Tool Alerts</h4>
                    <p className="text-gray-400 text-sm">Get notified when new tools are added</p>
                  </div>
                  <Switch
                    checked={settings.newToolAlerts}
                    onCheckedChange={() => handleToggle("newToolAlerts")}
                  />
                </div>
              </div>
            </motion.div>

            {/* Appearance */}
            <motion.div
              id="appearance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Moon className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">Appearance</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-purple-500/20">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Dark Mode</h4>
                    <p className="text-gray-400 text-sm">Use dark theme for better viewing at night</p>
                  </div>
                  <Switch
                    checked={settings.darkMode}
                    onCheckedChange={() => handleToggle("darkMode")}
                  />
                </div>

                <div className="flex items-center justify-between py-4 border-b border-purple-500/20">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Compact View</h4>
                    <p className="text-gray-400 text-sm">Display more tools in a smaller space</p>
                  </div>
                  <Switch
                    checked={settings.compactView}
                    onCheckedChange={() => handleToggle("compactView")}
                  />
                </div>

                <div className="flex items-center justify-between py-4 border-b border-purple-500/20">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Autoplay Videos</h4>
                    <p className="text-gray-400 text-sm">Automatically play demo videos</p>
                  </div>
                  <Switch
                    checked={settings.autoplayVideos}
                    onCheckedChange={() => handleToggle("autoplayVideos")}
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Show Trending Badge</h4>
                    <p className="text-gray-400 text-sm">Display trending indicators on popular tools</p>
                  </div>
                  <Switch
                    checked={settings.showTrending}
                    onCheckedChange={() => handleToggle("showTrending")}
                  />
                </div>
              </div>
            </motion.div>

            {/* Language */}
            <motion.div
              id="language"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">Language & Region</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 mb-3 block">Display Language</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setLanguage("en");
                        setSettings((s) => ({ ...s, displayLanguage: "en" }));
                      }}
                      className={`p-4 rounded-lg border transition-all ${
                        language === "en"
                          ? "border-cyan-400 bg-cyan-500/20 text-cyan-400"
                          : "border-purple-500/30 bg-purple-900/20 text-gray-300 hover:border-cyan-400/50"
                      }`}
                    >
                      <div className="text-2xl mb-2">🇺🇸</div>
                      <div className="font-semibold">English</div>
                    </button>
                    <button
                      onClick={() => {
                        setLanguage("zh");
                        setSettings((s) => ({ ...s, displayLanguage: "zh" }));
                      }}
                      className={`p-4 rounded-lg border transition-all ${
                        language === "zh"
                          ? "border-cyan-400 bg-cyan-500/20 text-cyan-400"
                          : "border-purple-500/30 bg-purple-900/20 text-gray-300 hover:border-cyan-400/50"
                      }`}
                    >
                      <div className="text-2xl mb-2">🇨🇳</div>
                      <div className="font-semibold">中文</div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              id="privacy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">Privacy</h2>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-purple-500/20">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Profile searchable</h4>
                    <p className="text-gray-400 text-sm">Allow others to find your profile in search</p>
                  </div>
                  <Switch
                    checked={settings.profileSearchable}
                    onCheckedChange={() => handleToggle("profileSearchable")}
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Share anonymous usage data</h4>
                    <p className="text-gray-400 text-sm">Help us improve with anonymous analytics</p>
                  </div>
                  <Switch
                    checked={settings.shareUsageData}
                    onCheckedChange={() => handleToggle("shareUsageData")}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              id="security"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">Security</h2>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-purple-500/20">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Login alerts</h4>
                    <p className="text-gray-400 text-sm">Notify me on new device sign-ins</p>
                  </div>
                  <Switch
                    checked={settings.loginAlerts}
                    onCheckedChange={() => handleToggle("loginAlerts")}
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-white font-semibold mb-1">Require 2FA</h4>
                    <p className="text-gray-400 text-sm">Require two-factor authentication at login</p>
                  </div>
                  <Switch
                    checked={settings.twoFactorRequired}
                    onCheckedChange={() => handleToggle("twoFactorRequired")}
                  />
                </div>
              </div>
            </motion.div>

            {/* Account Actions */}
            <motion.div
              id="account-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Account Actions</h2>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
                >
                  <Mail className="w-5 h-5 mr-3" />
                  Change Email
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
                >
                  <Lock className="w-5 h-5 mr-3" />
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full justify-start border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full justify-center bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}