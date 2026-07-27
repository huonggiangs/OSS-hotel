"use client";

import { useState } from "react";
import { assets } from "@/lib/mock-data";
import { AddAssetModal } from "@/components/assets/AddAssetModal";

const TH = "border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted";
const TD = "border-b border-pms-divider px-2 py-3";

// Trang "Quản lý tài sản" (mở từ panel Cài đặt) — pixel-perfect theo khối `isAssets`
// (dòng 1383-1479 bản gốc): bảng tài sản theo phòng + modal Thêm tài sản mới.
export default function AssetsPage() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Quản lý tài sản</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Thiết bị &amp; tài sản theo từng phòng</p>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách tài sản</h3>
          <div className="flex items-center gap-2.5">
            <div className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-pms-border px-3.5 py-2 text-[13px] font-semibold text-pms-primary">
              📄 Export
            </div>
            <div className="flex min-w-[180px] items-center gap-2 rounded-lg border border-pms-border px-3 py-2 text-[13px] text-pms-muted-2">
              Tìm kiếm <span className="ml-auto text-pms-muted">🔍</span>
            </div>
            <div
              className="cursor-pointer whitespace-nowrap rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
              onClick={() => setShowAdd(true)}
            >
              + Thêm mới
            </div>
          </div>
        </div>
        <table className="w-full min-w-[1200px] border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr>
              <th className={`${TH} w-7`}>
                <input type="checkbox" />
              </th>
              {["STT", "Tên tài sản", "Mã TS", "Phòng lắp đặt", "Giá trị", "S.lượng", "ĐVT", "Khấu hao (tháng)", "Giá trị KH", "Hình ảnh", "Trạng thái", ""].map(
                (h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.stt}>
                <td className={TD}>
                  <input type="checkbox" />
                </td>
                <td className={`${TD} text-pms-muted`}>{a.stt}</td>
                <td className={`${TD} font-semibold`}>{a.name}</td>
                <td className={`${TD} text-pms-muted`}>{a.code}</td>
                <td className={TD}>{a.room}</td>
                <td className={TD}>{a.value}</td>
                <td className={TD}>{a.qty}</td>
                <td className={TD}>{a.unit}</td>
                <td className={TD}>{a.depMonths}</td>
                <td className={TD}>{a.depValue}</td>
                <td className={TD}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-pms-primary text-[14px] text-white">🖼</div>
                </td>
                <td className={TD} style={{ fontWeight: 600, color: a.fg }}>
                  {a.status}
                </td>
                <td className={`${TD} cursor-pointer text-center text-pms-muted`}>⋯</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-5 flex justify-center">
          <div className="cursor-pointer rounded-[10px] bg-pms-primary px-10 py-[11px] text-[13.5px] font-semibold text-white">Update</div>
        </div>
      </div>

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
