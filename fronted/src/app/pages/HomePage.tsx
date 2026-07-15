import { Link } from "react-router";
import { Search, Sparkles, Video, FileText, Image, Code, Zap, TrendingUp, Filter, Heart, Share2, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { SEO } from "../components/SEO";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { motion } from "motion/react";

const categories = [
  { name: "Video Editing", key: "cat.videoEditing", icon: Video, color: "text-cyan-400" },
  { name: "Copywriting", key: "cat.copywriting", icon: FileText, color: "text-purple-400" },
  { name: "Image Generation", key: "cat.imageGeneration", icon: Image, color: "text-pink-400" },
  { name: "Code Assistant", key: "cat.codeAssistant", icon: Code, color: "text-green-400" },
  { name: "Productivity", key: "cat.productivity", icon: Zap, color: "text-yellow-400" },
  { name: "Analytics", key: "cat.analytics", icon: TrendingUp, color: "text-blue-400" },
];

const allTools = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "Advanced conversational AI for natural language understanding and generation",
    icon: "🤖",
    rating: 4.8,
    pricing: "Freemium",
    category: "Copywriting",
    reviewCount: 1234,
    popularity: 95,
  },
  {
    id: "midjourney",
    name: "Midjourney",
    description: "AI-powered art and image generation with stunning visual quality",
    icon: "🎨",
    rating: 4.9,
    pricing: "Paid",
    category: "Image Generation",
    reviewCount: 2100,
    popularity: 92,
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    description: "AI pair programmer that helps you write code faster and smarter",
    icon: "💻",
    rating: 4.7,
    pricing: "Paid",
    category: "Code Assistant",
    reviewCount: 1567,
    popularity: 88,
  },
  {
    id: "runway",
    name: "Runway",
    description: "AI-powered video editing and generation tools for creators",
    icon: "🎬",
    rating: 4.6,
    pricing: "Freemium",
    category: "Video Editing",
    reviewCount: 890,
    popularity: 85,
  },
  {
    id: "jasper",
    name: "Jasper AI",
    description: "AI content platform for enterprise marketing teams",
    icon: "✍️",
    rating: 4.5,
    pricing: "Paid",
    category: "Copywriting",
    reviewCount: 1123,
    popularity: 80,
  },
  {
    id: "notion-ai",
    name: "Notion AI",
    description: "Enhance your workspace with AI-powered writing and organization",
    icon: "📝",
    rating: 4.7,
    pricing: "Freemium",
    category: "Productivity",
    reviewCount: 1890,
    popularity: 87,
  },
  {
    id: "claude",
    name: "Claude",
    description: "AI assistant focused on being helpful, harmless, and honest",
    icon: "🧠",
    rating: 4.7,
    pricing: "Freemium",
    category: "Copywriting",
    reviewCount: 987,
    popularity: 90,
  },
  {
    id: "stable-diffusion",
    name: "Stable Diffusion",
    description: "Open-source text-to-image AI model with incredible flexibility",
    icon: "🌈",
    rating: 4.6,
    pricing: "Free",
    category: "Image Generation",
    reviewCount: 2340,
    popularity: 86,
  },
];

const searchSuggestions = [
  "AI image generator",
  "ChatGPT alternatives",
  "Video editing AI",
  "AI coding assistant",
  "Free AI tools",
];

