import React from "react";
import { Navigation } from "../../components/Navigation";
import { SEO } from "../../components/SEO";
import { useLanguage } from "../../contexts/LanguageContext";

export function SupportFaqPage() {
  const { language } = useLanguage();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO title="FAQ" description="Frequently asked questions" htmlLang={language} />
      <Navigation />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-6">FAQ</h1>
        <div className="space-y-4 text-gray-300">
          <p className="font-semibold text-white">How do I submit a tool?</p>
          <p>Go to Submit Tool page, fill required fields, and wait for moderation.</p>
          <p className="font-semibold text-white">How are ratings calculated?</p>
          <p>Ratings are aggregated from visible published reviews.</p>
          <p className="font-semibold text-white">Can I edit my profile?</p>
          <p>Yes, open Profile and then Edit Profile to update your details.</p>
        </div>
      </div>
    </div>
  );
}
