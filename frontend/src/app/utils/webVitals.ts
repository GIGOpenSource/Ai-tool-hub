// Web Vitals Performance Monitoring
// Tracks Core Web Vitals: LCP, FID, CLS, FCP, TTFB

interface Metric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

// Chrome 等提供的非标准 performance.memory（标准 Performance 类型未声明）
interface PerformanceWithOptionalMemory extends Performance {
  memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
}

// Thresholds for Core Web Vitals (in milliseconds)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint
  FID: { good: 100, poor: 300 },        // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint
  TTFB: { good: 800, poor: 1800 },      // Time to First Byte
};

function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  
  if (!threshold) return "good";
  
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

function logMetric(metric: Metric) {
  const { name, value, rating } = metric;
  
  // Color code based on rating
  const colors = {
    good: "\x1b[32m", // Green
    "needs-improvement": "\x1b[33m", // Yellow
    poor: "\x1b[31m", // Red
  };
  
  const reset = "\x1b[0m";
  const color = colors[rating];
  
  console.log(
    `${color}[Web Vitals] ${name}: ${value.toFixed(2)}ms - ${rating.toUpperCase()}${reset}`
  );

  // You can also send metrics to analytics service here
  // Example: sendToAnalytics(metric);
}

// Performance Observer for Navigation Timing
function observeNavigationTiming() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "navigation") {
          const navEntry = entry as PerformanceNavigationTiming;
          
          // Time to First Byte (TTFB)
          const ttfb = navEntry.responseStart - navEntry.requestStart;
          logMetric({
            name: "TTFB",
            value: ttfb,
            rating: getRating("TTFB", ttfb),
            delta: ttfb,
            id: "ttfb",
          });

          // DOM Content Loaded
          const dcl = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
          console.log(`[Performance] DOM Content Loaded: ${dcl.toFixed(2)}ms`);

          // Page Load Complete
          const loadComplete = navEntry.loadEventEnd - navEntry.loadEventStart;
          console.log(`[Performance] Load Complete: ${loadComplete.toFixed(2)}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ["navigation"] });
  } catch (error) {
    console.error("Error observing navigation timing:", error);
  }
}

// Performance Observer for Paint Timing
function observePaintTiming() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          const fcp = entry.startTime;
          logMetric({
            name: "FCP",
            value: fcp,
            rating: getRating("FCP", fcp),
            delta: fcp,
            id: "fcp",
          });
        }
      }
    });

    observer.observe({ entryTypes: ["paint"] });
  } catch (error) {
    console.error("Error observing paint timing:", error);
  }
}

// Largest Contentful Paint (LCP)
function observeLCP() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      if (lastEntry) {
        const lcp = lastEntry.startTime;
        logMetric({
          name: "LCP",
          value: lcp,
          rating: getRating("LCP", lcp),
          delta: lcp,
          id: "lcp",
        });
      }
    });

    observer.observe({ entryTypes: ["largest-contentful-paint"] });
  } catch (error) {
    console.error("Error observing LCP:", error);
  }
}

// First Input Delay (FID)
function observeFID() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        const fid = fidEntry.processingStart - fidEntry.startTime;
        
        logMetric({
          name: "FID",
          value: fid,
          rating: getRating("FID", fid),
          delta: fid,
          id: "fid",
        });
      }
    });

    observer.observe({ entryTypes: ["first-input"] });
  } catch (error) {
    console.error("Error observing FID:", error);
  }
}

// Cumulative Layout Shift (CLS)
function observeCLS() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return;
  }

  try {
    let clsValue = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as any;
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }

      // Log CLS periodically
      if (clsValue > 0) {
        logMetric({
          name: "CLS",
          value: clsValue,
          rating: getRating("CLS", clsValue),
          delta: clsValue,
          id: "cls",
        });
      }
    });

    observer.observe({ entryTypes: ["layout-shift"] });
  } catch (error) {
    console.error("Error observing CLS:", error);
  }
}

// Initialize all performance monitoring
export function initWebVitals() {
  if (typeof window === "undefined") {
    return;
  }

  console.log("%c[Web Vitals] Performance monitoring initialized", "color: #00d9ff; font-weight: bold;");

  // Start observing all metrics
  observeNavigationTiming();
  observePaintTiming();
  observeLCP();
  observeFID();
  observeCLS();

  const perf = window.performance as PerformanceWithOptionalMemory; // 收窄以便读取可选 memory
  if (perf.memory) {
    const memory = perf.memory; // 已判空，供模板字符串使用
    console.log(
      `[Performance] Memory: ${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB / ${(
        memory.jsHeapSizeLimit / 1048576
      ).toFixed(2)} MB`
    );
  }
}

// Optional: Report to analytics service
export function sendToAnalytics(metric: Metric) {
  // Implement your analytics service here
  // Example: Google Analytics, Mixpanel, etc.
  
  // Vite 注入 import.meta.env.PROD，避免依赖 Node 的 process（浏览器 tsc 无 process 类型）
  if (import.meta.env.PROD) {
    console.log("Analytics:", metric); // 生产构建时落控制台占位，可替换为实际上报
  }
}
