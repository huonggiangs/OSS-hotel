"use client";

import { currentUser } from "@/lib/mock-data";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

// Modal "Thông tin người dùng" mở từ Topbar — pixel-perfect theo khối showUserProfile
// trong bản gốc: 2 cột (Thông tin cá nhân | Đổi mật khẩu + Đăng nhập gần đây).
export function UserProfileModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Thông tin người dùng"
      onClose={onClose}
      width={760}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Cập nhật</ButtonPrimary>
        </>
      }
    >
      <div className="px-6 py-5">
        <div className="mb-[18px] flex items-center gap-3.5 border-b border-pms-divider pb-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-pms-primary text-[18px] font-semibold text-white">
            {currentUser.initials}
          </div>
          <div>
            <b className="text-[16px]">{currentUser.name}</b>
            <div className="mt-0.5 text-[12px] text-pms-muted">
              {currentUser.role} · {currentUser.property}
            </div>
          </div>
          <span className="ml-auto rounded-full bg-[#E9FBEF] px-3 py-1 text-[11px] font-semibold text-pms-success">Đang hoạt động</span>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-3.5">
            <b className="text-[13.5px]">Thông tin cá nhân</b>
            <Field label="Họ và tên" value={currentUser.name} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" value={currentUser.email} muted />
              <Field label="Số điện thoại" value="090 xxx xx xx" muted />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Chức vụ" value={currentUser.role} muted />
              <Field label="Cơ sở làm việc" value={`${currentUser.property} ⌄`} muted />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngày vào làm" value="01/03/2024" muted />
              <Field label="Vai trò hệ thống" value="Quản lý" muted />
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
