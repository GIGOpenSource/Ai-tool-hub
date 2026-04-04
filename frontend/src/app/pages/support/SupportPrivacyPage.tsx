import React from "react";
import { Navigation } from "../../components/Navigation";
import { SEO } from "../../components/SEO";
import { useLanguage } from "../../contexts/LanguageContext";

export function SupportPrivacyPage() {
  const { language } = useLanguage();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO title="Privacy Policy" description="How we protect your data" htmlLang={language} />
      <Navigation />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
        <div className="space-y-3 text-gray-300">
          <p>We collect minimal analytics and account data to operate the service.</p>
          <p>We do not sell personal information.</p>
          <p>You can request account data deletion by contacting support.</p>
        </div>
      </div>
    </div>
  );
}
