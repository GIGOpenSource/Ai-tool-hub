import { Link } from "react-router";
import { BookOpen, Map, FileText, User, Settings, Heart, Send, HelpCircle, Mail, Shield, FileCheck } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { motion } from "motion/react";

const moreLinks = [
  {
    id: "profile",
    icon: User,
    titleKey: "nav.profile",
    description: "Manage your account and preferences",
    href: "/profile",
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "favorites",
    icon: Heart,
    titleKey: "nav.favorites",
    description: "View your saved AI tools collection",
    href: "/favorites",
    color: "from-pink-400 to-red-500",
  },
  {
    id: "settings",
    icon: Settings,
    titleKey: "nav.settings",
    description: "Customize your experience",
    href: "/settings",
    color: "from-purple-400 to-indigo-500",
  },
  {
    id: "submit",
    icon: Send,
    titleKey: "nav.submit",
    description: "Submit your AI tool to the directory",
    href: "/submit",
    color: "from-green-400 to-teal-500",
  },
  {
    id: "guide",
    icon: BookOpen,
    titleKey: "nav.guide",
    description: "Learn how to use the platform",
    href: "/guide",
    color: "from-orange-400 to-yellow-500",
  },
  {
    id: "sitemap",
    icon: Map,
    titleKey: "nav.sitemap",
    description: "Explore all pages and sections",
    href: "/sitemap",
    color: "from-indigo-400 to-purple-500",
  },
];

const resourceLinks = [
  {
    icon: HelpCircle,
    title: "FAQ",
    description: "Frequently asked questions",
    href: "#faq",
  },
  {
    icon: Mail,
    title: "Contact Us",
    description: "Get in touch with our team",
    href: "#contact",
  },
  {
    icon: Shield,
    title: "Privacy Policy",
    description: "How we protect your data",
    href: "#privacy",
  },
  {
    icon: FileCheck,
    title: "Terms of Service",
    description: "Our terms and conditions",
    href: "#terms",
  },
];

export function MorePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t("nav.more")}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Explore all features, settings, and resources available on the platform
          </p>
        </motion.div>

        {/* Main Links Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moreLinks.map((link, index) => (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={link.href}>
                  <div className="group bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 hover:border-cyan-400/50 hover:bg-purple-900/30 transition-all cursor-pointer">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${link.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <link.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                      {t(link.titleKey)}
                    </h3>
                    <p className="text-gray-400 text-sm">{link.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Resources Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Resources & Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resourceLinks.map((link, index) => (
              <motion.div
                key={link.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <a href={link.href}>
                  <div className="group bg-[#1a0b2e]/30 border border-purple-500/10 rounded-xl p-4 hover:border-purple-400/30 hover:bg-purple-900/20 transition-all cursor-pointer flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                      <link.icon className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-gray-500 text-sm">{link.description}</p>
                    </div>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/20 rounded-2xl p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-cyan-400 mb-1">500+</div>
              <div className="text-gray-400 text-sm">AI Tools</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400 mb-1">50K+</div>
              <div className="text-gray-400 text-sm">Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-pink-400 mb-1">10K+</div>
              <div className="text-gray-400 text-sm">Reviews</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400 mb-1">24/7</div>
              <div className="text-gray-400 text-sm">Support</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
