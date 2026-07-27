"use client";

import { useState } from "react";
import { roomTypesFull, roomsFull } from "@/lib/mock-data";
import { AddRoomTypeModal } from "@/components/price/AddRoomTypeModal";
import { AddRoomModal } from "@/components/price/AddRoomModal";

// Trang "Phòng và giá" (mở từ panel Cài đặt) — pixel-perfect theo khối `isPrice`
// (dòng 866-1049 trong bản gốc): bảng Danh sách loại phòng + bảng Danh sách phòng,
// mỗi dòng có menu hành động (Sửa/Xóa), 2 modal Thêm loại phòng / Thêm phòng.
export default function PricePage() {
  const [showAddRoomType, setShowAddRoomType] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="text-[18px]">←</span>
        <h1 className="m-0 text-[20px] font-bold">ANIO Riverside Hotel</h1>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 text-[16px] font-bold">Danh sách loại phòng</h3>
        <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white" onClick={() => setShowAddRoomType(true)}>
          + Thêm
        </div>
      </div>
      <div className="mb-7 overflow-x-auto rounded-xl bg-white px-5 py-4 shadow-card">
        <table className="w-full min-w-[900px] border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr>
              {["STT", "Loại phòng", "Số phòng", "Giường", "S.chứa", "Diện tích", "Giá cơ bản", "Tính tiền", "Giảm giá", "Trạng thái", "Action"].map((h) => (
                <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roomTypesFull.map((rt) => {
              const key = "rt" + rt.stt;
              return (
                <tr key={key}>
                  <td className="border-b border-pms-divider px-2 py-3">{rt.stt}</td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{rt.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{rt.count}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    🛏 {rt.bedsBig}　🛏 {rt.bedsSmall}
                  </td>
                  <td className="border-b border-pms-divider px-2 py-3">{rt.capacity}</td>
                  <td className="border-b border-pms-divider px-2 py-3">📐 {rt.area}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{rt.basePrice}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{rt.method}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{rt.discount}</td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold" style={{ color: rt.statusColor }}>
                    {rt.status}
                  </td>
                  <td className="relative border-b border-pms-divider px-2 py-3">
                    <RowMenu id={key} open={openMenu === key} onToggle={() => setOpenMenu(openMenu === key ? null : key)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 text-[16px] font-bold">Danh sách phòng</h3>
        <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white" onClick={() => setShowAddRoom(true)}>
          + Thêm
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white px-5 py-4 shadow-card">
        <table className="w-full min-w-[1100px] border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr>
              {["Phòng", "Loại phòng", "Mã phòng", "Tầng", "Bữa ăn", "S.chứa", "Giá 1 đêm", "Tính tiền", "QR Code", "Sync", "Trạng thái", "Action"].map((h) => (
                <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roomsFull.map((r) => {
              const key = "r" + r.room;
              return (
                <tr key={key}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{r.room}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.type}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.code}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.floor}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.meal}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.capacity}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.price}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.method}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-primary">▦</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <div className="relative h-5 w-9 rounded-full bg-pms-border">
                      <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
                    </div>
                  </td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold" style={{ color: r.statusColor }}>
                    {r.status}
                  </td>
                  <td className="relative border-b border-pms-divider px-2 py-3">
                    <RowMenu id={key} open={openMenu === key} onToggle={() => setOpenMenu(openMenu === key ? null : key)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination />
      </div>

      {showAddRoomType && <AddRoomTypeModal onClose={() => setShowAddRoomType(false)} />}
      {showAddRoom && <AddRoomModal onClose={() => setShowAddRoom(false)} />}
    </div>
  );
}

function RowMenu({ open, onToggle }: { id: string; open: boolean; onToggle: () => void }) {
  return (
    <>
      <div className="cursor-pointer px-2 py-1" onClick={onToggle}>
        ⋯
      </div>
      {open && (
        <div className="absolute right-2 top-8 z-50 w-[130px] rounded-[10px] bg-white shadow-popover">
          <div className="cursor-pointer px-3.5 py-2.5 text-[13px]" onClick={onToggle}>
            ✎ Sửa
          </div>
          <div className="cursor-pointer px-3.5 py-2.5 text-[13px] text-pms-danger" onClick={onToggle}>
            🗑 Xóa
          </div>
        </div>
      )}
    </>
  );
}

function Pagination() {
  return (
    <div className="mt-4 flex items-center justify-between text-[13px] text-pms-muted">
      <span>Hiển thị 15 cơ sở 15/50</span>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-pms-border">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
