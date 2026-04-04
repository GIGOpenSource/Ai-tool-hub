import { Outlet } from "react-router";
import { usePageTracking } from "../hooks/usePageTracking";

/**
 * 布局壳：子路由渲染在 Outlet 内；此处挂载埋点 hook，保证每次路径变化都上报。
 */
export function TrackingLayout() {
  usePageTracking();
  return <Outlet />;
}
