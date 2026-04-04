import { RouterProvider } from "react-router";
import { Suspense, useEffect } from "react";
import { router } from "./routes";
import { LanguageProvider } from "./contexts/LanguageContext";
import { PageSeoProvider } from "./contexts/PageSeoContext"; // 全站 URL→SEO 映射（公开 API）
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { initWebVitals } from "./utils/webVitals";

/** 懒加载页面的全屏占位，避免路由 chunk 下载时白屏 */
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 text-lg">Loading...</p>
      </div>
    </div>
  );
}

/** 根组件：错误边界 → 认证 → 多语言 → 路由 + 全局 Toast */
export default function App() {
  useEffect(() => {
    initWebVitals();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <PageSeoProvider>
            <div className="dark min-h-screen bg-[#0a0118]">
              <Suspense fallback={<LoadingFallback />}>
                <RouterProvider router={router} />
              </Suspense>
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: "bg-[#1a0b2e] border-purple-500/30 text-white",
                  title: "text-white",
                  description: "text-gray-400",
                },
              }}
            />
            </div>
          </PageSeoProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
