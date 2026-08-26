"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoomFilterPanels, type RoomFilters } from "@/components/rooms/RoomFilterPanels";
import { RoomGrid } from "@/components/rooms/RoomGrid";
import { QuickCheckinModal } from "@/components/rooms/QuickCheckinModal";
import { StayManageModal } from "@/components/rooms/StayManageModal";
import { HousekeepingSentModal } from "@/components/rooms/HousekeepingSentModal";
import { api, isApiError } from "@/lib/api-client";
import { buildRoomBreakdown, ROOM_STATUS_BY_API, ROOM_STATUS_KEYS, ROOM_STATUS_INFO, type ApiRoomStatus, type RoomCard, type RoomStatusKey } from "@/lib/room-status";

interface ApiRoom {
  id: string;
  number: string;
  floor: string;
  zone: string;
  status: ApiRoomStatus;
  power_on: boolean;
  note: string | null;
  room_type_name: string;
  room_type_price: string;
  active_booking_id: string | null;
  active_guest_name: string | null;
  active_checkin_date: string | null;
  active_booking_total_price: string | null;
  active_booking_deposit: string | null;
}

function formatVnd(amount: string | number) {
  return `${Number(amount).toLocaleString("vi-VN")}đ`;
}
function stayDuration(checkinDate: string | null) {
  if (!checkinDate) return undefined;
  const elapsed = Math.max(1, Math.floor((Date.now() - new Date(`${checkinDate.slice(0, 10)}T00:00:00`).getTime()) / 86_400_000) + 1);
  return { hours: elapsed * 24, label: `${elapsed} ngày` };
}
function mapRoom(room: ApiRoom): RoomCard {
  const statusKey = ROOM_STATUS_BY_API[room.status];
  const info = ROOM_STATUS_INFO[statusKey];
  const stay = stayDuration(room.active_checkin_date);
  return {
    id: room.id,
    n: room.number,
    floor: room.floor,
    zone: room.zone,
    type: room.room_type_name,
    price: formatVnd(room.room_type_price),
    priceAmount: Number(room.room_type_price),
    statusKey,
    status: info.label,
    color: info.color,
    note: room.note ?? "",
    powerUsage: room.power_on ? "Đang bật điện" : "",
    occupants: 0,
    powered: room.power_on,
    guest: room.active_guest_name ?? undefined,
    stayLabel: stay?.label,
    stayHours: stay?.hours,
    activeBookingId: room.active_booking_id ?? undefined,
    activeBookingTotal: room.active_booking_total_price === null ? undefined : Number(room.active_booking_total_price),
    activeBookingDeposit: room.active_booking_deposit === null ? undefined : Number(room.active_booking_deposit),
  };
}

function isRoomStatus(value: string | null): value is RoomStatusKey {
  return value !== null && ROOM_STATUS_KEYS.includes(value as RoomStatusKey);
}

export default function RoomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<RoomCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RoomFilters>({ zone: "all", floor: "all", type: "all", status: "all" });
  const [quickCheckinRoom, setQuickCheckinRoom] = useState<RoomCard | null>(null);
  const [stayManageRoom, setStayManageRoom] = useState<RoomCard | null>(null);
  const [housekeepingRoom, setHousekeepingRoom] = useState<RoomCard | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await api.get<{ items: ApiRoom[] }>("/api/v1/rooms");
      setRooms(response.items.map(mapRoom));
      setError(null);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được danh sách phòng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 30_000);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    const floor = searchParams.get("floor");
    setFilters((current) => ({ ...current, status: isRoomStatus(status) ? status : "all", floor: floor ?? "all" }));
  }, [searchParams]);

  const breakdown = useMemo(() => buildRoomBreakdown(rooms), [rooms]);
  const filteredRooms = rooms.filter((room) =>
    (filters.floor === "all" || room.floor === filters.floor) &&
    (filters.zone === "all" || room.zone === filters.zone) &&
    (filters.type === "all" || room.type === filters.type) &&
    (filters.status === "all" || room.statusKey === filters.status),
  );

  function changeFilters(next: RoomFilters) {
    setFilters(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next.status === "all") params.delete("status"); else params.set("status", next.status);
    const query = params.toString();
    router.replace(query ? `/rooms?${query}` : "/rooms", { scroll: false });
  }
  function handleRoomClick(room: RoomCard) {
    if (room.statusKey === "occupied") setStayManageRoom(room);
    else if (room.statusKey === "dirty") setHousekeepingRoom(room);
    else if (room.statusKey === "vacant") setQuickCheckinRoom(room);
  }
  async function handleTogglePower(roomId: string) {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;
    const nextPower = !room.powered;
    setRooms((items) => items.map((item) => item.id === roomId ? { ...item, powered: nextPower, powerUsage: nextPower ? "Đang bật điện" : "" } : item));
    try {
      await api.patch(`/api/v1/rooms/${roomId}/power`, { powerOn: nextPower });
    } catch (err) {
      setRooms((items) => items.map((item) => item.id === roomId ? { ...item, powered: room.powered, powerUsage: room.powerUsage } : item));
      setError(isApiError(err) ? err.message : "Không thể cập nhật nguồn điện phòng.");
    }
  }

  if (loading && rooms.length === 0) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu phòng...</div>;
  if (error && rooms.length === 0) return <div className="rounded-xl bg-white p-6 text-[13px] text-pms-danger shadow-card">{error} <button type="button" className="font-semibold text-pms-primary" onClick={load}>Thử lại</button></div>;

  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
      <RoomFilterPanels zoneLegend={breakdown.zoneLegend} floorLegend={breakdown.floorLegend} statusLegend={breakdown.statusLegend} typeLegend={breakdown.typeLegend} roomTotal={breakdown.total} filters={filters} onChange={changeFilters} />
      <div className="mb-5 grid grid-cols-4 gap-4"><Kpi label="Công suất phòng" value={breakdown.occupancyRate} color="#284AB1" /><Kpi label="Tổng số phòng" value={String(breakdown.total)} /><Kpi label="Chờ dọn phòng" value={String(breakdown.dirtyCount)} color="#B1B5C3" /><Kpi label="Đang bảo trì" value={String(breakdown.maintenanceCount)} color="#FAB505" /></div>
      <RoomGrid rooms={filteredRooms} onTogglePower={handleTogglePower} onRoomClick={handleRoomClick} />
      {quickCheckinRoom && <QuickCheckinModal room={quickCheckinRoom} onClose={() => setQuickCheckinRoom(null)} onChanged={load} />}
      {stayManageRoom && <StayManageModal room={stayManageRoom} onClose={() => setStayManageRoom(null)} onChanged={load} />}
      {housekeepingRoom && <HousekeepingSentModal room={housekeepingRoom} onClose={() => setHousekeepingRoom(null)} onChanged={load} />}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div className="rounded-xl bg-white p-4 shadow-card"><span className="text-[11px] text-pms-muted">{label}</span><b className="mt-1.5 block text-[22px]" style={{ color }}>{value}</b></div>;
}
