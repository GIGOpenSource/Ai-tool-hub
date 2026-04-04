"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LineChart,
  Wrench,
  Users,
  MessageSquare,
  DollarSign,
  Settings,
  Search,
  Code2,
  LayoutDashboard,
  Languages,
  GitCompare,
  ListOrdered,
  Braces,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";
import { useAdminStore } from "@/lib/store";
import { apiGET } from "@/lib/admin-api";

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  LineChart,
  Wrench,
  Users,
  MessageSquare,
  DollarSign,
  Settings,
  Search,
  Code2,
  LayoutDashboard,
  Languages,
  GitCompare,
  ListOrdered,
  Braces,
};

type MenuRow = {
  id: string;
  key: string;
  label: string;
  path: string;
  icon: string;
  permission: string;
  visible: boolean;
  order: number;
};

/** 与历史硬编码侧栏一致；库中 admin_menu_items 为空时用 */
const FALLBACK_NAV: MenuRow[] = [
  { id: "fb-dash", key: "sidebar.dashboard", label: "", path: "/admin/dashboard", icon: "BarChart3", permission: "", visible: true, order: 0 },
  { id: "fb-analytics", key: "sidebar.analytics", label: "", path: "/admin/analytics", icon: "LineChart", permission: "", visible: true, order: 1 },
  { id: "fb-tools", key: "sidebar.tools", label: "", path: "/admin/tools", icon: "Wrench", permission: "", visible: true, order: 2 },
  { id: "fb-users", key: "sidebar.users", label: "", path: "/admin/users", icon: "Users", permission: "", visible: true, order: 3 },
  { id: "fb-reviews", key: "sidebar.reviews", label: "", path: "/admin/reviews", icon: "MessageSquare", permission: "", visible: true, order: 4 },
  { id: "fb-money", key: "sidebar.monetization", label: "", path: "/admin/monetization", icon: "DollarSign", permission: "", visible: true, order: 5 },
  { id: "fb-seo", key: "sidebar.pageSeo", label: "", path: "/admin/page-seo", icon: "Search", permission: "", visible: true, order: 6 },
  { id: "fb-tool-jsonld", key: "sidebar.toolJsonLd", label: "", path: "/admin/tool-json-ld", icon: "Braces", permission: "", visible: true, order: 13 },
  { id: "fb-blocks", key: "sidebar.siteBlocks", label: "", path: "/admin/site-blocks", icon: "Code2", permission: "", visible: true, order: 7 },
  { id: "fb-search-sugg", key: "sidebar.searchSuggestions", label: "", path: "/admin/search-suggestions", icon: "ListOrdered", permission: "", visible: true, order: 8 },
  { id: "fb-home-seo", key: "sidebar.homeSeoForm", label: "", path: "/admin/home-seo", icon: "Search", permission: "", visible: true, order: 15 },
  { id: "fb-i18n", key: "sidebar.translations", label: "", path: "/admin/translations", icon: "Languages", permission: "", visible: true, order: 16 },
  { id: "fb-comp", key: "sidebar.comparisons", label: "", path: "/admin/comparisons", icon: "GitCompare", permission: "", visible: true, order: 17 },
  { id: "fb-settings", key: "sidebar.settings", label: "", path: "/admin/settings", icon: "Settings", permission: "", visible: true, order: 18 },
];

function normalizeMenu(arr: unknown): MenuRow[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((it, idx) => {
      const r = it as Record<string, unknown>;
      return {
        id: String(r.id ?? `nav-${idx}`),
        key: String(r.key ?? ""),
        label: String(r.label ?? ""),
        path: String(r.path ?? ""),
        icon: String(r.icon ?? "LayoutDashboard"),
        permission: String(r.permission ?? ""),
        visible: Boolean(r.visible ?? true),
        order: Number(r.order ?? idx),
      };
    })
    .filter((row) => row.visible && row.path.startsWith("/"))
    .sort((a, b) => a.order - b.order);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const token = useAdminStore((s) => s.token);

  const { data } = useQuery({
    queryKey: ["sidebar", "admin-settings", token],
    queryFn: () => apiGET<{ payload: Record<string, unknown> }>("/api/admin/settings", token!),
    enabled: !!token,
  });

  const rawAdmin = data?.payload?.admin_menu_items;
  const rawLegacy = data ? (data.payload as { menu_items?: unknown }).menu_items : undefined;
  const fromApi = normalizeMenu(
    Array.isArray(rawAdmin) && rawAdmin.length > 0 ? rawAdmin : rawLegacy
  );
  const items = fromApi.length > 0 ? fromApi : FALLBACK_NAV;

  const navLabel = (row: MenuRow) => (row.key.startsWith("sidebar.") ? t(row.key) : row.label || row.key);

  return (
    <aside className="w-56 shrink-0 border-r border-purple-500/20 bg-[#120822]/95 backdrop-blur">
      <div className="p-4 border-b border-purple-500/15">
        <p className="text-xs uppercase tracking-wider text-cyan-400/90">{t("sidebar.brandAdmin")}</p>
        <p className="font-semibold text-white truncate">{t("sidebar.brandTitle")}</p>
      </div>
      <nav className="p-2 space-y-0.5">
        {items.map((row) => {
          const Icon = ICON_MAP[row.icon] ?? LayoutDashboard;
          const active = pathname === row.path || pathname.startsWith(`${row.path}/`);
          return (
            <Link
              key={row.id}
              href={row.path}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-purple-500/25 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
            >
              <Icon className="w-4 h-4 shrink-0 opacity-80" />
              {navLabel(row)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
