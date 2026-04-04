import { create } from "zustand";
import { persist } from "zustand/middleware";

type AdminState = {
  /** 管理员登录后 FastAPI 返回的 JWT，请求 /api/admin/* 时放入 Authorization */
  token: string | null;
  setToken: (token: string | null) => void;
};

/** 持久化到 localStorage，刷新页面仍保持登录态（token 过期则需重新登录） */
export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
    }),
    { name: "ai-hub-admin-auth" },
  ),
);
