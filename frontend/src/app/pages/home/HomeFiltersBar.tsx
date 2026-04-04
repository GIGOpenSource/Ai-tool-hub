import { Filter, SlidersHorizontal, Sparkles, TrendingUp, Zap } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useLanguage } from "../../contexts/LanguageContext";
import type { UiToasts } from "./types";

type Props = {
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  priceFilter: string;
  setPriceFilter: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  displayCount: number;
  uiToasts: UiToasts;
};

export function HomeFiltersBar({
  showFilters,
  setShowFilters,
  priceFilter,
  setPriceFilter,
  sortBy,
  setSortBy,
  displayCount,
  uiToasts,
}: Props) {
  const { t } = useLanguage();

  const onSort = (key: string, toastKey: string) => {
    setSortBy(key);
    const msg = uiToasts[toastKey] ?? "";
    if (msg) toast.success(msg);
  };

  return (
    <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 px-4 container mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`border-purple-500/30 ${showFilters ? "bg-purple-500/20 text-cyan-400" : "text-gray-300"} hover:bg-purple-500/20`}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          {t("home.filter")}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50 transition-all"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t("home.sort")}:{" "}
              <span className="font-semibold text-cyan-400 ml-1">
                {sortBy === "popular" ? t("home.sort.popular") : sortBy === "rating" ? t("home.sort.rating") : t("home.sort.newest")}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a0b2e] border-purple-500/30">
            <DropdownMenuItem className="cursor-pointer text-gray-300 hover:bg-purple-500/30" onSelect={() => onSort("popular", "sort_popular")}>
              <TrendingUp className="w-4 h-4 mr-2" />
              {t("home.sort.popular")}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-gray-300 hover:bg-purple-500/30" onSelect={() => onSort("rating", "sort_rating")}>
              <Sparkles className="w-4 h-4 mr-2" />
              {t("home.sort.rating")}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-gray-300 hover:bg-purple-500/30" onSelect={() => onSort("newest", "sort_newest")}>
              <Zap className="w-4 h-4 mr-2" />
              {t("home.sort.newest")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {showFilters && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPriceFilter("all")}
              className={`border-purple-500/30 ${priceFilter === "all" ? "bg-purple-500/20 text-cyan-400" : "text-gray-300"} hover:bg-purple-500/20`}
            >
              {t("home.all")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPriceFilter("free")}
              className={`border-purple-500/30 ${priceFilter === "free" ? "bg-purple-500/20 text-cyan-400" : "text-gray-300"} hover:bg-purple-500/20`}
            >
              {t("home.free")}
            </Button>
            <Button
              type="button"
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
        {displayCount}{" "}
        {displayCount === 1 ? uiToasts.tools_found_one ?? "tool found" : uiToasts.tools_found_many ?? "tools found"}
      </div>
    </div>
  );
}
