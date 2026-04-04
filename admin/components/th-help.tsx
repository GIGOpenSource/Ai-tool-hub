"use client";

/** 表头：标题 + 字段说明两行，避免只用 title 属性不可扫读 */
export function ThHelp({ title, help }: { title: string; help: string }) {
  return (
    <th className="p-3 align-top text-left max-w-[14rem]">
      <div className="text-xs text-gray-400 font-medium">{title}</div>
      <div className="text-[10px] text-gray-500 font-normal mt-1 leading-snug">{help}</div>
    </th>
  );
}
