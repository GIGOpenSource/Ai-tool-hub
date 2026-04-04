import type { Language } from "../contexts/LanguageContext"; // 与站点语言代码一致

/** ErrorBoundary 渲染时 LanguageProvider 可能已卸载，故使用静态多语文案表 */
export type ErrorBoundaryStrings = {
  title: string; // 大标题
  body: string; // 说明正文
  tryAgain: string; // 重试按钮
  goHome: string; // 回首页按钮
  support: string; // 页脚提示
  detailsHeading: string; // 开发环境错误详情标题
  componentStack: string; // 组件栈折叠摘要文案
};

/** 各语言整页崩溃提示（与 Language 枚举一一对应） */
const BY_LANG: Record<Language, ErrorBoundaryStrings> = {
  en: {
    title: "Something went wrong",
    body: "Sorry — the page hit an unexpected error. You can try again or return to the home page.",
    tryAgain: "Try again",
    goHome: "Go to home",
    support: "If this keeps happening, contact support and share the details shown below (in development).",
    detailsHeading: "Error details",
    componentStack: "Component stack",
  },
  zh: {
    title: "页面出现异常",
    body: "抱歉，当前页面发生了意外错误。您可以重试，或返回首页继续浏览。",
    tryAgain: "重试",
    goHome: "返回首页",
    support: "若多次出现，请联系支持，并在开发环境下提供下方详情。",
    detailsHeading: "错误详情",
    componentStack: "组件栈",
  },
  ko: {
    title: "문제가 발생했습니다",
    body: "예기치 않은 오류가 발생했습니다. 다시 시도하거나 홈으로 이동해 주세요.",
    tryAgain: "다시 시도",
    goHome: "홈으로",
    support: "계속되면 지원팀에 문의하고(개발 모드에서는 아래 정보를 공유) 주세요.",
    detailsHeading: "오류 상세",
    componentStack: "컴포넌트 스택",
  },
  ja: {
    title: "問題が発生しました",
    body: "予期しないエラーです。再試行するか、ホームに戻ってください。",
    tryAgain: "再試行",
    goHome: "ホームへ",
    support: "繰り返す場合はサポートへご連絡ください（開発時は下記の詳細を共有）。",
    detailsHeading: "エラー詳細",
    componentStack: "コンポーネントスタック",
  },
  pt: {
    title: "Algo deu errado",
    body: "Ocorreu um erro inesperado. Tente novamente ou volte ao início.",
    tryAgain: "Tentar novamente",
    goHome: "Ir ao início",
    support: "Se persistir, contacte o suporte (em desenvolvimento, envie os detalhes abaixo).",
    detailsHeading: "Detalhes do erro",
    componentStack: "Pilha de componentes",
  },
  es: {
    title: "Algo salió mal",
    body: "Ocurrió un error inesperado. Puede reintentar o volver al inicio.",
    tryAgain: "Reintentar",
    goHome: "Ir al inicio",
    support: "Si continúa, contacte a soporte (en desarrollo, comparta los detalles siguientes).",
    detailsHeading: "Detalles del error",
    componentStack: "Pila de componentes",
  },
  fr: {
    title: "Une erreur s'est produite",
    body: "Une erreur inattendue s'est produite. Réessayez ou retournez à l'accueil.",
    tryAgain: "Réessayer",
    goHome: "Accueil",
    support: "Si cela persiste, contactez le support (en dev, partagez les détails ci-dessous).",
    detailsHeading: "Détails de l'erreur",
    componentStack: "Pile des composants",
  },
};

/**
 * 按用户上次选择的语言取崩溃页文案；无匹配时回退英文。
 * lang 来自 localStorage，需在客户端调用。
 */
export function getErrorBoundaryCopy(lang: string | null): ErrorBoundaryStrings {
  if (lang && lang in BY_LANG) return BY_LANG[lang as Language];
  return BY_LANG.en;
}