export function HomePage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const filteredSuggestions = searchQuery
    ? searchSuggestions.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : searchSuggestions;

  // Filter and sort tools
  let displayTools = allTools.filter((tool) => {
    // Search filter
    if (searchQuery && !tool.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !tool.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Category filter
    if (selectedCategory !== "all" && tool.category !== selectedCategory) {
      return false;
    }
    // Price filter
    if (priceFilter === "free" && tool.pricing !== "Free") {
      return false;
    }
    if (priceFilter === "paid" && tool.pricing === "Free") {
      return false;
    }
    return true;
  });

  // Sort tools
  displayTools = [...displayTools].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating;
      case "popular":
        return b.popularity - a.popularity;
      case "newest":
        return 0; // Mock: would use date
      default:
        return 0;
    }
  });

  const toggleFavorite = (toolId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(toolId)) {
      newFavorites.delete(toolId);
      toast.info("Removed from favorites");
    } else {
      newFavorites.add(toolId);
      toast.success(t("notif.addedToFavorites"));
    }
    setFavorites(newFavorites);
  };

  const handleShare = (toolName: string) => {
    if (navigator.share) {
      navigator.share({
        title: toolName,
        text: `Check out ${toolName} on AI Tools Hub`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        title={t("home.title")}
        description={t("home.subtitle")}
        keywords="AI tools, artificial intelligence, ChatGPT, Midjourney, AI directory, copywriting AI, video editing AI, code assistant, image generation"
      />
      <Navigation />

      {/* Hero Section with Search */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            {t("home.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-gray-400 mb-8"
          >
            {t("home.subtitle")}
          </motion.p>

          {/* Search Bar with Auto-Suggest */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative max-w-2xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t("home.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-12 pr-4 py-6 bg-[#1a0b2e]/50 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-cyan-400/50 rounded-2xl"
              />
            </div>

            {/* Auto-Suggestions */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute w-full mt-2 bg-[#1a0b2e] border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden z-10"
              >
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-3 text-gray-300 hover:bg-purple-900/30 hover:text-cyan-400 transition-colors flex items-center gap-2"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    <Search className="w-4 h-4" />
                    {suggestion}
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Filter and Sort Bar */}
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-purple-500/30 ${showFilters ? 'bg-purple-500/20 text-cyan-400' : 'text-gray-300'} hover:bg-purple-500/20`}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {t("home.filter")}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50 transition-all"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {t("home.sort")}: <span className="font-semibold text-cyan-400 ml-1">
                    {sortBy === "popular" ? t("home.sort.popular") : sortBy === "rating" ? t("home.sort.rating") : t("home.sort.newest")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a0b2e] border-purple-500/30">
                <DropdownMenuItem
                  onSelect={() => {
                    setSortBy("popular");
                    toast.success("Sorted by Most Popular");
                  }}
                  className={`cursor-pointer ${sortBy === "popular" ? "bg-purple-500/20 text-cyan-400" : "text-gray-300"} hover:bg-purple-500/30 hover:text-cyan-400 transition-all`}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {t("home.sort.popular")}
                  {sortBy === "popular" && <span className="ml-auto text-cyan-400">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setSortBy("rating");
                    toast.success("Sorted by Highest Rating");
                  }}
                  className={`cursor-pointer ${sortBy === "rating" ? "bg-purple-500/20 text-cyan-400" : "text-gray-300"} hover:bg-purple-500/30 hover:text-cyan-400 transition-all`}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("home.sort.rating")}
                  {sortBy === "rating" && <span className="ml-auto text-cyan-400">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setSortBy("newest");
                    toast.success("Sorted by Newest");
                  }}
                  className={`cursor-pointer ${sortBy === "newest" ? "bg-purple-500/20 text-cyan-400" : "text-gray-300"} hover:bg-purple-500/30 hover:text-cyan-400 transition-all`}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {t("home.sort.newest")}
                  {sortBy === "newest" && <span className="ml-auto text-cyan-400">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-2"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPriceFilter("all")}
                  className={`border-purple-500/30 ${priceFilter === "all" ? "bg-purple-500/20 text-cyan-400" : "text-gray-300"} hover:bg-purple-500/20`}
                >
                  {t("home.all")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPriceFilter("free")}
                  className={`border-purple-500/30 ${priceFilter === "free" ? "bg-purple-500/20 text-cyan-400" : "text-gray-300"} hover:bg-purple-500/20`}
                >
                  {t("home.free")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPriceFilter("paid")}
                  className={`border-purple-500/30 ${priceFilter === "paid" ? "bg-purple-500/20 text-cyan-400" : "text-gray-300"} hover:bg-purple-500/20`}
                >
                  {t("home.paid")}
                </Button>
              </motion.div>
            )}
          </div>

          <div className="text-gray-400 text-sm">
            {displayTools.length} {displayTools.length === 1 ? "tool" : "tools"} found
          </div>
        </div>

        {/* Categories */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 text-center md:text-left">{t("home.categories")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex flex-col items-center gap-3 p-4 bg-[#1a0b2e]/50 border rounded-xl transition-all ${
                selectedCategory === "all"
                  ? "border-cyan-400 bg-cyan-500/20"
                  : "border-purple-500/20 hover:border-cyan-400/50 hover:bg-purple-900/30"
              }`}
            >
              <Sparkles className={`w-8 h-8 ${selectedCategory === "all" ? "text-cyan-400" : "text-gray-400"}`} />
              <span className="text-sm text-gray-300 text-center">{t("home.all")}</span>
            </button>
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`flex flex-col items-center gap-3 p-4 bg-[#1a0b2e]/50 border rounded-xl transition-all group ${
                    selectedCategory === category.name
                      ? "border-cyan-400 bg-cyan-500/20"
                      : "border-purple-500/20 hover:border-cyan-400/50 hover:bg-purple-900/30"
                  }`}
                >
                  <Icon
                    className={`w-8 h-8 ${
                      selectedCategory === category.name ? "text-cyan-400" : category.color
                    } group-hover:scale-110 transition-transform`}
                  />
                  <span className="text-sm text-gray-300 text-center">{t(category.key)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Featured Tools Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">{t("home.featured")}</h2>
            <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0">
              {t("home.trending")}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTools.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="group bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 hover:border-cyan-400/50 hover:bg-purple-900/30 transition-all hover:transform hover:scale-105">
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
                      onClick={() => toggleFavorite(tool.id)}
                      className="text-gray-400 hover:text-pink-400 transition-colors"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          favorites.has(tool.id) ? "fill-pink-400 text-pink-400" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-gray-400 mb-4 line-clamp-2">{tool.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="text-white font-semibold">{tool.rating}</span>
                      <span className="text-gray-500 text-sm ml-1">({tool.reviewCount})</span>
                    </div>
                    <Badge
                      className={`${
                        tool.pricing === "Free"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : tool.pricing === "Freemium"
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                          : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                      }`}
                    >
                      {tool.pricing}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/tool/${tool.id}`} className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white text-sm">
                        {t("tool.visitWebsite")}
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleShare(tool.name)}
                      className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {displayTools.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No tools found matching your filters.</p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setPriceFilter("all");
                }}
                className="mt-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-900/20 bg-[#0a0118]/80 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-500">
            <p>{t("footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}