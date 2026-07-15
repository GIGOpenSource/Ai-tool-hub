import { RouterProvider } from "react-router";
import { Suspense, useEffect } from "react";
import { router } from "./routes";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { initWebVitals } from "./utils/webVitals";

// Loading fallback component
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

export default function App() {
  useEffect(() => {
    // Initialize Web Vitals monitoring
    initWebVitals();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
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
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}