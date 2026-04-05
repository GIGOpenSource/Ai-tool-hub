import type { ComponentType, CSSProperties } from "react"; // 图标组件类型
import { // 仅打包站点 JSON / 种子实际用到的图标，避免 import * 拖入全量 lucide
  BarChart3,
  BookOpen,
  Code,
  FileCheck,
  FileText,
  Filter,
  Heart,
  HelpCircle,
  Home,
  Image,
  Layers,
  Mail,
  Map,
  MessageSquare,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  User,
  Video,
  Zap,
} from "lucide-react";

type IconProps = { className?: string; style?: CSSProperties }; // 与 DynamicLucide 透传一致

const MAP: Record<string, ComponentType<IconProps>> = { // 名称 → 组件（PascalCase 与种子 icon_key 一致）
  BarChart3,
  BookOpen,
  Code,
  FileCheck,
  FileText,
  Filter,
  Heart,
  HelpCircle,
  Home,
  Image,
  Layers,
  Mail,
  Map,
  MessageSquare,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Star,
  TrendingUp,
  Upload,
  User,
  Video,
  Zap,
};

export function DynamicLucide({ name, ...props }: { name: string } & IconProps) {
  const Cmp = MAP[name] ?? Sparkles; // 未知 icon_key 回退 Sparkles（与旧行为一致）
  return <Cmp {...props} />; // 渲染
}
