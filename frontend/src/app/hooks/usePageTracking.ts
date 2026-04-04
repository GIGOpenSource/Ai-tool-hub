import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { getAccessToken, getApiBase } from "../../lib/api";

const base = getApiBase(); // 与前台 api 一致：开发同源 /api，生产 VITE_API_BASE

/**
 * 路由变化时上报 PV，可选带上 JWT 以便后端记 UID。
 * 上一页路径 + 停留秒数用于回填 page_view_log.dwell_seconds；Cookie track_sid 由后端 Set-Cookie。
 */
export function usePageTracking() {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);
  const enteredAtRef = useRef<number>(Date.now());

  useEffect(() => {
    // 由 TrackingLayout 统一挂载；pathname + search 变化即视为进入新页面并发 PV
    const now = Date.now();
    const path = `${location.pathname}${location.search || ""}`;
    const prev = prevPathRef.current;
    const dwellSeconds = prev != null ? Math.max(0, (now - enteredAtRef.current) / 1000) : undefined;

    enteredAtRef.current = now;
    prevPathRef.current = path;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const t = getAccessToken();
    if (t) headers.Authorization = `Bearer ${t}`;

    const body = JSON.stringify({
      page_path: path,
      previous_path: prev ?? undefined,
      dwell_seconds: dwellSeconds,
    });

    fetch(`${base}/api/track`, {
      method: "POST",
      headers,
      body,
      credentials: "include",
      keepalive: true,
    }).catch(() => {}); // 埋点失败静默，避免打断浏览
  }, [location.pathname, location.search]); // 与 routes.tsx 中 URL 维度一致
}
