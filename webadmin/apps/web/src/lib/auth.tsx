"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "./api";

export type Role = "SUPER_ADMIN" | "OPS_SUPPORT" | "SALES_MANAGER" | "ACCOUNTANT" | "SUPPLY_CHAIN" | "RELEASE_MANAGER";

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("hq_console_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<CurrentUser>("/api/v1/auth/me")
      .then(setUser)
      .catch(() => {
        window.localStorage.removeItem("hq_console_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<{ access_token: string; user: CurrentUser }>("/api/v1/auth/login", {
        email,
        password,
      });
      window.localStorage.setItem("hq_console_token", result.access_token);
      setUser(result.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem("hq_console_token");
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
