"use client";

import { useAuth, roleLabel } from "@/lib/auth";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const last2 = parts.slice(-2);
  return last2.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

// Modal "Thông tin người dùng" mở từ Topbar — pixel-perfect theo khối showUserProfile
// trong bản gốc: 2 cột (Thông tin cá nhân | Đổi mật khẩu + Đăng nhập gần đây). Đã nối
// tên/vai trò thật từ tài khoản đăng nhập (useAuth) thay vì mock currentUser, và bổ
// sung nút "Đăng xuất" ở footer (không có trong bản gốc — hợp lý vì bản gốc không có
// màn đăng nhập nên cũng không cần đăng xuất).
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
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Cập nhật</ButtonPrimary>
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
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-3.5">
            <b className="text-[13.5px]">Thông tin cá nhân</b>
            <Field label="Họ và tên" value={user.full_name} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" value={user.email} muted />
              <Field label="Số điện thoại" value="090 xxx xx xx" muted />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Chức vụ" value={roleLabel[user.role]} muted />
              <Field label="Vai trò hệ thống" value={user.role} muted />
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            <b className="text-[13.5px]">Đổi mật khẩu</b>
            <Field label="Mật khẩu hiện tại" value="••••••••" muted />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mật khẩu mới" value="••••••••" muted />
              <Field label="Xác nhận mật khẩu mới" value="••••••••" muted />
            </div>
            <div className="mt-0.5 border-t border-pms-divider pt-3.5">
              <b className="text-[13.5px]">Đăng nhập gần đây</b>
            </div>
            <div className="flex justify-between text-[12px] text-pms-muted">
              <span>Hôm nay, 08:12</span>
              <span>Chrome · Windows</span>
            </div>
            <div className="flex justify-between text-[12px] text-pms-muted">
              <span>Hôm qua, 21:40</span>
              <span>Safari · iPhone</span>
            </div>
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
