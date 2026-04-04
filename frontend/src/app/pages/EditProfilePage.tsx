import React, { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Navigation } from "../components/Navigation";
import { SEO } from "../components/SEO";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { Save, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { getPublicSiteOrigin } from "../../lib/siteUrl";
import { useResolvedPageSeo } from "../hooks/useResolvedPageSeo";
import { apiPut } from "../../lib/api";

export function EditProfilePage() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("👤");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const seoMerged = useResolvedPageSeo("/edit-profile", {
    title: `${t("dashboard.edit")} · ${t("nav.profile")}`,
    description: `${t("profileEdit.subtitle")} · AI Tools Hub`,
    keywords: "edit profile,account,AI Tools Hub",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      toast.info(t("profileEdit.needLogin"));
      navigate("/profile", { replace: true });
    }
  }, [isAuthenticated, navigate, t]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshUser();
  }, [isAuthenticated, refreshUser]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.name);
    setEmail(user.email);
    setAvatarEmoji(user.avatar || "👤");
    setBio(user.bio ?? "");
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      await apiPut<
        { id: string; email: string; name: string; avatar: string; bio: string; role: string },
        { display_name: string; avatar_emoji: string; bio: string }
      >("/api/me/profile", {
        display_name: displayName.trim(),
        avatar_emoji: (avatarEmoji.trim() || "👤").slice(0, 32),
        bio: bio.trim(),
      });
      await refreshUser();
      toast.success(t("profileEdit.toastSaved"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = async () => {
    await refreshUser();
    toast.info(t("profileEdit.toastDiscarded"));
  };

  const origin = getPublicSiteOrigin();
  const editProfileUrl = origin ? `${origin}/edit-profile` : "";

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={t("profileEdit.title")} description={t("profileEdit.needLogin")} htmlLang={language} />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        {...seoMerged}
        ogUrl={seoMerged.ogUrl || editProfileUrl || undefined}
        canonical={seoMerged.canonical || editProfileUrl || undefined}
        htmlLang={language}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="mb-8">
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("nav.profile")}
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t("profileEdit.title")}</h1>
            <p className="text-gray-400">{t("profileEdit.subtitle")}</p>
          </div>

          <div className="bg-[#1a0b2e]/50 border border-purple-500/30 rounded-2xl p-6 md:p-8">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full border-4 border-purple-500/30 flex items-center justify-center text-6xl bg-[#0a0118]">
                  <span className="leading-none">{avatarEmoji || "👤"}</span>
                </div>
                <label className="text-sm text-gray-400 mt-6 w-full max-w-md">
                  {t("profileEdit.avatarLabel")}
                  <Input
                    type="text"
                    value={avatarEmoji}
                    onChange={(e) => setAvatarEmoji(e.target.value)}
                    maxLength={32}
                    className="mt-1 bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2 w-full max-w-md">{t("profileEdit.avatarHint")}</p>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  {t("profileEdit.displayName")} <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">{t("profileEdit.emailReadonly")}</label>
                <Input
                  type="email"
                  value={email}
                  readOnly
                  className="bg-[#0a0118]/70 border-purple-500/20 text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">{t("profileEdit.bio")}</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("profileEdit.bioPlaceholder")}
                  rows={4}
                  className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("profileEdit.saving")}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {t("profileEdit.save")}
                    </div>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDiscard()}
                  className="flex-1 border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("profileEdit.discard")}
                </Button>
              </div>
            </form>
          </div>

          <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <p className="text-sm text-gray-400">{t("profileEdit.note")}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
