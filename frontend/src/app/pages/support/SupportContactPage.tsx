import React from "react";
import { Navigation } from "../../components/Navigation";
import { SEO } from "../../components/SEO";
import { useLanguage } from "../../contexts/LanguageContext";

export function SupportContactPage() {
  const { language } = useLanguage();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO title="Contact Us" description="Get in touch with our team" htmlLang={language} />
      <Navigation />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-6">Contact Us</h1>
        <div className="space-y-3 text-gray-300">
          <p>Email: support@aitoolshub.example</p>
          <p>Business: business@aitoolshub.example</p>
          <p>We usually reply within 1-2 business days.</p>
        </div>
      </div>
    </div>
  );
}
