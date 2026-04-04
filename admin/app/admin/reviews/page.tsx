"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAdminStore } from "@/lib/store";
import { apiDELETE, apiGET, apiPATCH } from "@/lib/admin-api";
import { ThHelp } from "@/components/th-help";
import { useI18n } from "@/lib/i18n/context";

type RRow = {
  id: number;
  tool_name: string;
  reviewer_label: string;
  rating: number;
  content_preview: string;
  content_full: string;
  status: string;
  report_count: number;
};

export default function AdminReviewsPage() {
  const token = useAdminStore((s) => s.token)!;
  const { t } = useI18n();
  const qc = useQueryClient();
  const [fullId, setFullId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reviews", token],
    queryFn: () => apiGET<{ data: RRow[] }>("/api/admin/reviews", token),
    enabled: !!token,
  });

  const hideMut = useMutation({
    mutationFn: (id: number) =>
      apiPATCH(`/api/admin/reviews/${id}/status`, token, { ugc_status: "hidden" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });

  const pubMut = useMutation({
    mutationFn: (id: number) =>
      apiPATCH(`/api/admin/reviews/${id}/status`, token, { ugc_status: "published" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDELETE(`/api/admin/reviews/${id}`, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("reviews.title")}</h1>
      <div className="rounded-xl border border-purple-500/20 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-[#120822] text-gray-400 text-left">
            <tr>
              <ThHelp title={t("reviews.colId")} help={t("fieldHelp.reviews.colId")} />
              <ThHelp title={t("reviews.colTool")} help={t("fieldHelp.reviews.colTool")} />
              <ThHelp title={t("reviews.colReviewer")} help={t("fieldHelp.reviews.colReviewer")} />
              <ThHelp title={t("reviews.colStars")} help={t("fieldHelp.reviews.colStars")} />
              <ThHelp title={t("reviews.colPreview")} help={t("fieldHelp.reviews.colPreview")} />
              <ThHelp title={t("reviews.colStatus")} help={t("fieldHelp.reviews.colStatus")} />
              <ThHelp title={t("reviews.colReports")} help={t("fieldHelp.reviews.colReports")} />
              <ThHelp title={t("reviews.colActions")} help={t("fieldHelp.reviews.colActions")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {isLoading && (
              <tr>
                <td colSpan={8} className="p-4 text-gray-500">
                  {t("reviews.loading")}
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  {t("reviews.emptyList")}
                </td>
              </tr>
            )}
            {!isLoading &&
              (data?.data ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="p-2">{r.id}</td>
                  <td className="p-2 text-cyan-100/90">{r.tool_name}</td>
                  <td className="p-2 text-gray-400">{r.reviewer_label}</td>
                  <td className="p-2">{r.rating}</td>
                  <td className="p-2 max-w-[200px] truncate text-gray-400">{r.content_preview}</td>
                  <td className="p-2 text-xs">{r.status}</td>
                  <td className="p-2 tabular-nums">{r.report_count}</td>
                  <td className="p-2 space-x-1 flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="text-xs text-cyan-300"
                      onClick={() => setFullId(r.id === fullId ? null : r.id)}
                    >
                      {t("reviews.fullText")}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-rose-300"
                      onClick={() => hideMut.mutate(r.id)}
                    >
                      {t("reviews.hide")}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-emerald-300"
                      onClick={() => pubMut.mutate(r.id)}
                    >
                      {t("reviews.restore")}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-rose-400"
                      onClick={() => delMut.mutate(r.id)}
                    >
                      {t("reviews.delete")}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {fullId != null && (
        <div className="rounded-lg border border-purple-500/25 bg-[#120822]/80 p-4 text-sm text-gray-300 whitespace-pre-wrap">
          {(data?.data ?? []).find((x) => x.id === fullId)?.content_full}
        </div>
      )}
    </div>
  );
}
