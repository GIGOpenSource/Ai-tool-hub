/**
 * canonical、OG、页面 `<link rel="canonical">` 等用的**前台**公网站点根（无尾斜杠）。
 *
 * - **前台 SPA（Vite）**：生产构建在 `frontend/.env` / CI 注入 **`VITE_PUBLIC_SITE_URL`**（见 `frontend/.env.example`）。
 * - **后端 sitemap.xml / robots.txt**：使用环境变量 **`PUBLIC_SITE_URL`**（`backend/app/routers/growth/seo_public.py`）。
 *   上线两变量应指向**同一**生产域，避免 canonical 与站点地图 URL 不一致。
 *
 * 未配置 `VITE_PUBLIC_SITE_URL` 时：浏览器内退回 `window.location.origin`；无 `window` 时返回空串。
 */
export function getPublicSiteOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined; // Vite 暴露给前端的公开根
  if (raw && String(raw).trim()) {
    return String(raw).replace(/\/$/, ""); // 去掉末尾 /
  }
  if (typeof window !== "undefined") {
    return window.location.origin; // 浏览器内退回当前源
  }
  return ""; // SSR/预渲染未配置时留空，由调用方判断
}
