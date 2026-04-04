/**
 * 前台 HTTP 客户端：开发环境默认与地址栏同源（相对 `/api` → Vite 代理）；生产用 `VITE_API_BASE`。
 * 需要登录态的请求自动附带 `Authorization: Bearer <access_token>`。
 */
/** 去掉尾斜杠，避免与 `/api/...` 拼成双斜杠 */
function trimApiRoot(s: string): string {
  return s.replace(/\/$/, ""); // 规范化 API 根
}

/**
 * 解析浏览器实际请求的 API 根前缀：开发忽略 `VITE_API_BASE`，避免写死 localhost 导致局域网访问失败。
 * 开发直连后端（不经代理）时在 .env 设 `VITE_DEV_API_BASE`（无尾斜杠）。
 */
export function getApiBase(): string {
  if (import.meta.env.DEV) {
    const dev = String(import.meta.env.VITE_DEV_API_BASE ?? "").trim(); // 开发可选直连后端根 URL
    return trimApiRoot(dev); // 未设则 ""，fetch 走当前源的 /api
  }
  return trimApiRoot(String(import.meta.env.VITE_API_BASE ?? "").trim()); // 生产由构建注入
}

/** 模块内复用的 API 根（与当前构建模式一致） */
const base = getApiBase(); // 载入时固定，与 import.meta.env 一致

/** localStorage 中存放服务端签发的 JWT 键名 */
const TOKEN_KEY = "access_token";

/** 读取当前登录 JWT，未登录返回 null */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 写入或清除 JWT（登出时传 null） */
export function setAccessToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 隐私模式等场景可能无法访问 localStorage */
  }
}

/** 构造可选的鉴权头 */
function authHeaders(): HeadersInit {
  const h: Record<string, string> = {};
  const t = getAccessToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/** GET JSON，401/404 等会抛错，由调用方 catch */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { ...authHeaders() },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`${path} ${res.status}`);
  }
  return res.json();
}

/** POST JSON，附带鉴权头（登录后提交工具等） */
export async function apiPost<T, B extends object>(path: string, body: B): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`${path} ${res.status}`);
  }
  return res.json();
}

/** POST 但不带 JWT（如匿名场景；当前埋点用独立 fetch） */
export async function apiPostAnonymous<T, B extends object>(
  path: string,
  body: B,
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`${path} ${res.status}`);
  }
  return res.json();
}

/** PUT JSON，登录态保存用户偏好等 */
export async function apiPut<T, B extends object>(path: string, body: B): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`${path} ${res.status}`);
  }
  return res.json();
}

/** DELETE，登录态取消收藏等；原样抛 HTTP 错误 */
export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${base}${path}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`${path} ${res.status}`);
  }
}
