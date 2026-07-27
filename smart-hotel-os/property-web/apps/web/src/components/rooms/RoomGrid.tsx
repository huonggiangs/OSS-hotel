"use client";

import type { RoomCard } from "@/lib/mock-data";

// Lưới thẻ phòng — pixel-perfect theo khối `filteredRooms` (dòng 700-729 trong bản
// gốc): mỗi thẻ có màu theo trạng thái, ghi chú/khách đang ở, công tắc nguồn điện
// (bật/tắt tại chỗ — tương ứng lệnh IoT bật/tắt điện phòng theo RULES.md, ở đây chỉ
// đổi state UI cục bộ, chưa gọi API thiết bị thật).
export function RoomGrid({
  rooms,
  powerOverrides,
  onTogglePower,
  onRoomClick,
}: {
  rooms: RoomCard[];
  powerOverrides: Record<number, boolean>;
  onTogglePower: (roomNum: number) => void;
  onRoomClick: (room: RoomCard) => void;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-card">
      <div className="grid grid-cols-6 gap-3">
        {rooms.map((r) => {
          const powered = powerOverrides[r.n] ?? r.powered;
          return (
            <div key={r.n} className="flex cursor-pointer flex-col overflow-hidden rounded-[10px] border border-pms-border" onClick={() => onRoomClick(r)}>
              <div className="flex items-center justify-between px-2.5 py-2 text-white" style={{ background: r.color }}>
                <b className="text-[14px]">{r.n}</b>
                <span className="text-[10px]">Tầng {r.floor}</span>
              </div>
              <div className="flex flex-col gap-[3px] px-2.5 py-2">
                <span className="text-[10.5px] text-pms-muted-2">{r.zone}</span>
                <span className="text-[11px] text-pms-muted">
                  {r.type} · {r.price}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: r.color }}>
                  {r.status}
                </span>
                {r.note && (
                  <span className="mt-0.5 rounded-md bg-pms-divider px-1.5 py-0.5 text-[10.5px] text-pms-text">📝 {r.note}</span>
                )}
                {r.occupants > 0 && (
                  <span className="flex items-center gap-1 text-[10.5px] text-pms-muted">👤 {r.occupants} khách</span>
                )}
                <div className="mt-0.5 flex items-center gap-1.5">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePower(r.n);
                    }}
                    className="relative h-[15px] w-[26px] flex-shrink-0 cursor-pointer rounded-full"
                    style={{ background: powered ? "#00A651" : "#E6E8EC" }}
                  >
                    <div
                      className="absolute top-0.5 h-[11px] w-[11px] rounded-full bg-white transition-[left]"
                      style={{ left: powered ? "13px" : "2px" }}
                    />
                  </div>
                  {powered && r.powerUsage && <span className="text-[10px] text-pms-muted-2">{r.powerUsage}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-[18px] flex flex-wrap gap-5 text-[12px] text-pms-muted">
        <Legend color="#284AB1" label="Đang ở" />
        <Legend color="#00C853" label="Trống, sạch" />
        <Legend color="#B1B5C3" label="Chờ dọn phòng" />
        <Legend color="#FAB505" label="Bảo trì" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-[9px] w-[9px] rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
