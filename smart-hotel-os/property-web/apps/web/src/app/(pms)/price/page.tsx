"use client";

import { useEffect, useState } from "react";
import { AddRoomTypeModal } from "@/components/price/AddRoomTypeModal";
import { AddRoomModal } from "@/components/price/AddRoomModal";
import { api, isApiError } from "@/lib/api-client";

// Trang "Phòng và giá" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT
// (GET /api/v1/room-types + GET /api/v1/rooms, bảng đã có sẵn từ trước, chỉ
// còn thiếu UI nối vào). Các cột không có trong schema MVP hiện tại (Tính
// tiền/Giảm giá/Mã phòng/Bữa ăn/QR Code/Sync) giữ placeholder tĩnh đúng bản
// gốc (chưa có bảng nguồn tương ứng) — xem PROGRESS.md.
interface ApiRoomType {
  id: string;
  name: string;
  base_price: string;
  capacity: number;
  beds_big: number;
  beds_small: number;
  area_m2: string | null;
  status: "ACTIVE" | "INACTIVE";
}
interface ApiRoom {
  id: string;
  number: string;
  floor: string;
  room_type_id: string;
  room_type_name: string;
  room_type_price: string;
  status: "OCCUPIED" | "VACANT" | "DIRTY" | "MAINTENANCE";
}

function formatVnd(v: string | number) {
  return Number(v).toLocaleString("vi-VN") + "đ";
}
const ROOM_STATUS_LABEL: Record<ApiRoom["status"], { label: string; color: string }> = {
  OCCUPIED: { label: "Đã đặt", color: "#284AB1" },
  VACANT: { label: "Đang mở", color: "#00C853" },
  DIRTY: { label: "Chờ xử lý", color: "#FAB505" },
  MAINTENANCE: { label: "Ngừng hoạt động", color: "#CC2F42" },
};

export default function PricePage() {
  const [roomTypes, setRoomTypes] = useState<ApiRoomType[]>([]);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddRoomType, setShowAddRoomType] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rt, r] = await Promise.all([
        api.get<{ items: ApiRoomType[] }>("/api/v1/room-types"),
        api.get<{ items: ApiRoom[] }>("/api/v1/rooms"),
      ]);
      setRoomTypes(rt.items);
      setRooms(r.items);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được dữ liệu phòng và giá.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;
  if (error)
    return (
      <div className="rounded-xl bg-white p-6 text-[13px] text-pms-danger shadow-card">
        {error} <span className="cursor-pointer font-semibold text-pms-primary" onClick={load}>Thử lại</span>
      </div>
    );

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
            {roomTypes.map((rt, i) => {
              const key = "rt" + rt.id;
              const count = rooms.filter((r) => r.room_type_id === rt.id).length;
              return (
                <tr key={key}>
                  <td className="border-b border-pms-divider px-2 py-3">{i + 1}</td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{rt.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{count}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    🛏 {rt.beds_big}　🛏 {rt.beds_small}
                  </td>
                  <td className="border-b border-pms-divider px-2 py-3">{rt.capacity}</td>
                  <td className="border-b border-pms-divider px-2 py-3">📐 {rt.area_m2 ?? "—"}m2</td>
                  <td className="border-b border-pms-divider px-2 py-3">{formatVnd(rt.base_price)}</td>
                  <td className="border-b border-pms-divider px-2 py-3">Giá ngày</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold" style={{ color: rt.status === "ACTIVE" ? "#00C853" : "#CC2F42" }}>
                    {rt.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </td>
                  <td className="relative border-b border-pms-divider px-2 py-3">
                    <RowMenu id={key} open={openMenu === key} onToggle={() => setOpenMenu(openMenu === key ? null : key)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination count={roomTypes.length} />
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
            {rooms.map((r) => {
              const key = "r" + r.id;
              const st = ROOM_STATUS_LABEL[r.status];
              return (
                <tr key={key}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{r.number}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.room_type_name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
                  <td className="border-b border-pms-divider px-2 py-3">{r.floor}</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
                  <td className="border-b border-pms-divider px-2 py-3">{formatVnd(r.room_type_price)}</td>
                  <td className="border-b border-pms-divider px-2 py-3">Tự động</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-primary">▦</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <div className="relative h-5 w-9 rounded-full bg-pms-border">
                      <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
                    </div>
                  </td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold" style={{ color: st.color }}>
                    {st.label}
                  </td>
                  <td className="relative border-b border-pms-divider px-2 py-3">
                    <RowMenu id={key} open={openMenu === key} onToggle={() => setOpenMenu(openMenu === key ? null : key)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination count={rooms.length} />
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

function Pagination({ count }: { count: number }) {
  return (
    <div className="mt-4 flex items-center justify-between text-[13px] text-pms-muted">
      <span>Hiển thị {count}/{count}</span>
      <div className="flex items-center gap-1.5">
        {[1].map((n) => (
          <div key={n} className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-pms-border">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
