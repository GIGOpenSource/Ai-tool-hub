"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"; // ref 提交时合并矩阵 JSON
import { useI18n } from "@/lib/i18n/context"; // 后台文案

/** 父组件在保存前调用：合并 features/pros/cons 文本进完整 payload；失败返回 null */
export type ComparisonVisualEditorHandle = {
  buildPayloadForSave: () => Record<string, unknown> | null;
};

/** 安全对象 */
function asObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>; // 对象
  return {}; // 默认空
}

/** 标量转展示用字符串 */
function str(v: unknown): string {
  if (typeof v === "string") return v; // 已是串
  if (v == null) return ""; // null/undefined
  return String(v); // 数字等
}

/** 标量转数字评分 */
function num(v: unknown): number {
  const n = Number(v); // 尝试转换
  return Number.isFinite(n) ? n : 0; // 非法则 0
}

/** 读取 alternatives 数组 */
function altsList(d: Record<string, unknown>): Record<string, unknown>[] {
  const a = d.alternatives; // 键名固定
  if (!Array.isArray(a)) return []; // 非数组当空
  return a.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<string, unknown>[]; // 只要对象元素
}

/** 读取 seo_cards */
function cardsList(d: Record<string, unknown>): { title: string; body: string }[] {
  const c = d.seo_cards; // 键名固定
  if (!Array.isArray(c)) return []; // 非数组当空
  return c
    .filter((x) => x && typeof x === "object" && !Array.isArray(x)) // 对象元素
    .map((x) => {
      const o = x as Record<string, unknown>; // 行
      return { title: str(o.title), body: str(o.body) }; // 两个字段
    });
}

/** 一条替代工具的默认可编辑形态 */
function emptyAltRow(): Record<string, unknown> {
  return { name: "", logo: "", developer: "", rating: 0, pricing: "", description: "" }; // 与种子对齐
}

/** 对比页可视化：主工具、替代、SEO、卡片 + 三块结构化 JSON */
export const ComparisonVisualEditor = forwardRef<
  ComparisonVisualEditorHandle,
  {
    draft: Record<string, unknown>; // 父级草稿
    onChange: (next: Record<string, unknown>) => void; // 回写父级
    syncSig: string; // 与 server / slug 同步时刷新矩阵文本
  }
