"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/lib/store";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { useI18n } from "@/lib/i18n/context";

export function AdminShell({ children }: { children: ReactNode }) {
  const token = useAdminStore((s) => s.token);
  const router = useRouter();
  const { t } = useI18n();
  /** persist 从 localStorage 恢复完成前 token 恒为初始值，避免误触发跳转导致路由态异常 */
  const [persistReady, setPersistReady] = useState(false);

  useEffect(() => {
    const api = useAdminStore.persist;
    const done = () => setPersistReady(true);
    const unsub = api.onFinishHydration(done);
    if (api.hasHydrated()) done();
    return unsub;
  }, []);

  useEffect(() => {
    if (!persistReady) return;
    if (!token) router.replace("/login");
  }, [persistReady, token, router]);

  if (!persistReady || !token) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center text-gray-500 text-sm">
        {t("shell.verifying")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-admin-bg text-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <AdminHeader />
        <main className="flex-1 min-h-0 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
