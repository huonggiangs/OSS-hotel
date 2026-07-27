"use client";

import { useEffect, useMemo, useState } from "react";
import { roomStatusInfo, buildRoomBreakdown, type RoomCard, type RoomStatusKey } from "@/lib/mock-data";
import { RoomFilterPanels, type RoomFilters } from "@/components/rooms/RoomFilterPanels";
import { RoomGrid } from "@/components/rooms/RoomGrid";
import { QuickCheckinModal } from "@/components/rooms/QuickCheckinModal";
import { StayManageModal } from "@/components/rooms/StayManageModal";
import { HousekeepingSentModal } from "@/components/rooms/HousekeepingSentModal";
import { api, isApiError } from "@/lib/api-client";

// Trang "Trạng thái phòng" — ĐÃ NỐI API THẬT (GET /api/v1/rooms + PATCH
// /api/v1/rooms/:id/power). `RoomFilterPanels`/`RoomGrid`/3 modal giữ NGUYÊN không
// sửa gì (chỉ nhận vào `RoomCard[]`) — chỉ thay nguồn dữ liệu từ `buildRooms()` (mock,
// sinh ngẫu nhiên) sang dữ liệu thật lấy từ DB, ánh xạ (map) 1-1 sang đúng shape
// `RoomCard` mà các component đó đã quen dùng, để không phải viết lại UI.
interface ApiRoom {
  id: string;
  number: string;
  floor: string;
  zone: string;
  status: RoomStatusKeyApi;
  power_on: boolean;
  note: string | null;
  room_type_name: string;
  room_type_price: string;
}
type RoomStatusKeyApi = "OCCUPIED" | "VACANT" | "DIRTY" | "MAINTENANCE";
const STATUS_MAP: Record<RoomStatusKeyApi, RoomStatusKey> = {
  OCCUPIED: "occupied",
  VACANT: "vacant",
  DIRTY: "dirty",
  MAINTENANCE: "maintenance",
};

interface RoomCardWithId extends RoomCard {
  id: string;
}

function formatVnd(amount: string | number): string {
  return Number(amount).toLocaleString("vi-VN") + "đ";
}

function mapRoom(r: ApiRoom): RoomCardWithId {
  const statusKey = STATUS_MAP[r.status];
  const s = roomStatusInfo[statusKey];
  return {
    id: r.id,
    n: Number(r.number),
    floor: r.floor,
    zone: r.zone,
    type: r.room_type_name,
    price: formatVnd(r.room_type_price),
    statusKey,
    status: s.label,
    color: s.color,
    // Ghi chú thật lấy từ DB; MVP hiện chưa JOIN booking đang hiệu lực vào phòng nên
    // với phòng "Đang ở" không có sẵn tên khách/số giờ đã ở — dùng nhãn chung thay vì
    // để trống hẳn (xem PROGRESS.md mục hạn chế đã biết).
    note: r.note ?? "",
    powerUsage: r.power_on ? "Đang bật điện" : "",
    occupants: statusKey === "occupied" ? 1 : 0,
    powered: r.power_on,
    guest: statusKey === "occupied" ? "Khách đang lưu trú" : undefined,
    stayLabel: statusKey === "occupied" ? "—" : undefined,
    stayHours: statusKey === "occupied" ? 24 : undefined,
  };
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomCardWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<RoomFilters>({ zone: "all", floor: "all", type: "all", status: "all" });
  const [quickCheckinRoom, setQuickCheckinRoom] = useState<number | null>(null);
  const [stayManageRoom, setStayManageRoom] = useState<RoomCard | null>(null);
  const [housekeepingRoom, setHousekeepingRoom] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: ApiRoom[] }>("/api/v1/rooms");
      setRooms(res.items.map(mapRoom));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được danh sách phòng.");
    } finally {
      setLoading(false);
    }
  }

  const breakdown = useMemo(() => buildRoomBreakdown(rooms), [rooms]);

  const filteredRooms = rooms.filter(
    (r) =>
      (filters.floor === "all" || r.floor === filters.floor) &&
      (filters.zone === "all" || r.zone === filters.zone) &&
      (filters.type === "all" || r.type === filters.type) &&
      (filters.status === "all" || r.statusKey === filters.status),
  );

  function handleRoomClick(r: RoomCard) {
    if (r.statusKey === "occupied") setStayManageRoom(r);
    else if (r.statusKey === "dirty") setHousekeepingRoom(r.n);
    else if (r.statusKey === "vacant") setQuickCheckinRoom(r.n);
  }

  // Bật/tắt điện — gọi thật PATCH /api/v1/rooms/:id/power, cập nhật lạc quan
  // (optimistic) trên UI rồi hoàn tác nếu API lỗi.
  async function handleTogglePower(roomNum: number) {
    const room = rooms.find((r) => r.n === roomNum);
    if (!room) return;
    const next = !room.powered;
    setRooms((rs) => rs.map((r) => (r.n === roomNum ? { ...r, powered: next, powerUsage: next ? "Đang bật điện" : "" } : r)));
    try {
      await api.patch(`/api/v1/rooms/${room.id}/power`, { powerOn: next });
    } catch {
      setRooms((rs) => rs.map((r) => (r.n === roomNum ? { ...r, powered: !next, powerUsage: !next ? "Đang bật điện" : "" } : r)));
    }
  }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu phòng...</div>;
  if (error)
    return (
      <div className="rounded-xl bg-white p-6 text-[13px] text-pms-danger shadow-card">
        {error}{" "}
        <span className="cursor-pointer font-semibold text-pms-primary" onClick={load}>
          Thử lại
        </span>
      </div>
    );

  return (
    <div>
      <RoomFilterPanels
        zoneLegend={breakdown.zoneLegend}
        floorLegend={breakdown.floorLegend}
        statusLegend={breakdown.statusLegend}
        typeLegend={breakdown.typeLegend}
        roomTotal={breakdown.total}
        filters={filters}
        onChange={setFilters}
      />

      <div className="mb-5 grid grid-cols-4 gap-4">
        <Kpi label="Công suất phòng" value={breakdown.occupancyRate} color="#284AB1" />
        <Kpi label="Tổng số phòng" value={String(breakdown.total)} />
        <Kpi label="Chờ dọn phòng" value={String(breakdown.dirtyCount)} color="#B1B5C3" />
        <Kpi label="Đang bảo trì" value={String(breakdown.maintenanceCount)} color="#FAB505" />
      </div>

      <RoomGrid rooms={filteredRooms} powerOverrides={{}} onTogglePower={handleTogglePower} onRoomClick={handleRoomClick} />

      {quickCheckinRoom !== null && <QuickCheckinModal roomNumber={quickCheckinRoom} onClose={() => setQuickCheckinRoom(null)} />}
      {stayManageRoom && <StayManageModal room={stayManageRoom} onClose={() => setStayManageRoom(null)} />}
      {housekeepingRoom !== null && <HousekeepingSentModal roomNumber={housekeepingRoom} onClose={() => setHousekeepingRoom(null)} />}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-card">
      <span className="text-[11px] text-pms-muted">{label}</span>
      <b className="mt-1.5 block text-[22px]" style={{ color }}>
        {value}
      </b>
    </div>
  );
}
