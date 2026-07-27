"use client";

import { useMemo, useState } from "react";
import { buildRooms, buildRoomBreakdown, type RoomCard } from "@/lib/mock-data";
import { RoomFilterPanels, type RoomFilters } from "@/components/rooms/RoomFilterPanels";
import { RoomGrid } from "@/components/rooms/RoomGrid";
import { QuickCheckinModal } from "@/components/rooms/QuickCheckinModal";
import { StayManageModal } from "@/components/rooms/StayManageModal";
import { HousekeepingSentModal } from "@/components/rooms/HousekeepingSentModal";

// Trang "Trạng thái phòng" — pixel-perfect theo khối `isRooms` (dòng 626-864 trong
// bản gốc): 4 panel donut lọc nhanh, 4 thẻ KPI, lưới phòng, và 3 modal theo trạng thái
// phòng (Trống→Nhận phòng nhanh, Đang ở→Quản lý lưu trú, Chờ dọn→đã gửi yêu cầu).
export default function RoomsPage() {
  const allRooms = useMemo(() => buildRooms(), []);
  const breakdown = useMemo(() => buildRoomBreakdown(allRooms), [allRooms]);

  const [filters, setFilters] = useState<RoomFilters>({ zone: "all", floor: "all", type: "all", status: "all" });
  const [powerOverrides, setPowerOverrides] = useState<Record<number, boolean>>({});
  const [quickCheckinRoom, setQuickCheckinRoom] = useState<number | null>(null);
  const [stayManageRoom, setStayManageRoom] = useState<RoomCard | null>(null);
  const [housekeepingRoom, setHousekeepingRoom] = useState<number | null>(null);

  const filteredRooms = allRooms.filter(
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

      <RoomGrid
        rooms={filteredRooms}
        powerOverrides={powerOverrides}
        onTogglePower={(n) => setPowerOverrides((v) => ({ ...v, [n]: !(v[n] ?? allRooms.find((r) => r.n === n)?.powered) }))}
        onRoomClick={handleRoomClick}
      />

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
