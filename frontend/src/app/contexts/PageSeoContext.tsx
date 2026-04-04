import { createContext, useContext, useEffect, useState, type ReactNode } from "react"; // React 运行时与类型
import { apiGet } from "../../lib/api"; // 拉取公开站点块

/** 单页可选 SEO 字段（站点块内为字符串字典） */
export type PageSeoFields = Record<string, string>;

/** pathname（已归一）→ SEO 字段 */
export type PageSeoMap = Record<string, PageSeoFields>;

/** Context 值：全站 page_seo 映射与加载态 */
type Ctx = { map: PageSeoMap; ready: boolean };

const PageSeoContext = createContext<Ctx>({ map: {}, ready: false }); // 默认值避免裸奔

/** 与后端 normalize_page_path 一致：去掉 query、尾斜杠（根保留为 /） */
export function normalizeFrontendPath(path: string): string {
  const raw = (path || "/").split("?", 1)[0]?.split("#", 1)[0]?.trim() || "/"; // 去 query/hash
  const trimmed = raw.replace(/\/+$/, ""); // 去掉尾部 /
  return trimmed || "/"; // 空则根路径
}

/** Provider：挂载时拉取 /api/site/page_seo */
export function PageSeoProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<PageSeoMap>({}); // 路径→字段
  const [ready, setReady] = useState(false); // 首屏后可与安全回退合并

  useEffect(() => {
    let alive = true; // 卸载后不再 setState
    apiGet<PageSeoMap>("/api/site/page_seo") // 公开读
      .then((m) => {
        if (!alive) return; // 已卸载则忽略
        setMap(m && typeof m === "object" ? m : {}); // 非对象当空
      })
      .catch(() => {
        if (alive) setMap({}); // 404/网络失败则空映射
      })
      .finally(() => {
        if (alive) setReady(true); // 结束 loading
      });
    return () => {
      alive = false; // 清理：防止泄漏更新
    };
  }, []);

  return <PageSeoContext.Provider value={{ map, ready }}>{children}</PageSeoContext.Provider>; // 向下传递
}

/** 读取 page_seo 上下文 */
export function usePageSeoContext(): Ctx {
  return useContext(PageSeoContext); // 订阅
}
