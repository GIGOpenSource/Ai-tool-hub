"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // 列表与变更
import Link from "next/link"; // 跳转编辑页
import { useState } from "react"; // 标签页与拒绝对话框
import { useAdminStore } from "@/lib/store"; // 管理员 token
import { apiGET, apiPATCH } from "@/lib/admin-api";
import { FieldHint } from "@/components/field-hint";
import { ThHelp } from "@/components/th-help";
import { ToolRejectDialog } from "@/components/tool-reject-dialog";
import { useI18n } from "@/lib/i18n/context";

type ToolRow = {
  id: number;
  slug: string;
  name: string;
  logo: string;
  website_url: string;
  category_slug: string;
  submitter_email: string | null;
  status: string;
  featured: boolean;
  pv: number;
  uv: number;
  uid: number;
};

type Tab = "all" | "pending" | "active" | "rejected";

export default function AdminToolsPage() {
  const token = useAdminStore((s) => s.token)!;
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [rejectId, setRejectId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "tools", tab, token],
    queryFn: () => apiGET<{ data: ToolRow[] }>(`/api/admin/tools?tab=${tab}`, token),
    enabled: !!token,
  });

  const patchStatus = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: { status: string; reject_reason?: string } }) =>
      apiPATCH(`/api/admin/tools/${id}/status`, token, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tools"] }),
  });

  const patchFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: number; featured: boolean }) =>
      apiPATCH(`/api/admin/tools/${id}/featured`, token, { featured }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tools"] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("tools.title")}</h1>

      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "active", "rejected"] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              title={t("fieldHelp.toolsList.tabHint")}
              onClick={() => setTab(tabKey)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize ${
                tab === tabKey ? "bg-purple-500/35 text-white" : "bg-white/5 text-gray-400"
              }`}
            >
              {tabKey === "all"
                ? t("tools.tabAll")
                : tabKey === "pending"
                  ? t("tools.tabPending")
                  : tabKey === "active"
                    ? t("tools.tabActive")
                    : t("tools.tabRejected")}
            </button>
          ))}
        </div>
        <FieldHint text={t("fieldHelp.toolsList.tabHint")} />
      </div>

      <div className="rounded-xl border border-purple-500/20 overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-[#120822] text-gray-400 text-left">
            <tr>
              <ThHelp title={t("tools.colId")} help={t("fieldHelp.toolsList.colId")} />
              <ThHelp title={t("tools.colTool")} help={t("fieldHelp.toolsList.colTool")} />
              <ThHelp title={t("tools.colCategory")} help={t("fieldHelp.toolsList.colCategory")} />
              <ThHelp title={t("tools.colWebsite")} help={t("fieldHelp.toolsList.colWebsite")} />
              <ThHelp title={t("tools.colEmail")} help={t("fieldHelp.toolsList.colEmail")} />
              <ThHelp title={t("tools.colStatus")} help={t("fieldHelp.toolsList.colStatus")} />
              <ThHelp title={t("tools.colMetrics")} help={t("fieldHelp.toolsList.colMetrics")} />
              <ThHelp title={t("tools.colActions")} help={t("fieldHelp.toolsList.colActions")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {isLoading && (
              <tr>
                <td colSpan={8} className="p-4 text-gray-500">
                  {t("tools.loading")}
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  {t("tools.emptyList")}
                </td>
              </tr>
            )}
            {!isLoading &&
              (data?.data ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.03]">
                  <td className="p-2 tabular-nums">{r.id}</td>
                  <td className="p-2">
                    <span className="mr-2">{r.logo}</span>
                    {r.name}
                  </td>
                  <td className="p-2 text-gray-400">{r.category_slug}</td>
                  <td className="p-2 max-w-[200px] truncate">
                    {r.website_url ? (
                      <a
                        href={r.website_url.startsWith("http") ? r.website_url : `https://${r.website_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-300 hover:underline text-xs"
                      >
                        {r.website_url}
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs">{t("common.dash")}</span>
                    )}
                  </td>
                  <td className="p-2 text-gray-400 text-xs">{r.submitter_email ?? t("common.dash")}</td>
                  <td className="p-2">
                    <span className="rounded px-2 py-0.5 text-xs bg-white/10">{r.status}</span>
                    {r.featured && (
                      <span className="ml-1 text-amber-400 text-xs">{t("tools.featured")}</span>
                    )}
                  </td>
                  <td className="p-2 tabular-nums text-xs text-gray-400">
                    {r.pv}/{r.uv}/{r.uid}
                  </td>
                  <td className="p-2 space-x-1 flex flex-wrap gap-1">
                    <Link
                      href={`/admin/tools/${r.id}/edit`}
                      className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                    >
                      {t("tools.edit")}
                    </Link>
                    {r.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded bg-emerald-500/25 text-emerald-300"
                          onClick={() => patchStatus.mutate({ id: r.id, body: { status: "ACTIVE" } })}
                        >
                          {t("tools.approve")}
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded bg-rose-500/25 text-rose-300"
                          onClick={() => setRejectId(r.id)}
                        >
                          {t("tools.reject")}
                        </button>
                      </>
                    )}
                    {r.status === "active" && (
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-200"
                        onClick={() =>
                          patchFeatured.mutate({ id: r.id, featured: !r.featured })
                        }
                      >
                        {r.featured ? t("tools.unfeature") : t("tools.featured")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <ToolRejectDialog
        open={rejectId != null}
        onClose={() => setRejectId(null)}
        onConfirm={(reason) => {
          if (rejectId != null) {
            patchStatus.mutate({
              id: rejectId,
              body: { status: "REJECTED", reject_reason: reason },
            });
          }
          setRejectId(null);
        }}
      />
    </div>
  );
}
