"use client";

/** 表单标签下的说明条（灰字小字），文案来自 t("fieldHelp.*") */
export function FieldHint({ text }: { text: string }) {
  const s = text.trim(); // 去空白
  if (!s) return null; // 无内容不渲染
  return <p className="text-[11px] text-gray-500 leading-relaxed mt-1">{s}</p>; // 字段说明
}
