"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function ToolRejectDialog({ open, onClose, onConfirm }: Props) {
  const { t } = useI18n();
  const [reason, setReason] = useState("URL_INVALID");

  const reasons = useMemo(
    () =>
      [
        { value: "URL_INVALID", labelKey: "reject.urlInvalid" },
        { value: "DESCRIPTION_VIOLATION", labelKey: "reject.descViolation" },
        { value: "NOT_AI_TOOL", labelKey: "reject.notAiTool" },
        { value: "DUPLICATE", labelKey: "reject.duplicate" },
        { value: "OTHER", labelKey: "reject.other" },
      ] as const,
    []
  );

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-purple-500/30 bg-[#1a0b2e] p-6 space-y-4">
        <h3 className="text-lg font-medium text-white">{t("reject.title")}</h3>
        <select
          className="w-full rounded-lg bg-black/40 border border-purple-500/30 px-3 py-2 text-sm text-white"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {t(r.labelKey)}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5"
          >
            {t("reject.cancel")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            className="px-4 py-2 rounded-lg text-sm bg-rose-600 text-white"
          >
            {t("reject.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
