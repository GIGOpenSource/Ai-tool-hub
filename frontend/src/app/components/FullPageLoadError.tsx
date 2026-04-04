import { AlertTriangle, Home, RefreshCcw } from "lucide-react"; // 图标
import { Button } from "./ui/button"; // 主按钮样式
import { SEO } from "./SEO"; // noindex 与 htmlLang
import { useLanguage } from "../contexts/LanguageContext"; // t() 与当前语言

type Props = {
  /** 来自 api / catch 的简短错误信息，收入折叠区避免吓跑普通用户 */
  technicalMessage: string;
  /** 点击「重试」时触发（通常为重新拉数） */
  onRetry: () => void;
};

/**
 * 首页级数据加载失败时的整页提示：与 ErrorBoundary 视觉一致，文案走 i18n。
 */
export function FullPageLoadError({ technicalMessage, onRetry }: Props) {
  const { t, language } = useLanguage(); // 当前语言与翻译函数
  const title = t("error.loadTitle"); // 标题（种子未更新时可能显示 key）
  const body = t("error.loadBody"); // 用户可读说明
  const isDev = import.meta.env.DEV; // Vite 开发模式才展示本地启动命令

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center px-4">
      <SEO noindex title={title} description={body} htmlLang={language} /> {/* SEO 用友好描述，不含堆栈 */}
      <div className="max-w-2xl w-full">
        <div className="bg-[#1a0b2e]/50 border border-red-500/30 rounded-2xl p-8 md:p-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-red-500/20 border border-red-500/30">
              <AlertTriangle className="w-12 h-12 text-red-400" aria-hidden /> {/* 装饰性图标 */}
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">{title}</h1>
          <p className="text-gray-400 text-center mb-8 leading-relaxed">{body}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button
              type="button"
              onClick={onRetry}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
            >
              <RefreshCcw className="w-4 h-4 mr-2" aria-hidden />
              {t("error.retry")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              variant="outline"
              className="border-purple-500/30 text-cyan-400 hover:bg-purple-500/20"
            >
              <Home className="w-4 h-4 mr-2" aria-hidden />
              {t("error.goHome")}
            </Button>
          </div>
          <details className="p-4 bg-black/20 border border-purple-500/20 rounded-lg text-left">
            <summary className="text-cyan-400/90 text-sm cursor-pointer select-none">
              {t("error.technicalSummary")}
            </summary>
            <p className="mt-3 text-red-300/90 text-sm font-mono break-words">{technicalMessage}</p>
            {isDev && (
              <p className="mt-4 text-gray-500 text-xs leading-relaxed border-t border-purple-500/10 pt-3">
                {t("error.devBackendTip")}
              </p>
            )}
          </details>
        </div>
      </div>
    </div>
  );
}
