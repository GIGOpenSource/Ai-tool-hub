import { useEffect } from "react";

interface JsonLdProps {
  /** document 内 script 标签 id，避免同页多段 JSON-LD 冲突 */
  id: string;
  /** 将序列化为 application/ld+json 的对象（须可被 JSON.stringify） */
  data: Record<string, unknown>;
}

/**
 * 在 head 中注入 JSON-LD（结构化数据），供搜索引擎 rich result 使用。
 */
export function JsonLd({ id, data }: JsonLdProps) {
  const serialized = JSON.stringify(data); // 稳定依赖：避免因对象引用抖动重复执行 effect

  useEffect(() => {
    const scriptId = `jsonld-${id}`; // 与传入 id 组合，减少碰撞
    let el = document.getElementById(scriptId) as HTMLScriptElement | null; // 尝试复用已有节点
    if (!el) {
      el = document.createElement("script"); // 新建 script
      el.type = "application/ld+json"; // 启用 JSON-LD 类型
      el.id = scriptId; // 便于更新或卸载时选中
      document.head.appendChild(el); // 挂到 head
    }
    el.textContent = serialized; // 写入 JSON 文本
    return () => {
      el?.remove(); // 路由离开时移除，避免脏数据留在 head
    };
  }, [id, serialized]);

  return null; // 无 DOM 输出
}
