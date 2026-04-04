"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAdminStore } from "@/lib/store";
import { apiGET, apiPUT } from "@/lib/admin-api";
import { FieldHint } from "@/components/field-hint";
import { ThHelp } from "@/components/th-help";
import { useI18n } from "@/lib/i18n/context";

type MenuItem = {
  id: string;
  key: string;
  label: string;
  path: string;
  icon: string;
  permission: string;
  visible: boolean;
  order: number;
};

const emptyDraft: MenuItem = {
  id: "",
  key: "",
  label: "",
  path: "",
  icon: "",
  permission: "",
  visible: true,
  order: 0,
};

export default function AdminSettingsPage() {
  const token = useAdminStore((s) => s.token)!;
  const { t } = useI18n();
  const qc = useQueryClient();
  const [rawPayload, setRawPayload] = useState<Record<string, unknown>>({});
  const [menuScope, setMenuScope] = useState<"admin" | "frontend">("admin");
  const [adminMenuItems, setAdminMenuItems] = useState<MenuItem[]>([]);
  const [frontendMenuItems, setFrontendMenuItems] = useState<MenuItem[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [draft, setDraft] = useState<MenuItem>(emptyDraft);

  const { data } = useQuery({
    queryKey: ["admin", "settings", token],
    queryFn: () => apiGET<{ payload: Record<string, unknown> }>("/api/admin/settings", token),
    enabled: !!token,
  });

  useEffect(() => {
    if (!data?.payload) return;
    setRawPayload(data.payload);
    const normalize = (arr: Array<Record<string, unknown>>) =>
      arr.map((it, idx) => ({
        id: String(it.id ?? `${Date.now()}-${idx}`),
        key: String(it.key ?? ""),
        label: String(it.label ?? ""),
        path: String(it.path ?? ""),
        icon: String(it.icon ?? ""),
        permission: String(it.permission ?? ""),
        visible: Boolean(it.visible ?? true),
        order: Number(it.order ?? idx),
      }));
    const adminArr = Array.isArray((data.payload as { admin_menu_items?: unknown }).admin_menu_items)
      ? ((data.payload as { admin_menu_items: unknown[] }).admin_menu_items as Array<Record<string, unknown>>)
      : Array.isArray((data.payload as { menu_items?: unknown }).menu_items)
        ? ((data.payload as { menu_items: unknown[] }).menu_items as Array<Record<string, unknown>>)
        : [];
    const frontendArr = Array.isArray((data.payload as { frontend_menu_items?: unknown }).frontend_menu_items)
      ? ((data.payload as { frontend_menu_items: unknown[] }).frontend_menu_items as Array<Record<string, unknown>>)
      : [];
    setAdminMenuItems(normalize(adminArr).sort((a, b) => a.order - b.order));
    setFrontendMenuItems(normalize(frontendArr).sort((a, b) => a.order - b.order));
  }, [data]);

  const menuItems = useMemo(
    () => (menuScope === "admin" ? adminMenuItems : frontendMenuItems),
    [menuScope, adminMenuItems, frontendMenuItems]
  );
  const setMenuItems = (updater: (prev: MenuItem[]) => MenuItem[]) => {
    if (menuScope === "admin") setAdminMenuItems((prev) => updater(prev));
    else setFrontendMenuItems((prev) => updater(prev));
  };
  const sorted = useMemo(() => [...menuItems].sort((a, b) => a.order - b.order), [menuItems]);
  const sortedAdmin = useMemo(() => [...adminMenuItems].sort((a, b) => a.order - b.order), [adminMenuItems]);
  const sortedFrontend = useMemo(
    () => [...frontendMenuItems].sort((a, b) => a.order - b.order),
    [frontendMenuItems]
  );

  const save = useMutation({
    mutationFn: () =>
      apiPUT("/api/admin/settings", token, {
        payload: {
          ...rawPayload,
          menu_items: sortedAdmin,
          admin_menu_items: sortedAdmin,
          frontend_menu_items: sortedFrontend,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, id: `${Date.now()}`, order: sorted.length });
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setDraft({ ...item });
  };

  const closeModal = () => {
    setEditing(null);
    setDraft(emptyDraft);
  };

  const submitModal = () => {
    if (!draft.key.trim() || !draft.label.trim() || !draft.path.trim()) return;
    if (editing) {
      setMenuItems((prev) => prev.map((it) => (it.id === editing.id ? { ...draft } : it)));
    } else {
      setMenuItems((prev) => [...prev, { ...draft }]);
    }
    closeModal();
  };

  const removeItem = (id: string) => {
    setMenuItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("settings.title")}</h1>
      <p className="text-sm text-gray-500">{t("settings.subtitle")}</p>

      <div className="space-y-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg text-white">{t("settings.menuTitle")}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              title={t("fieldHelp.settings.scopeAdmin")}
              onClick={() => setMenuScope("admin")}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                menuScope === "admin" ? "bg-white/10 text-white" : "bg-white/5 text-gray-400"
              }`}
            >
              {t("settings.scopeAdmin")}
            </button>
            <button
              type="button"
              title={t("fieldHelp.settings.scopeFrontend")}
              onClick={() => setMenuScope("frontend")}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                menuScope === "frontend" ? "bg-white/10 text-white" : "bg-white/5 text-gray-400"
              }`}
            >
              {t("settings.scopeFrontend")}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="px-3 py-2 rounded-lg bg-admin-btn text-white text-sm"
            >
              {t("settings.addMenu")}
            </button>
          </div>
        </div>
        <FieldHint text={t("fieldHelp.settings.scopeIntro")} />
        <FieldHint text={t("fieldHelp.settings.menuTitle")} />
      </div>

      <div className="rounded-xl border border-admin-border/90 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-admin-surface text-left text-gray-400">
            <tr>
              <ThHelp title={t("settings.colOrder")} help={t("fieldHelp.settings.colOrder")} />
              <ThHelp title={t("settings.colKey")} help={t("fieldHelp.settings.colKey")} />
              <ThHelp title={t("settings.colLabel")} help={t("fieldHelp.settings.colLabel")} />
              <ThHelp title={t("settings.colPath")} help={t("fieldHelp.settings.colPath")} />
              <ThHelp title={t("settings.colIcon")} help={t("fieldHelp.settings.colIcon")} />
              <ThHelp title={t("settings.colPermission")} help={t("fieldHelp.settings.colPermission")} />
              <ThHelp title={t("settings.colVisible")} help={t("fieldHelp.settings.colVisible")} />
              <ThHelp title={t("settings.colActions")} help={t("fieldHelp.settings.colActions")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {sorted.map((it) => (
              <tr key={it.id} className="hover:bg-white/[0.03]">
                <td className="p-3 tabular-nums">{it.order}</td>
                <td className="p-3 font-mono text-gray-200">{it.key}</td>
                <td className="p-3 text-gray-200">{it.label}</td>
                <td className="p-3 font-mono text-xs text-gray-400">{it.path}</td>
                <td className="p-3">{it.icon}</td>
                <td className="p-3 font-mono text-xs text-amber-200">{it.permission || t("common.dash")}</td>
                <td className="p-3">{it.visible ? t("settings.visibleYes") : t("settings.visibleNo")}</td>
                <td className="p-3 space-x-2">
                  <button
                    type="button"
                    onClick={() => openEdit(it)}
                    className="px-2 py-1 rounded bg-admin-highlight text-gray-200 text-xs"
                  >
                    {t("settings.editMenu")}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="px-2 py-1 rounded bg-rose-500/20 text-rose-200 text-xs"
                  >
                    {t("settings.deleteMenu")}
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-gray-500 text-center">
                  {t("settings.emptyMenus")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-4 py-2 rounded-lg bg-admin-btn text-white text-sm disabled:opacity-50"
        >
          {save.isPending ? t("settings.saving") : t("settings.save")}
        </button>
        <FieldHint text={t("fieldHelp.settings.save")} />
      </div>
      {save.isError && <p className="text-sm text-rose-400">{t("settings.errSave")}</p>}
      {save.isSuccess && <p className="text-sm text-emerald-400">{t("settings.success")}</p>}

      {draft.id && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border border-admin-border bg-admin-surface p-5 space-y-4">
            <h3 className="text-lg text-white">
              {editing ? t("settings.editMenu") : t("settings.addMenu")} ·{" "}
              {menuScope === "admin" ? t("settings.scopeAdmin") : t("settings.scopeFrontend")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <FieldHint text={t("fieldHelp.settings.colOrder")} />
                <input
                  value={draft.order}
                  onChange={(e) => setDraft((d) => ({ ...d, order: Number(e.target.value || 0) }))}
                  type="number"
                  placeholder={t("settings.colOrder")}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-admin-border/90 px-3 py-2 text-sm text-gray-200"
                />
              </div>
              <div>
                <FieldHint text={t("fieldHelp.settings.colKey")} />
                <input
                  value={draft.key}
                  onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
                  placeholder={t("settings.colKey")}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-admin-border/90 px-3 py-2 text-sm text-gray-200"
                />
              </div>
              <div>
                <FieldHint text={t("fieldHelp.settings.colLabel")} />
                <input
                  value={draft.label}
                  onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder={t("settings.colLabel")}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-admin-border/90 px-3 py-2 text-sm text-gray-200"
                />
              </div>
              <div>
                <FieldHint text={t("fieldHelp.settings.colPath")} />
                <input
                  value={draft.path}
                  onChange={(e) => setDraft((d) => ({ ...d, path: e.target.value }))}
                  placeholder={t("settings.colPath")}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-admin-border/90 px-3 py-2 text-sm text-gray-200"
                />
              </div>
              <div>
                <FieldHint text={t("fieldHelp.settings.colIcon")} />
                <input
                  value={draft.icon}
                  onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))}
                  placeholder={t("settings.colIcon")}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-admin-border/90 px-3 py-2 text-sm text-gray-200"
                />
              </div>
              <div>
                <FieldHint text={t("fieldHelp.settings.colPermission")} />
                <input
                  value={draft.permission}
                  onChange={(e) => setDraft((d) => ({ ...d, permission: e.target.value }))}
                  placeholder={t("settings.colPermission")}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-admin-border/90 px-3 py-2 text-sm text-gray-200"
                />
              </div>
              <label className="flex flex-col gap-1 text-sm text-gray-300 md:col-span-2">
                <FieldHint text={t("fieldHelp.settings.colVisible")} />
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.visible}
                    onChange={(e) => setDraft((d) => ({ ...d, visible: e.target.checked }))}
                  />
                  {t("settings.colVisible")}
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-3 py-2 rounded-lg bg-white/10 text-gray-300 text-sm"
              >
                {t("settings.cancel")}
              </button>
              <button
                type="button"
                onClick={submitModal}
                className="px-3 py-2 rounded-lg bg-admin-btn text-white text-sm"
              >
                {t("settings.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
