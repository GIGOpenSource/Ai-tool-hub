import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";
import type { ApiCategory, ApiTool, HomeSeo, UiToasts } from "./types";

/**
 * 首页数据：并行请求工具列表、分类、搜索联想词、SEO 与 Toast 配置。
 * language 变化时整批重新拉取（与列表/分类的多语言一致）。
 */
export function useHomeData(language: string) {
  const [tools, setTools] = useState<ApiTool[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [homeSeo, setHomeSeo] = useState<HomeSeo | null>(null);
  const [uiToasts, setUiToasts] = useState<UiToasts>({});
  const [error, setError] = useState<string | null>(null);
  const [retryEpoch, setRetryEpoch] = useState(0); // 递增以在不改 language 时强制重拉

  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all([
      apiGet<ApiTool[]>(`/api/tools?locale=${encodeURIComponent(language)}`),
      apiGet<ApiCategory[]>(`/api/categories?locale=${encodeURIComponent(language)}`),
      apiGet<string[]>("/api/search-suggestions"),
      apiGet<HomeSeo>("/api/site/home_seo"),
      apiGet<UiToasts>("/api/site/ui_toasts"),
    ])
      .then(([t, c, s, seo, toast]) => {
        if (!active) return;
        setTools( // 写入工具列表，并规范 recommend_score 供「热门」排序
          (t ?? []) // 空响应时回退为空数组，避免对 null/undefined 调用 map
            .map((x) => ({
              ...x, // 保留接口返回的其余工具字段
              recommend_score: typeof x.recommend_score === "number" ? x.recommend_score : 0, // 非数字时按 0（旧缓存兼容）
            })),
        );
        setCategories(c);
        setSuggestions(s);
        setHomeSeo(seo);
        setUiToasts(toast);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [language, retryEpoch]);

  const retryLoad = () => setRetryEpoch((n) => n + 1); // 供错误页「重试」复用同一套请求

  return { tools, categories, suggestions, homeSeo, uiToasts, error, retryLoad };
}
