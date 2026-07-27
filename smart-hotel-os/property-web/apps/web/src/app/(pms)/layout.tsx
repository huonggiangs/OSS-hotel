import { PmsShell } from "@/components/layout/PmsShell";
import { RequireAuth } from "@/components/auth/RequireAuth";

// Toàn bộ route group (pms) bắt buộc đăng nhập — RequireAuth redirect /login nếu
// chưa có JWT hợp lệ (xem components/auth/RequireAuth.tsx).
export default function PmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PmsShell>{children}</PmsShell>
    </RequireAuth>
  );
}
