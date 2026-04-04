import type { CSSProperties } from "react";
import * as Lucide from "lucide-react";

type IconProps = { className?: string; style?: CSSProperties };

export function DynamicLucide({ name, ...props }: { name: string } & IconProps) {
  const Cmp = (Lucide as Record<string, React.ComponentType<IconProps>>)[name] ?? Lucide.Sparkles;
  return <Cmp {...props} />;
}
