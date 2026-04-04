import React, { Component, ReactNode } from "react";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react"; // 图标
import { Button } from "./ui/button"; // 按钮
import { readPreferredLanguage } from "../contexts/LanguageContext"; // 崩溃页无 Provider 时读语言
import { getErrorBoundaryCopy } from "../lib/errorBoundaryCopy"; // 静态多语文案

interface Props {
  children: ReactNode; // 子树
}

interface State {
  hasError: boolean; // 是否已进入错误展示
  error: Error | null; // 捕获的异常对象
  errorInfo: React.ErrorInfo | null; // React 提供的组件栈
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true }; // 触发降级 UI（error 本体在 didCatch 写入）
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary:", error, errorInfo); // 开发期控制台保留堆栈
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const copy = getErrorBoundaryCopy(readPreferredLanguage()); // 与用户所选语言对齐
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center px-4">
          <div className="max-w-2xl w-full">
            <div className="bg-[#1a0b2e]/50 border border-red-500/30 rounded-2xl p-8 md:p-12">
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-red-500/20 border border-red-500/30">
                  <AlertTriangle className="w-12 h-12 text-red-400" aria-hidden />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">{copy.title}</h1>
              <p className="text-gray-400 text-center mb-8 leading-relaxed">{copy.body}</p>
              {import.meta.env.DEV && this.state.error && ( // 仅 Vite 开发构建展示堆栈详情
                <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <h3 className="text-red-400 font-semibold mb-2">{copy.detailsHeading}</h3>
                  <p className="text-red-300 text-sm font-mono mb-2 break-words">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-red-400 text-sm cursor-pointer hover:text-red-300 select-none">
                        {copy.componentStack}
                      </summary>
                      <pre className="text-red-300 text-xs mt-2 overflow-x-auto whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  type="button"
                  onClick={this.handleReset}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" aria-hidden />
                  {copy.tryAgain}
                </Button>
                <Button
                  type="button"
                  onClick={this.handleReload}
                  variant="outline"
                  className="border-purple-500/30 text-cyan-400 hover:bg-purple-500/20"
                >
                  <Home className="w-4 h-4 mr-2" aria-hidden />
                  {copy.goHome}
                </Button>
              </div>
              <div className="mt-8 pt-6 border-t border-purple-500/20 text-center">
                <p className="text-gray-500 text-sm">{copy.support}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
