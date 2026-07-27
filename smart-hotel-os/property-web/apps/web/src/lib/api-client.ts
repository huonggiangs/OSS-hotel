"use client";

// Lớp gọi API tối thiểu cho Property Web — tương tự convention
// `webadmin/apps/web/src/lib/api.ts` (fetch thuần, gắn JWT vào header Authorization
// từ localStorage), đổi tên key lưu token để không đụng với token của webadmin
// khi cả hai app chạy song song trên cùng trình duyệt.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";
const TOKEN_KEY = "property_web_token";

export class ApiClientError extends Error {
  errorCode: string;
  status: number;
  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

export function isApiError(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let body: { error_code?: string; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      // response không có body JSON hợp lệ — giữ giá trị mặc định
    }
    throw new ApiClientError(res.status, body.error_code ?? "UNKNOWN_ERROR", body.message ?? "Đã có lỗi xảy ra.");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
};
