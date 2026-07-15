import { useState } from "react";
import { Link } from "react-router";
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

export function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,
    newToolAlerts: true,
    darkMode: true,
    compactView: false,
    autoplayVideos: false,
    showTrending: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
    toast.success("Setting updated");
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const breadcrumbs = [
    { label: t("nav.home"), href: "/" },
    { label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
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
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-purple-500/20 rounded-lg transition-colors bg-purple-500/20 text-cyan-400">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-purple-500/20 rounded-lg transition-colors">
                  <Lock className="w-5 h-5" />
                  <span>Privacy</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-purple-500/20 rounded-lg transition-colors">
                  <Globe className="w-5 h-5" />
                  <span>Language</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-purple-500/20 rounded-lg transition-colors">
                  <Moon className="w-5 h-5" />
                  <span>Appearance</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-purple-500/20 rounded-lg transition-colors">
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
                      onClick={() => setLanguage("en")}
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
                      onClick={() => setLanguage("zh")}
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

            {/* Account Actions */}
            <motion.div
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
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}