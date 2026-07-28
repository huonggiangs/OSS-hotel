"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError, getToken, setToken, clearToken } from "./api-client";

// 4 vai trò tối thiểu cấp cơ sở theo yêu cầu (đối chiếu docs/PERMISSION_MATRIX.md —
// role gốc trong tài liệu dùng tên PROPERTY_MANAGER/FRONT_DESK, ở đây đổi thành
// MANAGER/RECEPTIONIST cho khớp đúng yêu cầu tối thiểu OWNER/MANAGER/RECEPTIONIST/
// HOUSEKEEPING đã nêu — xem PROGRESS.md mục quyết định).
export type Role = "OWNER" | "MANAGER" | "RECEPTIONIST" | "HOUSEKEEPING";

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  property_id: string;
  tenant_id?: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<CurrentUser>("/api/v1/auth/me")
      .then(setUser)
      .catch(() => {
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await api.post<{ access_token: string; user: CurrentUser }>("/api/v1/auth/login", {
        username,
        password,
      });
      setToken(result.access_token);
      setUser(result.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được gọi bên trong <AuthProvider>.");
  return ctx;
}

export function isApiError(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError;
}

export const roleLabel: Record<Role, string> = {
  OWNER: "Chủ sở hữu",
  MANAGER: "Quản lý",
  RECEPTIONIST: "Lễ tân",
  HOUSEKEEPING: "Buồng phòng",
};
