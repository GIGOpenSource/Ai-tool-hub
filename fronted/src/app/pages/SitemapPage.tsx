import { Link } from "react-router";
import { Home, Search, Layers, BarChart3, User, Heart, Settings, Upload, Map, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "../components/Navigation";
import { motion } from "motion/react";

const pages = [
  {
    name: "Home",
    path: "/",
    icon: Home,
    description: "Browse and discover AI tools",
    category: "Main",
    color: "text-cyan-400",
  },
  {
    name: "Tool Details",
    path: "/tool/chatgpt",
    icon: Search,
    description: "Detailed information about AI tools",
    category: "Main",
    color: "text-purple-400",
  },
  {
    name: "Compare Tools",
    path: "/compare",
    icon: Layers,
    description: "Dynamic tool comparison - select any tools to compare",
    category: "Main",
    color: "text-pink-400",
  },
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: BarChart3,
    description: "Analytics and management dashboard",
    category: "Main",
    color: "text-green-400",
  },
  {
    name: "My Profile",
    path: "/profile",
    icon: User,
    description: "View and edit your profile",
    category: "User",
    color: "text-cyan-400",
    requiresAuth: true,
  },
  {
    name: "My Favorites",
    path: "/favorites",
    icon: Heart,
    description: "Your saved AI tools collection",
    category: "User",
    color: "text-pink-400",
    requiresAuth: true,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Account and preference settings",
    category: "User",
    color: "text-purple-400",
    requiresAuth: true,
  },
  {
    name: "Submit Tool",
    path: "/submit",
    icon: Upload,
    description: "Submit your AI tool to the platform",
    category: "Action",
    color: "text-yellow-400",
    requiresAuth: true,
  },
  {
    name: "User Guide",
    path: "/guide",
    icon: BookOpen,
    description: "Complete platform walkthrough",
    category: "Help",
    color: "text-blue-400",
  },
];

export function SitemapPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const categories = Array.from(new Set(pages.map((p) => p.category)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Map className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">Site Map</h1>
          </div>
          <p className="text-gray-400">Explore all pages and features available on AI Tools Hub</p>
        </motion.div>

        {categories.map((category, catIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: catIndex * 0.1 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-4">{category} Pages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages
                .filter((page) => page.category === category)
                .map((page, index) => {
                  const Icon = page.icon;
                  const isLocked = page.requiresAuth && !user;

                  return (
                    <Link
                      key={index}
                      to={isLocked ? "#" : page.path}
                      onClick={(e) => {
                        if (isLocked) {
                          e.preventDefault();
                        }
                      }}
                      className={`group ${isLocked ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div
                        className={`bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6 transition-all ${
                          isLocked
                            ? ""
                            : "hover:border-cyan-400/50 hover:bg-purple-900/30 hover:transform hover:scale-105"
                        }`}
                      >
                        <div className="flex items-start gap-4 mb-3">
                          <div
                            className={`p-3 rounded-lg bg-gradient-to-br ${
                              isLocked
                                ? "from-gray-500/20 to-gray-600/20"
                                : "from-purple-500/20 to-cyan-500/20"
                            }`}
                          >
                            <Icon className={`w-6 h-6 ${isLocked ? "text-gray-400" : page.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3
                                className={`text-lg font-bold ${
                                  isLocked
                                    ? "text-gray-400"
                                    : "text-white group-hover:text-cyan-400 transition-colors"
                                }`}
                              >
                                {page.name}
                              </h3>
                              {page.requiresAuth && (
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                  Login Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm">{page.description}</p>
                          </div>
                          {!isLocked && (
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </motion.div>
        ))}

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 mt-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <div className="text-3xl font-bold text-cyan-400 mb-1">{pages.length}</div>
              <div className="text-gray-400 text-sm">Total Pages</div>
            </div>
            <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {pages.filter((p) => p.category === "Main").length}
              </div>
              <div className="text-gray-400 text-sm">Main Pages</div>
            </div>
            <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <div className="text-3xl font-bold text-pink-400 mb-1">
                {pages.filter((p) => p.category === "User").length}
              </div>
              <div className="text-gray-400 text-sm">User Pages</div>
            </div>
            <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {pages.filter((p) => p.requiresAuth).length}
              </div>
              <div className="text-gray-400 text-sm">Protected</div>
            </div>
          </div>
        </motion.div>

        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-6 mt-8 text-center"
          >
            <h3 className="text-xl font-bold text-white mb-2">Unlock More Features</h3>
            <p className="text-gray-400 mb-4">
              Login to access your profile, favorites, settings, and submit tools
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                Go to Home & Login
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}