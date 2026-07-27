"use client";

import { useMemo, useState } from "react";
import { buildGanttGroups, buildMonthBookingBars, monthBookingCards } from "@/lib/mock-data";
import { QuickBookingModal, type QuickBookingPrefill } from "./QuickBookingModal";

const DOW_NAMES = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function labelOf(d: Date) {
  return `${DOW_NAMES[d.getDay()]}-Ngày ${String(d.getDate()).padStart(2, "0")}`;
}

// Tab "Lịch đặt phòng" (Gantt) — pixel-perfect theo khối `isDashCalendar`
// (dòng 165-300 trong bản gốc): thanh công cụ, biểu đồ lượt đặt trong tháng,
// bảng Gantt theo loại phòng (nhóm gập/mở) với kéo-chọn ngày trống để đặt nhanh.
export function DashboardCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCol, setSelectedCol] = useState(1);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<{ roomCode: string; start: number; end: number } | null>(null);
  const [quickBooking, setQuickBooking] = useState<QuickBookingPrefill | null>(null);

  const groups = useMemo(() => buildGanttGroups(), []);
  const activeDay = new Date().getDate();
  const bars = useMemo(() => buildMonthBookingBars(activeDay), [activeDay]);

  const base = new Date(2026, 2, 4 + weekOffset * 7);
  const dates = Array.from({ length: 7 }, (_, i) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));
  const monthLabel = `Tháng ${dates[0].getMonth() + 1} - ${dates[0].getFullYear()}`;

  function endDrag() {
    if (!drag) return;
    const lo = Math.min(drag.start, drag.end);
    const hi = Math.max(drag.start, drag.end);
    setQuickBooking({ room: drag.roomCode, checkinISO: isoOf(dates[lo]), checkoutISO: isoOf(dates[hi]) });
    setDrag(null);
  }

  return (
    <div className="rounded-xl bg-white px-5 pb-5 pt-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-lg border border-pms-border px-3 py-2 text-[13px] text-pms-muted-2">
          Tìm kiếm <span className="ml-auto text-pms-muted">🔍</span>
        </div>
        <div
          className="cursor-pointer whitespace-nowrap rounded-lg border border-pms-border px-4 py-2 text-[13px] font-semibold"
          onClick={() => {
            setWeekOffset(0);
            setSelectedCol(1);
          }}
        >
          Hôm nay
        </div>
        <div className="flex items-center gap-2.5 whitespace-nowrap rounded-lg border border-pms-border px-3.5 py-2">
          <span className="cursor-pointer font-bold text-pms-muted" onClick={() => setWeekOffset((v) => v - 1)}>
            ‹
          </span>
          <span className="text-[13px] font-semibold">📅 {monthLabel}</span>
          <span className="cursor-pointer font-bold text-pms-muted" onClick={() => setWeekOffset((v) => v + 1)}>
            ›
          </span>
        </div>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-pms-border text-pms-muted">▤</div>
        <div
          className="cursor-pointer whitespace-nowrap rounded-lg bg-pms-primary px-4 py-2 text-[13px] font-semibold text-white"
          onClick={() => setQuickBooking({})}
        >
          + Đặt phòng nhanh
        </div>
      </div>

      <div className="mb-3.5 flex gap-2.5">
        <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-pms-border px-3.5 py-2 text-[13px]">
          Tất cả loại phòng <span className="text-pms-muted">⌄</span>
        </div>
        <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-pms-border px-3.5 py-2 text-[13px]">
          Tất cả khu/tầng <span className="text-pms-muted">⌄</span>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-pms-bg px-5 py-4">
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className="m-0 text-[14px] font-semibold">Lịch đặt phòng trong tháng</h3>
          <span className="text-[12px] text-pms-muted">Tháng 7/2026</span>
        </div>
        <p className="m-0 mb-3 text-[11.5px] text-pms-muted">
          Biểu đồ: số lượt đặt phòng mới ghi nhận theo từng ngày trong tháng (đơn vị: lượt đặt/ngày). Rê chuột vào cột để xem chi tiết ngày.
        </p>
        <div className="mb-[18px] grid grid-cols-5 gap-3">
          {monthBookingCards.map((m) => (
            <div key={m.label} className="rounded-[10px] bg-white p-3">
              <span className="text-[11px] text-pms-muted">{m.label}</span>
              <b className="mt-1.5 block text-[18px]" style={{ color: m.color }}>
                {m.value}
              </b>
            </div>
          ))}
        </div>
        <div className="flex h-[110px] items-end gap-1">
          {bars.map((bar) => (
            <div key={bar.d} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5" title={`Ngày ${bar.d}: ${bar.count} lượt đặt`}>
              <span className="text-[9px] font-semibold text-pms-muted">{bar.count}</span>
              <div
                className="w-full rounded-t-[3px]"
                style={{ height: `${Math.max(6, bar.count) * 5}%`, background: bar.active ? "#284AB1" : "#fff" }}
              />
              <span className="text-[9px] text-pms-muted-2">{bar.d}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-pms-border">
        <div className="grid grid-cols-[200px_repeat(7,1fr)]">
          <div className="border-b border-r border-pms-border px-3 py-2.5" />
          {dates.map((d, i) => (
            <div
              key={i}
              className="cursor-pointer border-b border-r border-pms-border px-2 py-2.5 text-center text-[12.5px] font-semibold"
              style={{ background: selectedCol === i ? "#EAF6FB" : "#fff" }}
              onClick={() => setSelectedCol(i)}
            >
              {labelOf(d)}
            </div>
          ))}
        </div>

        {groups.map((grp) => {
          const isOpen = !collapsed[grp.name];
          return (
            <div key={grp.name}>
              <div className="grid grid-cols-[200px_repeat(7,1fr)] bg-pms-bg">
                <div
                  className="flex cursor-pointer items-center gap-1.5 border-b border-r border-pms-border px-3 py-2.5 text-[13px] font-semibold"
                  onClick={() => setCollapsed((c) => ({ ...c, [grp.name]: !c[grp.name] }))}
                >
                  <span>{isOpen ? "⌄" : "›"}</span>
                  {grp.name}
                </div>
                {grp.counts.map((c, i) => (
                  <div
                    key={i}
                    className="border-b border-r border-pms-border px-2 py-2.5 text-center text-[12px]"
                    style={{ background: selectedCol === i ? "#EAF6FB" : "#fff" }}
                  >
                    {grp.price} <b>{c}</b>
                  </div>
                ))}
              </div>
              {isOpen &&
                grp.rooms.map((room) => (
                  <div key={room.code} className="grid grid-cols-[200px_1fr]">
                    <div className="border-b border-r border-pms-border px-3 py-2.5 text-[12.5px]">{room.code}</div>
                    <div className="relative grid min-h-[34px] grid-cols-7 border-b border-pms-border" onMouseUp={endDrag} onMouseLeave={() => drag && endDrag()}>
                      {Array.from({ length: 7 }, (_, c) => {
                        const selected =
                          drag && drag.roomCode === room.code && c >= Math.min(drag.start, drag.end) && c <= Math.max(drag.start, drag.end);
                        return (
                          <div
                            key={c}
                            style={{ gridColumn: `${c + 1} / span 1`, background: selected ? "#EAF6FB" : "transparent", cursor: "cell" }}
                            onMouseDown={() => setDrag({ roomCode: room.code, start: c, end: c })}
                            onMouseEnter={() => drag && drag.roomCode === room.code && setDrag({ ...drag, end: c })}
                          />
                        );
                      })}
                      {room.bookings.map((b, bi) => (
                        <div
                          key={bi}
                          className="m-[3px] mx-0.5 flex cursor-pointer items-center gap-1 overflow-hidden whitespace-nowrap rounded px-2 py-1 text-[11.5px] font-semibold text-white"
                          style={{ gridColumn: `${b.startCol + 1} / span ${b.span}`, background: b.color }}
                          title={b.guest}
                        >
                          <span>{b.icon}</span>
                          <u>{b.guest}</u>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {quickBooking && <QuickBookingModal prefill={quickBooking} onClose={() => setQuickBooking(null)} />}
    </div>
  );
}
