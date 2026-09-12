"use client";

import { useAuth, roleLabel } from "@/lib/auth";
import { Modal, ButtonGhost } from "@/components/ui/Modal";

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const last2 = parts.slice(-2);
  return last2.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

// Chỉ hiển thị dữ liệu tài khoản có thật; không tạo nút cập nhật giả khi chưa có API hồ sơ.
export function UserProfileModal({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Modal
      title="Thông tin người dùng"
      onClose={onClose}
      width={760}
      footer={
        <>
          <ButtonGhost onClick={logout}>Đăng xuất</ButtonGhost>
          <ButtonGhost onClick={onClose}>Đóng</ButtonGhost>
        </>
      }
    >
      <div className="px-6 py-5">
        <div className="mb-[18px] flex items-center gap-3.5 border-b border-pms-divider pb-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-pms-primary text-[18px] font-semibold text-white">
            {initialsOf(user.full_name)}
          </div>
          <div>
            <b className="text-[16px]">{user.full_name}</b>
            <div className="mt-0.5 text-[12px] text-pms-muted">{roleLabel[user.role]}</div>
          </div>
          <span className="ml-auto rounded-full bg-[#E9FBEF] px-3 py-1 text-[11px] font-semibold text-pms-success">Đang hoạt động</span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3.5">
            <b className="text-[13.5px]">Thông tin cá nhân</b>
            <Field label="Họ và tên" value={user.full_name} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Email" value={user.email} muted />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Chức vụ" value={roleLabel[user.role]} muted />
              <Field label="Vai trò hệ thống" value={user.role} muted />
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            <b className="text-[13.5px]">Bảo mật tài khoản</b>
            <p className="m-0 rounded-lg bg-pms-divider p-3 text-[12px] leading-5 text-pms-muted">Mật khẩu không hiển thị trong hồ sơ. Chủ cơ sở hoặc người quản trị có thể đặt lại mật khẩu tại mục Người dùng và phân quyền.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">{label}</label>
      <div className={`rounded-lg border border-pms-border px-3 py-2.5 text-[13px] ${muted ? "text-pms-muted-2" : ""}`}>{value}</div>
    </div>
  );
}
