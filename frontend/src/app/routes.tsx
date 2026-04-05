import { createBrowserRouter } from "react-router";
import { lazy } from "react";
import { TrackingLayout } from "./components/TrackingLayout";

/** 按页代码分割，减小首包；default export 与页面组件导出一致 */
const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const ToolDetailPage = lazy(() => import("./pages/ToolDetailPage").then((m) => ({ default: m.ToolDetailPage })));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage").then((m) => ({ default: m.ComparisonPage })));
const CompareToolsPage = lazy(() => import("./pages/CompareToolsPage").then((m) => ({ default: m.CompareToolsPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage").then((m) => ({ default: m.OrderDetailPage })));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage").then((m) => ({ default: m.EditProfilePage })));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const SubmitToolPage = lazy(() => import("./pages/SubmitToolPage").then((m) => ({ default: m.SubmitToolPage })));
const SitemapPage = lazy(() => import("./pages/SitemapPage").then((m) => ({ default: m.SitemapPage })));
const GuidePage = lazy(() => import("./pages/GuidePage").then((m) => ({ default: m.GuidePage })));
const MorePage = lazy(() => import("./pages/MorePage").then((m) => ({ default: m.MorePage })));
const SupportFaqPage = lazy(() => import("./pages/support/SupportFaqPage").then((m) => ({ default: m.SupportFaqPage })));
const SupportContactPage = lazy(() => import("./pages/support/SupportContactPage").then((m) => ({ default: m.SupportContactPage })));
const SupportPrivacyPage = lazy(() => import("./pages/support/SupportPrivacyPage").then((m) => ({ default: m.SupportPrivacyPage })));
const SupportTermsPage = lazy(() => import("./pages/support/SupportTermsPage").then((m) => ({ default: m.SupportTermsPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const CategoryBrowsePage = lazy(() =>
  import("./pages/CategoryBrowsePage").then((m) => ({ default: m.CategoryBrowsePage })),
);
const SearchResultsPage = lazy(() =>
  import("./pages/SearchResultsPage").then((m) => ({ default: m.SearchResultsPage })),
);

/**
 * 全局路由表。TrackingLayout 包裹子路由以在路由变化时上报 /api/track。
 * /tool/:id 的 id 实为后端工具 slug；/category/:slug、/s/:keyword 为 PRD 分类与搜索落地页。
 */
export const router = createBrowserRouter([
  {
    Component: TrackingLayout,
    children: [
      { path: "/", Component: HomePage },
      { path: "/category/:slug", Component: CategoryBrowsePage },
      { path: "/s/:keyword", Component: SearchResultsPage },
      { path: "/tool/:id", Component: ToolDetailPage },
      { path: "/compare", Component: CompareToolsPage },
      { path: "/compare/:toolName", Component: ComparisonPage },
      { path: "/dashboard", Component: DashboardPage },
      { path: "/profile", Component: ProfilePage },
      { path: "/orders/:orderId", Component: OrderDetailPage },
      { path: "/edit-profile", Component: EditProfilePage },
      { path: "/favorites", Component: FavoritesPage },
      { path: "/settings", Component: SettingsPage },
      { path: "/submit", Component: SubmitToolPage },
      { path: "/sitemap", Component: SitemapPage },
      { path: "/guide", Component: GuidePage },
      { path: "/more", Component: MorePage },
      { path: "/support/faq", Component: SupportFaqPage },
      { path: "/support/contact", Component: SupportContactPage },
      { path: "/support/privacy", Component: SupportPrivacyPage },
      { path: "/support/terms", Component: SupportTermsPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
