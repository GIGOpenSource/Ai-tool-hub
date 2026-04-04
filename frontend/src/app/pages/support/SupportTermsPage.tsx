import React from "react";
import { Navigation } from "../../components/Navigation";
import { SEO } from "../../components/SEO";
import { useLanguage } from "../../contexts/LanguageContext";

export function SupportTermsPage() {
  const { language } = useLanguage();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO title="Terms of Service" description="Our terms and conditions" htmlLang={language} />
      <Navigation />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-6">Terms of Service</h1>
        <div className="space-y-3 text-gray-300">
          <p>By using this website, you agree to our terms and community standards.</p>
          <p>Content that violates policy may be moderated or removed.</p>
          <p>We may update these terms over time and publish updates on this page.</p>
        </div>
      </div>
    </div>
  );
}
