"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/lib/store";
import { apiGET, apiPATCH, apiPOST } from "@/lib/admin-api";
import { ThHelp } from "@/components/th-help";
import { useI18n } from "@/lib/i18n/context";

type URow = {
  id: number;
  email: string;
  name: string;
  avatar: string;
  role: string;
  last_login_at: string | null;
  banned: boolean;
  submitted_tools_count: number;
  reviews_count: number;
};

export default function AdminUsersPage() {
  const token = useAdminStore((s) => s.token)!;
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", token],
    queryFn: () => apiGET<{ data: URow[] }>("/api/admin/users", token),
    enabled: !!token,
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiPATCH(`/api/admin/users/${id}/role`, token, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const banMut = useMutation({
    mutationFn: ({ id, banned }: { id: number; banned: boolean }) =>
      apiPATCH(`/api/admin/users/${id}/ban`, token, { banned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const mailMut = useMutation({
    mutationFn: (id: number) => apiPOST(`/api/admin/users/${id}/send-email`, token, {}),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("users.title")}</h1>
      <div className="rounded-xl border border-purple-500/20 overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead className="bg-[#120822] text-gray-400 text-left">
            <tr>
              <ThHelp title={t("users.colUid")} help={t("fieldHelp.users.colUid")} />
              <ThHelp title={t("users.colUser")} help={t("fieldHelp.users.colUser")} />
              <ThHelp title={t("users.colRole")} help={t("fieldHelp.users.colRole")} />
              <ThHelp title={t("users.colLastLogin")} help={t("fieldHelp.users.colLastLogin")} />
              <ThHelp title={t("users.colSubmissions")} help={t("fieldHelp.users.colSubmissions")} />
              <ThHelp title={t("users.colActions")} help={t("fieldHelp.users.colActions")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-4 text-gray-500">
                  {t("users.loading")}
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  {t("users.emptyList")}
                </td>
              </tr>
            )}
            {!isLoading &&
              (data?.data ?? []).map((r) => (
                <tr key={r.id} className={r.banned ? "opacity-50" : ""}>
                  <td className="p-2">{r.id}</td>
                  <td className="p-2">
                    <span className="mr-2">{r.avatar}</span>
                    <span className="text-white">{r.name}</span>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </td>
                  <td className="p-2">
                    <select
                      value={r.role}
                      onChange={(e) => roleMut.mutate({ id: r.id, role: e.target.value })}
                      className="bg-black/40 border border-purple-500/30 rounded px-2 py-1 text-xs"
                    >
                      <option value="user">user</option>
                      <option value="developer">developer</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="p-2 text-xs text-gray-500">{r.last_login_at ?? t("common.dash")}</td>
                  <td className="p-2 tabular-nums text-xs">
                    {r.submitted_tools_count} / {r.reviews_count}
                  </td>
                  <td className="p-2 space-x-1">
                    <button
                      type="button"
                      className="text-xs text-rose-300"
                      onClick={() => banMut.mutate({ id: r.id, banned: !r.banned })}
                    >
                      {r.banned ? t("users.unban") : t("users.ban")}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-cyan-300"
                      onClick={() => mailMut.mutate(r.id)}
                    >
                      {t("users.emailMock")}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
