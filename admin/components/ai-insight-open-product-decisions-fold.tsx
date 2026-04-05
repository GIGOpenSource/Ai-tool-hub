"use client"; // 客户端：依赖 useI18n

import { twMerge } from "tailwind-merge"; // max-w 等冲突类以后者为准
import { useI18n } from "@/lib/i18n/context"; // 多语言文案

type Props = { className?: string }; // 外层可选样式（详情页与主列表宽度可能不同）

/** P-AI-07：与 open_product_decisions 三键对齐；出境 LLM 已产品确认，其余键仍占位 */
export function AiInsightOpenProductDecisionsFold({ className }: Props) {
  const { t } = useI18n(); // 取 t()
  return (
    <details className={twMerge("text-xs text-gray-500 mt-2 max-w-3xl", className)}>
      {/* 原生 details/summary 折叠（标题区 P-AI-07） */}
      <summary className="cursor-pointer text-admin-link">{t("aiSeoInsights.openDecisionsTitle")}</summary>
      {/* 折叠标题文案走 i18n */}
      <div className="mt-2 space-y-2 text-gray-400">
        <p className="whitespace-pre-line">{t("aiSeoInsights.openDecisionsIntro")}</p> {/* 路径与 tbd 总述 */}
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <code className="text-amber-200/90">data_residency_and_cross_border</code>
            {" — "}
            {t("aiSeoInsights.openDecisionsKeyDataResidency")}
          </li>
          <li>
            <code className="text-amber-200/90">model_output_format</code>
            {" — "}
            {t("aiSeoInsights.openDecisionsKeyModelOutput")}
          </li>
          <li>
            <code className="text-amber-200/90">cost_quota_and_retention</code>
            {" — "}
            {t("aiSeoInsights.openDecisionsKeyCostQuota")}
          </li>
        </ul>
        <p className="rounded-md border border-amber-500/30 bg-amber-950/25 px-2.5 py-2 text-amber-100/95 leading-relaxed whitespace-pre-line">
          {t("aiSeoInsights.openDecisionsDisclaimer")}
        </p>
      </div>
    </details>
  ); // 返回折叠块
}