>(function ComparisonVisualEditor({ draft, onChange, syncSig }, ref) {
  const { t } = useI18n(); // t("comparisonAdmin.*")
  const mt = useMemo(() => asObj(draft.mainTool), [draft]); // mainTool 对象
  const alts = useMemo(() => altsList(draft), [draft]); // 替代列表
  const cards = useMemo(() => cardsList(draft), [draft]); // 卡片列表
  const draftRef = useRef(draft); // 保存按钮时读最新草稿
  draftRef.current = draft; // 每渲染更新

  const [featText, setFeatText] = useState("[]"); // features JSON 文本
  const [prosText, setProsText] = useState("{}"); // pros JSON
  const [consText, setConsText] = useState("{}"); // cons JSON

  useEffect(() => {
    setFeatText(JSON.stringify(draft.features ?? [], null, 2)); // 与服务端或 slug 切换对齐
    setProsText(JSON.stringify(draft.pros ?? {}, null, 2)); // 同上
    setConsText(JSON.stringify(draft.cons ?? {}, null, 2)); // 同上
  }, [syncSig]); // eslint-disable-line react-hooks/exhaustive-deps --  intentionally omit draft 内字段编辑避免冲掉未保存矩阵文本

  useImperativeHandle(ref, () => ({
    buildPayloadForSave: () => {
      let features: unknown; // 解析结果
      let pros: unknown;
      let cons: unknown;
      try {
        features = JSON.parse(featText); // 矩阵
      } catch {
        return null; // 失败
      }
      try {
        pros = JSON.parse(prosText); // 长处
      } catch {
        return null;
      }
      try {
        cons = JSON.parse(consText); // 短处
      } catch {
        return null;
      }
      return { ...draftRef.current, features, pros, cons }; // 整包
    },
  }));

  const patchMain = (patch: Record<string, unknown>) => {
    onChange({ ...draft, mainTool: { ...mt, ...patch } }); // 合并主工具
  };

  const patchAlt = (index: number, patch: Record<string, unknown>) => {
    const next = alts.slice(); // 拷贝
    next[index] = { ...asObj(next[index]), ...patch }; // 单行合并
    onChange({ ...draft, alternatives: next }); // 回写
  };

  const setCards = (nextCards: { title: string; body: string }[]) => {
    onChange({ ...draft, seo_cards: nextCards }); // 卡片数组
  };

  const inputCls =
    "w-full rounded-lg border border-purple-500/30 bg-[#0a0118] px-2 py-1.5 text-sm text-white"; // 通用输入框

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-cyan-300">{t("comparisonAdmin.sectionMain")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 text-xs text-gray-400">
            {t("comparisonAdmin.fieldName")}
            <input className={inputCls} value={str(mt.name)} onChange={(e) => patchMain({ name: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs text-gray-400">
            {t("comparisonAdmin.fieldLogo")}
            <input className={inputCls} value={str(mt.logo)} onChange={(e) => patchMain({ logo: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs text-gray-400">
            {t("comparisonAdmin.fieldDeveloper")}
            <input className={inputCls} value={str(mt.developer)} onChange={(e) => patchMain({ developer: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs text-gray-400">
            {t("comparisonAdmin.fieldRating")}
            <input
              type="number"
              step="0.1"
              className={inputCls}
              value={num(mt.rating)}
              onChange={(e) => patchMain({ rating: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
          </label>
          <label className="block space-y-1 text-xs text-gray-400 md:col-span-2">
            {t("comparisonAdmin.fieldPricing")}
            <input className={inputCls} value={str(mt.pricing)} onChange={(e) => patchMain({ pricing: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs text-gray-400 md:col-span-2">
            {t("comparisonAdmin.fieldDescription")}
            <textarea className={`${inputCls} min-h-[80px]`} value={str(mt.description)} onChange={(e) => patchMain({ description: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-cyan-300">{t("comparisonAdmin.sectionAlts")}</h2>
          <button
            type="button"
            className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/10"
            onClick={() => onChange({ ...draft, alternatives: [...alts, emptyAltRow()] })}
          >
            {t("comparisonAdmin.addAlt")}
          </button>
        </div>
        <div className="space-y-4">
          {alts.map((row, i) => (
            <div key={i} className="rounded-xl border border-purple-500/25 bg-[#0a0118]/80 p-4 space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-rose-400 hover:underline"
                  onClick={() => onChange({ ...draft, alternatives: alts.filter((_, j) => j !== i) })}
                >
                  {t("comparisonAdmin.remove")}
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-xs text-gray-400 space-y-1 block">
                  {t("comparisonAdmin.fieldName")}
                  <input className={inputCls} value={str(row.name)} onChange={(e) => patchAlt(i, { name: e.target.value })} />
                </label>
                <label className="text-xs text-gray-400 space-y-1 block">
                  {t("comparisonAdmin.fieldLogo")}
                  <input className={inputCls} value={str(row.logo)} onChange={(e) => patchAlt(i, { logo: e.target.value })} />
                </label>
                <label className="text-xs text-gray-400 space-y-1 block">
                  {t("comparisonAdmin.fieldDeveloper")}
                  <input className={inputCls} value={str(row.developer)} onChange={(e) => patchAlt(i, { developer: e.target.value })} />
                </label>
                <label className="text-xs text-gray-400 space-y-1 block">
                  {t("comparisonAdmin.fieldRating")}
                  <input
                    type="number"
                    step="0.1"
                    className={inputCls}
                    value={num(row.rating)}
                    onChange={(e) => patchAlt(i, { rating: e.target.value === "" ? 0 : Number(e.target.value) })}
                  />
                </label>
                <label className="text-xs text-gray-400 space-y-1 block md:col-span-2">
                  {t("comparisonAdmin.fieldPricing")}
                  <input className={inputCls} value={str(row.pricing)} onChange={(e) => patchAlt(i, { pricing: e.target.value })} />
                </label>
                <label className="text-xs text-gray-400 space-y-1 block md:col-span-2">
                  {t("comparisonAdmin.fieldDescription")}
                  <textarea className={`${inputCls} min-h-[72px]`} value={str(row.description)} onChange={(e) => patchAlt(i, { description: e.target.value })} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-cyan-300">{t("comparisonAdmin.sectionSeo")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 text-xs text-gray-400 md:col-span-2">
            {t("comparisonAdmin.seoTitleSuffix")}
            <input className={inputCls} value={str(draft.seo_title_suffix)} onChange={(e) => onChange({ ...draft, seo_title_suffix: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs text-gray-400 md:col-span-2">
            {t("comparisonAdmin.seoIntro")}
            <textarea className={`${inputCls} min-h-[64px]`} value={str(draft.seo_intro)} onChange={(e) => onChange({ ...draft, seo_intro: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs text-gray-400 md:col-span-2">
            {t("comparisonAdmin.seoChooserTitle")}
            <input className={inputCls} value={str(draft.seo_chooser_title)} onChange={(e) => onChange({ ...draft, seo_chooser_title: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs text-gray-400 md:col-span-2">
            {t("comparisonAdmin.seoChooserIntro")}
            <textarea className={`${inputCls} min-h-[64px]`} value={str(draft.seo_chooser_intro)} onChange={(e) => onChange({ ...draft, seo_chooser_intro: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs text-gray-400 md:col-span-2">
            {t("comparisonAdmin.footerNote")}
            <input className={inputCls} value={str(draft.footer_note)} onChange={(e) => onChange({ ...draft, footer_note: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-cyan-300">{t("comparisonAdmin.sectionCards")}</h2>
          <button
            type="button"
            className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/10"
            onClick={() => setCards([...cards, { title: "", body: "" }])}
          >
            {t("comparisonAdmin.addCard")}
          </button>
        </div>
        <div className="space-y-3">
          {cards.map((card, i) => (
            <div key={i} className="rounded-lg border border-purple-500/20 p-3 space-y-2">
              <div className="flex justify-end">
                <button type="button" className="text-xs text-rose-400 hover:underline" onClick={() => setCards(cards.filter((_, j) => j !== i))}>
                  {t("comparisonAdmin.remove")}
                </button>
              </div>
              <label className="block space-y-1 text-xs text-gray-400">
                {t("comparisonAdmin.fieldTitle")}
                <input
                  className={inputCls}
                  value={card.title}
                  onChange={(e) => {
                    const cp = cards.slice();
                    cp[i] = { ...cp[i], title: e.target.value };
                    setCards(cp);
                  }}
                />
              </label>
              <label className="block space-y-1 text-xs text-gray-400">
                {t("comparisonAdmin.fieldBody")}
                <textarea
                  className={`${inputCls} min-h-[80px]`}
                  value={card.body}
                  onChange={(e) => {
                    const cp = cards.slice();
                    cp[i] = { ...cp[i], body: e.target.value };
                    setCards(cp);
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-cyan-300">{t("comparisonAdmin.sectionMatrix")}</h2>
        <p className="text-xs text-gray-500">{t("comparisonAdmin.matrixHint")}</p>
        <label className="block space-y-1 text-xs text-amber-200/90">
          features
          <textarea className="w-full min-h-[200px] font-mono text-xs rounded-lg border border-purple-500/25 bg-[#0a0118] p-2 text-gray-100" spellCheck={false} value={featText} onChange={(e) => setFeatText(e.target.value)} />
        </label>
        <label className="block space-y-1 text-xs text-amber-200/90">
          pros
          <textarea className="w-full min-h-[120px] font-mono text-xs rounded-lg border border-purple-500/25 bg-[#0a0118] p-2 text-gray-100" spellCheck={false} value={prosText} onChange={(e) => setProsText(e.target.value)} />
        </label>
        <label className="block space-y-1 text-xs text-amber-200/90">
          cons
          <textarea className="w-full min-h-[120px] font-mono text-xs rounded-lg border border-purple-500/25 bg-[#0a0118] p-2 text-gray-100" spellCheck={false} value={consText} onChange={(e) => setConsText(e.target.value)} />
        </label>
      </section>
    </div>
  );
});

ComparisonVisualEditor.displayName = "ComparisonVisualEditor"; // DevTools 显示名
