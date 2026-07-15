import { Link } from "react-router";
import { Heart, Search, Filter, Star, Trash2, Home, Sparkles, ExternalLink, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { SEO } from "../components/SEO";
import { toast } from "sonner";
import { motion } from "motion/react";

// Breadcrumbs component
function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500" />}
          {item.href ? (
            <Link to={item.href} className="text-cyan-400 hover:text-cyan-300 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-400">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

const mockFavorites = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "Advanced conversational AI for natural language understanding",
    icon: "🤖",
    rating: 4.8,
    pricing: "Freemium",
    category: "Copywriting",
    savedDate: "March 15, 2026",
  },
  {
    id: "midjourney",
    name: "Midjourney",
    description: "AI-powered art and image generation",
    icon: "🎨",
    rating: 4.9,
    pricing: "Paid",
    category: "Image Generation",
    savedDate: "March 10, 2026",
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    description: "AI pair programmer that helps you write code",
    icon: "💻",
    rating: 4.7,
    pricing: "Paid",
    category: "Code Assistant",
    savedDate: "March 5, 2026",
  },
  {
    id: "notion-ai",
    name: "Notion AI",
    description: "Enhance your workspace with AI-powered writing",
    icon: "📝",
    rating: 4.7,
    pricing: "Freemium",
    category: "Productivity",
    savedDate: "February 28, 2026",
  },
];

export function FavoritesPage() {
  const { t } = useLanguage();
  const [favorites, setFavorites] = useState(mockFavorites);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = ["all", "Copywriting", "Image Generation", "Code Assistant", "Productivity"];

  const filteredFavorites = favorites.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const removeFavorite = (id: string, name: string) => {
    setFavorites(favorites.filter((f) => f.id !== id));
    toast.success(`Removed ${name} from favorites`);
  };

  const breadcrumbs = [
    { label: t("nav.home"), href: "/" },
    { label: "My Favorites" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        title="My Favorites"
        description="View and manage your saved AI tools. Access your favorite tools anytime."
        keywords="favorites, saved AI tools, bookmarks"
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-pink-400 fill-pink-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">My Favorites</h1>
          </div>
          <p className="text-gray-400">
            You have {favorites.length} saved {favorites.length === 1 ? "tool" : "tools"}
          </p>
        </motion.div>

        {/* Search and Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-col md:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search favorites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1a0b2e]/50 border-purple-500/30 text-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <Button
                key={category}
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={`border-purple-500/30 whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-purple-500/20 text-cyan-400 border-cyan-400/50"
                    : "text-gray-300 hover:bg-purple-500/20"
                }`}
              >
                {category === "all" ? "All" : category}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Favorites Grid */}
        {filteredFavorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFavorites.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 hover:border-cyan-400/50 hover:bg-purple-900/30 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{tool.icon}</div>
                  <div className="flex-1">
                    <Link to={`/tool/${tool.id}`}>
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                        {tool.name}
                      </h3>
                    </Link>
                    <Badge variant="outline" className="border-purple-500/50 text-purple-300 text-xs">
                      {tool.category}
                    </Badge>
                  </div>
                  <button
                    onClick={() => removeFavorite(tool.id, tool.name)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-gray-400 mb-4 line-clamp-2">{tool.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-semibold">{tool.rating}</span>
                  </div>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                    {tool.pricing}
                  </Badge>
                </div>

                <div className="text-gray-500 text-xs mb-4">Saved on {tool.savedDate}</div>

                <Link to={`/tool/${tool.id}`}>
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white text-sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No favorites found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your filters"
                : "Start exploring and save your favorite AI tools"}
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                Discover AI Tools
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}