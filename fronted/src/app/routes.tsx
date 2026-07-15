import { createBrowserRouter } from "react-router";
import { lazy } from "react";

// Lazy load all pages for better performance
const HomePage = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const ToolDetailPage = lazy(() => import("./pages/ToolDetailPage").then(m => ({ default: m.ToolDetailPage })));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage").then(m => ({ default: m.ComparisonPage })));
const CompareToolsPage = lazy(() => import("./pages/CompareToolsPage").then(m => ({ default: m.CompareToolsPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage").then(m => ({ default: m.EditProfilePage })));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage").then(m => ({ default: m.FavoritesPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const SubmitToolPage = lazy(() => import("./pages/SubmitToolPage").then(m => ({ default: m.SubmitToolPage })));
const SitemapPage = lazy(() => import("./pages/SitemapPage").then(m => ({ default: m.SitemapPage })));
const GuidePage = lazy(() => import("./pages/GuidePage").then(m => ({ default: m.GuidePage })));
const MorePage = lazy(() => import("./pages/MorePage").then(m => ({ default: m.MorePage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    path: "/tool/:id",
    Component: ToolDetailPage,
  },
  {
    path: "/compare",
    Component: CompareToolsPage,
  },
  {
    path: "/compare/:toolName",
    Component: ComparisonPage,
  },
  {
    path: "/dashboard",
    Component: DashboardPage,
  },
  {
    path: "/profile",
    Component: ProfilePage,
  },
  {
    path: "/edit-profile",
    Component: EditProfilePage,
  },
  {
    path: "/favorites",
    Component: FavoritesPage,
  },
  {
    path: "/settings",
    Component: SettingsPage,
  },
  {
    path: "/submit",
    Component: SubmitToolPage,
  },
  {
    path: "/sitemap",
    Component: SitemapPage,
  },
  {
    path: "/guide",
    Component: GuidePage,
  },
  {
    path: "/more",
    Component: MorePage,
  },
  {
    path: "*",
    Component: NotFoundPage,
  },
]);