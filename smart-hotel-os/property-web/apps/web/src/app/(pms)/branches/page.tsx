"use client";

import { useState } from "react";
import Link from "next/link";
import { branches } from "@/lib/mock-data";
import { AddBranchModal } from "@/components/branches/AddBranchModal";

// Trang "Danh sách cơ sở" — pixel-perfect theo khối `isBranches` (dòng 1481-1551 bản
// gốc): bảng cơ sở + menu ⋯ (Sửa → điều hướng sang /basic, Xóa) + modal Thêm cơ sở mới.
export default function BranchesPage() {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="m-0 text-[18px] font-bold text-pms-primary">Danh sách cơ sở</h1>
          <div
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAdd(true)}
          >
            + Thêm mới
          </div>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["STT", "Tên khu vực", "Tỉnh/TP", "Tên tòa", "Số tầng", "Số phòng", "Trạng thái", "Action"].map((h) => (
                <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id}>
                <td className="border-b border-pms-divider px-2 py-3">{b.id}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.area}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.province}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.building}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.floors}</td>
                <td className="border-b border-pms-divider px-2 py-3">{b.rooms}</td>
                <td className="border-b border-pms-divider px-2 py-3 font-semibold" style={{ color: b.statusColor }}>
                  {b.status}
                </td>
                <td className="relative border-b border-pms-divider px-2 py-3">
                  <div
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg"
                    onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                  >
                    ⋯
                  </div>
                  {openMenu === b.id && (
                    <div className="absolute right-2 top-8 z-10 min-w-[110px] rounded-[10px] border border-pms-border bg-white shadow-popover">
                      <Link href="/basic" className="block px-3.5 py-2.5 text-[13px]">
                        Sửa
                      </Link>
                      <div className="border-t border-pms-divider px-3.5 py-2.5 text-[13px] text-pms-danger">Xóa</div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center justify-between text-[13px] text-pms-muted">
          <span>Hiển thị 4 cơ sở 4/4</span>
          <div className="flex items-center gap-1.5">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-pms-border">1</div>
          </div>
        </div>
      </div>

      {showAdd && <AddBranchModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
