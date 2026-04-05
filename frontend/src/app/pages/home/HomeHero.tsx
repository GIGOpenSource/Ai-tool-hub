import { Search } from "lucide-react";
import { motion } from "motion/react";
import { Input } from "../../components/ui/input";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  filteredSuggestions: string[];
  /** 若提供：回车与点选联想词时跳转 /s/…，用于可分享搜索 URL */
  onSearchNavigate?: (query: string) => void;
};

export function HomeHero({
  searchQuery,
  setSearchQuery,
  showSuggestions,
  setShowSuggestions,
  filteredSuggestions,
  onSearchNavigate,
}: Props) {
  const { t } = useLanguage();
  return (
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && onSearchNavigate) {
                  const q = searchQuery.trim(); // 去空白
                  if (!q) return; // 空不跳转
                  e.preventDefault(); // 避免表单默认提交
                  onSearchNavigate(q); // 进搜索落地页
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-12 pr-4 py-6 bg-[#1a0b2e]/50 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-cyan-400/50 rounded-2xl"
            />
          </div>

          {showSuggestions && filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute w-full mt-2 bg-[#1a0b2e] border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden z-10"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left px-4 py-3 text-gray-300 hover:bg-purple-900/30 hover:text-cyan-400 transition-colors flex items-center gap-2"
                  onClick={() => {
                    if (onSearchNavigate) {
                      onSearchNavigate(suggestion); // 直达 /s/ 可分享
                    } else {
                      setSearchQuery(suggestion); // 首页内过滤
                    }
                    setShowSuggestions(false); // 收起下拉
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
    </section>
  );
}
