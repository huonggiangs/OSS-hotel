"use client";

import { useState } from "react";
import { roles } from "@/lib/mock-data";
import { RolePopupModal } from "@/components/users/RolePopupModal";

// Trang "Người dùng & phân quyền" (mở từ panel Cài đặt) — pixel-perfect theo khối
// `isUsers` (dòng 1289-1313 bản gốc): bảng vai trò + modal Thêm/Sửa quyền.
export default function UsersPage() {
  const [popup, setPopup] = useState<{ open: boolean; roleName: string | null }>({ open: false, roleName: null });

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Người dùng &amp; phân quyền</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">5 vai trò · 18 tài khoản</p>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách vai trò</h3>
          <div
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setPopup({ open: true, roleName: null })}
          >
            + Thêm vai trò
          </div>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Vai trò", "Số người dùng", "Phạm vi quyền", ""].map((h) => (
                <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.name}>
                <td className="border-b border-pms-divider px-2 py-3 font-semibold">{r.name}</td>
                <td className="border-b border-pms-divider px-2 py-3">{r.count}</td>
                <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{r.scope}</td>
                <td
                  className="cursor-pointer border-b border-pms-divider px-2 py-3 font-semibold text-pms-primary"
                  onClick={() => setPopup({ open: true, roleName: r.name })}
                >
                  Sửa quyền
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popup.open && <RolePopupModal roleName={popup.roleName} onClose={() => setPopup({ open: false, roleName: null })} />}
    </div>
  );
}
