"use client";

import { FormEvent, useState } from "react";
import { useAuth, isApiError } from "@/lib/auth";

// Trang đăng nhập — KHÔNG có trong bản thiết kế gốc (bundle Hotel PMS.dc.html giả
// định người dùng đã đăng nhập sẵn, mở thẳng vào Dashboard). Đây là quyết định bổ
// sung hợp lý để vá lỗ hổng "ai mở link cũng vào thẳng được" (xem PROGRESS.md mục
// quyết định) — thiết kế mới, tự làm, nhưng dùng đúng token màu/font/bo góc/shadow
// đã khai báo sẵn trong tailwind.config.ts (pms.primary #284AB1, shadow-card...) và
// đúng logo vuông "A" + tên "ANIO PMS" lấy từ Sidebar.tsx, để không bị lạc tông với
// phần còn lại của app.
export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pms-bg px-4">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-card">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-pms-primary text-[17px] font-bold text-white">
            A
          </div>
          <div>
            <b className="block text-[16px] leading-tight">ANIO PMS</b>
            <span className="text-[11.5px] text-pms-muted">Property Web — Quản lý cơ sở</span>
          </div>
        </div>

        <h1 className="mb-1 text-[19px] font-bold">Đăng nhập</h1>
        <p className="mb-6 text-[13px] text-pms-muted">Đăng nhập bằng tài khoản cấp cơ sở để tiếp tục.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-pms-text">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@anio-riverside.local"
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-pms-text">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary"
            />
          </div>

          {error && <p className="rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full rounded-lg bg-pms-primary px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-pms-primary-hover disabled:opacity-60"
          >
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-pms-divider px-3.5 py-3 text-[11.5px] text-pms-muted">
          <b className="mb-1 block text-pms-text">Tài khoản demo (mật khẩu chung: ChangeMe123!)</b>
          owner@anio-riverside.local · OWNER
          <br />
          manager@anio-riverside.local · MANAGER
          <br />
          reception@anio-riverside.local · RECEPTIONIST
          <br />
          housekeeping@anio-riverside.local · HOUSEKEEPING
        </div>
      </div>
    </div>
  );
}
