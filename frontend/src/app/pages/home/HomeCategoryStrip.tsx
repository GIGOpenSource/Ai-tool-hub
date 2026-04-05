import { Sparkles } from "lucide-react";
import { Link } from "react-router"; // 分类独立 URL（PRD 静态目录）
import { DynamicLucide } from "../../../lib/lucideMap";
import { useLanguage } from "../../contexts/LanguageContext";
import type { ApiCategory } from "./types";

type Props = {
  categories: ApiCategory[];
  selectedSlug: string;
  setSelectedSlug: (s: string) => void;
};

export function HomeCategoryStrip({ categories, selectedSlug, setSelectedSlug }: Props) {
  const { t } = useLanguage();
  return (
    <div className="mb-16 px-4 container mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6 text-center md:text-left">{t("home.categories")}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <button
          type="button"
          onClick={() => setSelectedSlug("all")}
          className={`flex flex-col items-center gap-3 p-4 bg-[#1a0b2e]/50 border rounded-xl transition-all ${
            selectedSlug === "all"
              ? "border-cyan-400 bg-cyan-500/20"
              : "border-purple-500/20 hover:border-cyan-400/50 hover:bg-purple-900/30"
          }`}
        >
          <Sparkles className={`w-8 h-8 ${selectedSlug === "all" ? "text-cyan-400" : "text-gray-400"}`} />
          <span className="text-sm text-gray-300 text-center">{t("home.all")}</span>
        </button>
        {categories.map((category) => (
          <Link
            key={category.slug}
            to={`/category/${encodeURIComponent(category.slug)}`}
            className={`flex flex-col items-center gap-3 p-4 bg-[#1a0b2e]/50 border rounded-xl transition-all group ${
              selectedSlug === category.slug
                ? "border-cyan-400 bg-cyan-500/20"
                : "border-purple-500/20 hover:border-cyan-400/50 hover:bg-purple-900/30"
            }`}
            onClick={() => setSelectedSlug(category.slug)}
          >
            <DynamicLucide
              name={category.icon_key}
              className={`w-8 h-8 ${
                selectedSlug === category.slug ? "text-cyan-400" : category.color_class
              } group-hover:scale-110 transition-transform`}
            />
            <span className="text-sm text-gray-300 text-center">{category.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
