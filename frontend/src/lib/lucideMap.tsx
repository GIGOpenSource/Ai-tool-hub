import type { ComponentType, CSSProperties } from "react"; // 图标组件与样式类型
import * as Lucide from "lucide-react"; // 全量 lucide 命名空间，按名字动态取图标

type IconProps = { className?: string; style?: CSSProperties }; // 与常用 className/style 透传对齐

// 经 unknown 再断言：lucide 导出含 Icon 等非 FC 符号，与 Record<string, FC> 不完全重叠
const lucideByName = Lucide as unknown as Record<string, ComponentType<IconProps>>;

export function DynamicLucide({ name, ...props }: { name: string } & IconProps) {
  const Cmp = lucideByName[name] ?? Lucide.Sparkles; // 未知图标名回退 Sparkles
  return <Cmp {...props} />; // 渲染动态图标
}
