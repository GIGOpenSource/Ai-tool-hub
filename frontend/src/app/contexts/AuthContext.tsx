import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { apiGet, apiPost, getAccessToken, setAccessToken } from "../../lib/api";

/** 前端展示的用户信息（与 `/api/auth/login` 返回字段对齐，不含 token） */
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio?: string;
  joinDate?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** 将接口返回行转为界面用的 User（补充静态占位 joinDate） */
function normalizeUser(row: {
  id: string;
  email: string;
  name: string;
  avatar: string;
  bio?: string;
}): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    bio: row.bio ?? "",
    joinDate: "March 2026",
  };
}

/** 根据 apiGet 抛错信息判断是否为 401（与 lib/api 中 `${path} ${status}` 对齐） */
function _isUnauthorizedError(e: unknown): boolean {
  return e instanceof Error && /\b401\b/.test(e.message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  /** 清登录态：与 AUTH-01 一致，过期 JWT 不重留「假登录」 */
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    setAccessToken(null);
  }, []);

  /** 调用后端登录，持久化 user 快照与 access_token */
  const login = async (email: string, _password: string) => {
    const row = await apiPost<
      {
        id: string;
        email: string;
        name: string;
        avatar: string;
        bio: string;
        access_token?: string;
      },
      { email: string; password: string }
    >("/api/auth/login", { email, password: _password });
    const u = normalizeUser(row);
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    if (row.access_token) setAccessToken(row.access_token);
  };

  /** 注册成功后同样写入 token，后续 `/api/submissions/tool` 依赖 JWT */
  const signup = async (email: string, password: string, name: string) => {
    const row = await apiPost<
      {
        id: string;
        email: string;
        name: string;
        avatar: string;
        bio: string;
        access_token?: string;
      },
      { email: string; password: string; name: string }
    >("/api/auth/signup", { email, password, name });
    const u = normalizeUser(row);
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    if (row.access_token) setAccessToken(row.access_token);
  };

  /** 仅更新本地展示与 localStorage；持久化需配合 PUT /api/me/profile 与 refreshUser */
  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  /** 用 GET /api/me 与 JWT 拉齐服务端昵称、头像 emoji、简介；401 时 logout */
  const refreshUser = useCallback(async () => {
    try {
      const row = await apiGet<{
        id: string;
        email: string;
        name: string;
        avatar: string;
        bio: string;
        role: string;
      }>("/api/me");
      const u = normalizeUser(row);
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
    } catch (e) {
      if (_isUnauthorizedError(e)) logout();
    }
  }, [logout]);

  /** 先还原 localStorage 快照；若有 JWT 则用 GET /api/me 校验，避免过期 token 假登录（AUTH-01） */
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!getAccessToken() && savedUser) {
      localStorage.removeItem("user");
      setUser(null);
      return;
    }
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }
    void (async () => {
      if (!getAccessToken()) return;
      try {
        const row = await apiGet<{
          id: string;
          email: string;
          name: string;
          avatar: string;
          bio: string;
          role: string;
        }>("/api/me");
        const u = normalizeUser(row);
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
      } catch (e) {
        if (_isUnauthorizedError(e)) logout();
      }
    })();
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
