import { Link } from "react-router";
import { Heart, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useLanguage } from "../../contexts/LanguageContext";
import type { ApiTool } from "./types";

type Props = {
  tools: ApiTool[];
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  handleShare: (name: string) => void;
  emptyMessage: string;
  clearFiltersLabel: string;
  onClearFilters: () => void;
  /** 覆盖默认「精选」标题（分类页/搜索页用） */
  gridHeading?: string;
  /** 覆盖默认「热门」角标文案 */
  gridBadge?: string;
};

export function HomeToolGrid({
  tools,
  favorites,
  toggleFavorite,
  handleShare,
  emptyMessage,
  clearFiltersLabel,
  onClearFilters,
  gridHeading,
  gridBadge,
}: Props) {
  const { t } = useLanguage();
  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{gridHeading ?? t("home.featured")}</h2>
        <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0">{gridBadge ?? t("home.trending")}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, index) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
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
                  type="button"
                  onClick={() => toggleFavorite(tool.id)}
                  className="text-gray-400 hover:text-pink-400 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${favorites.has(tool.id) ? "fill-pink-400 text-pink-400" : ""}`} />
                </button>
              </div>

              <p className="text-gray-400 mb-4 line-clamp-2">{tool.description}</p>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="text-white font-semibold">{tool.rating}</span>
                  <span className="text-gray-500 text-sm ml-1">({tool.review_count})</span>
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
                  type="button"
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

      {tools.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">{emptyMessage}</p>
          <Button
            type="button"
            onClick={onClearFilters}
            className="mt-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
          >
            {clearFiltersLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
