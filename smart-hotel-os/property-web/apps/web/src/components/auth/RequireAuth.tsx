"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Bọc toàn bộ route group (pms) — chưa đăng nhập (chưa có JWT hợp lệ) thì
// redirect thẳng sang /login, đúng yêu cầu vá lỗ hổng "ai mở link cũng vào
// thẳng được". Cùng pattern với webadmin/apps/web/src/app/(dashboard)/layout.tsx.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-pms-muted">Đang tải...</div>
    );
  }
  if (!user) return null;

  return <>{children}</>;
}
