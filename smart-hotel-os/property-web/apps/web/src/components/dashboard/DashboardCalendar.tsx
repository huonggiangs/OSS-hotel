"use client";

import { useEffect, useMemo, useState } from "react";
import { api, isApiError } from "@/lib/api-client";
import { QuickBookingModal, type QuickBookingPrefill } from "./QuickBookingModal";

interface CalendarRoom {
  id: string;
  number: string;
  floor: string;
  zone: string;
  status: string;
  room_type_name: string;
  room_type_price: string;
}
interface CalendarBooking {
  room_id: string;
  room_number: string;
  room_type_name: string;
  guest_name: string | null;
  checkin_date: string;
  checkout_date: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
}
interface GanttResponse {
  items: CalendarBooking[];
  rooms: CalendarRoom[];
}
interface GanttBar {
  guest: string;
  startCol: number;
  span: number;
  color: string;
  status: CalendarBooking["status"];
}
interface GanttRoom {
  room: CalendarRoom;
  bookings: GanttBar[];
}
interface GanttGroup {
  name: string;
  price: string;
  counts: number[];
  rooms: GanttRoom[];
}

const DOW_NAMES = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const BOOKING_COLORS: Record<CalendarBooking["status"], string> = {
  PENDING: "#FAB505",
  CONFIRMED: "#284AB1",
  CHECKED_IN: "#00A651",
  CHECKED_OUT: "#B1B5C3",
  CANCELLED: "#CC2F42",
};

function isoOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dateOf(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}
function dayDiff(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
function labelOf(date: Date) {
  return `${DOW_NAMES[date.getDay()]} - ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function formatVnd(value: string) {
  return `${Number(value).toLocaleString("vi-VN")}đ`;
}

function buildGroups(rooms: CalendarRoom[], bookings: CalendarBooking[], dates: Date[]): GanttGroup[] {
  const start = dates[0];
  const endExclusive = new Date(dates[6]);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const byType = new Map<string, CalendarRoom[]>();
  rooms.forEach((room) => byType.set(room.room_type_name, [...(byType.get(room.room_type_name) ?? []), room]));

  return Array.from(byType.entries()).map(([name, groupRooms]) => {
    const group = groupRooms.map((room) => {
      const bars = bookings
        .filter((booking) => booking.room_id === room.id)
        .map((booking): GanttBar | null => {
          const bookingStart = dateOf(booking.checkin_date);
          const bookingEnd = dateOf(booking.checkout_date);
          if (bookingEnd <= start || bookingStart >= endExclusive) return null;
          const visibleStart = bookingStart < start ? start : bookingStart;
          const visibleEnd = bookingEnd > endExclusive ? endExclusive : bookingEnd;
          return {
            guest: booking.guest_name ?? "Khách chưa khai báo",
            startCol: Math.max(0, dayDiff(start, visibleStart)),
            span: Math.max(1, dayDiff(visibleStart, visibleEnd)),
            color: BOOKING_COLORS[booking.status],
            status: booking.status,
          };
        })
        .filter((item): item is GanttBar => item !== null);
      return { room, bookings: bars };
    });
    const counts = dates.map((date, column) => group.reduce((sum, room) => sum + Number(room.bookings.some((booking) => booking.startCol <= column && booking.startCol + booking.span > column)), 0));
    return { name, price: formatVnd(groupRooms[0]?.room_type_price ?? "0"), counts, rooms: group };
  });
}

export function DashboardCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCol, setSelectedCol] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<{ roomId: string; start: number; end: number } | null>(null);
  const [quickBooking, setQuickBooking] = useState<QuickBookingPrefill | null>(null);
  const [data, setData] = useState<GanttResponse>({ items: [], rooms: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const next = await api.get<GanttResponse>("/api/v1/dashboard/gantt");
      setData(next);
      setError(null);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được lịch đặt phòng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const base = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setDate(now.getDate() + weekOffset * 7);
    return now;
  }, [weekOffset]);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + index)), [base]);
  const filteredRooms = useMemo(() => data.rooms.filter((room) => {
    const haystack = `${room.number} ${room.floor} ${room.zone} ${room.room_type_name}`.toLocaleLowerCase("vi");
    return (typeFilter === "all" || room.room_type_name === typeFilter) &&
      (locationFilter === "all" || `${room.floor}|${room.zone}` === locationFilter) &&
      (!search.trim() || haystack.includes(search.trim().toLocaleLowerCase("vi")));
  }), [data.rooms, locationFilter, search, typeFilter]);
  const groups = useMemo(() => buildGroups(filteredRooms, data.items, dates), [data.items, dates, filteredRooms]);
  const roomTypes = useMemo(() => Array.from(new Set(data.rooms.map((room) => room.room_type_name))).sort((a, b) => a.localeCompare(b, "vi")), [data.rooms]);
  const locations = useMemo(() => Array.from(new Set(data.rooms.map((room) => `${room.floor}|${room.zone}`))).sort((a, b) => a.localeCompare(b, "vi")), [data.rooms]);
  const monthBookings = useMemo(() => data.items.filter((booking) => {
    const checkin = dateOf(booking.checkin_date);
    return checkin.getFullYear() === base.getFullYear() && checkin.getMonth() === base.getMonth();
  }), [base, data.items]);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const bars = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(base.getFullYear(), base.getMonth(), day);
    return { day, count: monthBookings.filter((booking) => booking.checkin_date.slice(0, 10) === isoOf(date)).length };
  });
  const maxBar = Math.max(...bars.map((bar) => bar.count), 1);
  const cards = [
    { label: "Tổng lượt đặt", value: monthBookings.length, color: "#284AB1" },
    { label: "Chờ & xác nhận", value: monthBookings.filter((booking) => booking.status === "PENDING" || booking.status === "CONFIRMED").length, color: "#FAB505" },
    { label: "Đang lưu trú", value: monthBookings.filter((booking) => booking.status === "CHECKED_IN").length, color: "#00A651" },
    { label: "Đã trả phòng", value: monthBookings.filter((booking) => booking.status === "CHECKED_OUT").length, color: "#777E90" },
  ];
  const monthLabel = `Tháng ${base.getMonth() + 1}/${base.getFullYear()}`;

  function endDrag() {
    if (!drag) return;
    const lo = Math.min(drag.start, drag.end);
    const hi = Math.max(drag.start, drag.end);
    const checkout = new Date(dates[hi]);
    checkout.setDate(checkout.getDate() + 1);
    setQuickBooking({ roomId: drag.roomId, checkinISO: isoOf(dates[lo]), checkoutISO: isoOf(checkout) });
    setDrag(null);
  }

  return (
    <div className="rounded-xl bg-white px-5 pb-5 pt-4 shadow-card">
      {error && <p className="mb-3 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm phòng, tầng, khu vực" className="min-w-[180px] flex-1 rounded-lg border border-pms-border px-3 py-2 text-[13px] outline-none focus:border-pms-primary" />
        <button type="button" className="whitespace-nowrap rounded-lg border border-pms-border px-4 py-2 text-[13px] font-semibold" onClick={() => { setWeekOffset(0); setSelectedCol(0); }}>Hôm nay</button>
        <div className="flex items-center gap-2.5 whitespace-nowrap rounded-lg border border-pms-border px-3.5 py-2"><button type="button" className="font-bold text-pms-muted" onClick={() => setWeekOffset((value) => value - 1)}>‹</button><span className="text-[13px] font-semibold">📅 {monthLabel}</span><button type="button" className="font-bold text-pms-muted" onClick={() => setWeekOffset((value) => value + 1)}>›</button></div>
        <button type="button" className="whitespace-nowrap rounded-lg bg-pms-primary px-4 py-2 text-[13px] font-semibold text-white" onClick={() => setQuickBooking({})}>+ Đặt phòng nhanh</button>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-lg border border-pms-border px-3.5 py-2 text-[13px]"><option value="all">Tất cả loại phòng</option>{roomTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
        <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="rounded-lg border border-pms-border px-3.5 py-2 text-[13px]"><option value="all">Tất cả khu/tầng</option>{locations.map((location) => { const [floor, zone] = location.split("|"); return <option key={location} value={location}>Tầng {floor} · {zone}</option>; })}</select>
      </div>

      <div className="mb-4 rounded-xl bg-pms-bg px-5 py-4">
        <div className="mb-3.5 flex items-center justify-between"><h3 className="m-0 text-[14px] font-semibold">Lịch nhận phòng trong tháng</h3><span className="text-[12px] text-pms-muted">{monthLabel}</span></div>
        <p className="m-0 mb-3 text-[11.5px] text-pms-muted">Số lượt đặt theo ngày nhận phòng, lấy trực tiếp từ hợp đồng trong hệ thống.</p>
        <div className="mb-[18px] grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-[10px] bg-white p-3"><span className="text-[11px] text-pms-muted">{card.label}</span><b className="mt-1.5 block text-[18px]" style={{ color: card.color }}>{card.value}</b></div>)}</div>
        <div className="flex h-[110px] items-end gap-1">{bars.map((bar) => <div key={bar.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5" title={`Ngày ${bar.day}: ${bar.count} lượt đặt`}><span className="text-[9px] font-semibold text-pms-muted">{bar.count}</span><div className="w-full rounded-t-[3px] bg-pms-primary" style={{ height: `${Math.max(3, (bar.count / maxBar) * 100)}%`, opacity: bar.count ? 1 : 0.15 }} /><span className="text-[9px] text-pms-muted-2">{bar.day}</span></div>)}</div>
      </div>

      {loading ? <div className="py-8 text-center text-[13px] text-pms-muted">Đang tải lịch đặt phòng...</div> : (
        <div className="overflow-x-auto rounded-[10px] border border-pms-border">
          <div className="grid min-w-[780px] grid-cols-[200px_repeat(7,1fr)]"><div className="border-b border-r border-pms-border px-3 py-2.5" />{dates.map((date, index) => <button type="button" key={isoOf(date)} className="border-b border-r border-pms-border px-2 py-2.5 text-center text-[12.5px] font-semibold" style={{ background: selectedCol === index ? "#EAF6FB" : "#fff" }} onClick={() => setSelectedCol(index)}>{labelOf(date)}</button>)}</div>
          {groups.map((group) => {
            const isOpen = !collapsed[group.name];
            return <div key={group.name}>
              <div className="grid min-w-[780px] grid-cols-[200px_repeat(7,1fr)] bg-pms-bg"><button type="button" className="flex items-center gap-1.5 border-b border-r border-pms-border px-3 py-2.5 text-left text-[13px] font-semibold" onClick={() => setCollapsed((value) => ({ ...value, [group.name]: !value[group.name] }))}><span>{isOpen ? "⌄" : "›"}</span>{group.name}</button>{group.counts.map((count, index) => <div key={index} className="border-b border-r border-pms-border px-2 py-2.5 text-center text-[12px]" style={{ background: selectedCol === index ? "#EAF6FB" : "#fff" }}><span className="text-pms-muted">{group.price}</span> <b>{count}</b></div>)}</div>
              {isOpen && group.rooms.map(({ room, bookings }) => <div key={room.id} className="grid min-w-[780px] grid-cols-[200px_1fr]"><div className="border-b border-r border-pms-border px-3 py-2.5 text-[12.5px]">PHÒNG {room.number} · Tầng {room.floor} · {room.zone}</div><div className="relative grid min-h-[34px] grid-cols-7 border-b border-pms-border" onMouseUp={endDrag} onMouseLeave={() => drag && endDrag()}>{Array.from({ length: 7 }, (_, column) => { const selected = drag?.roomId === room.id && column >= Math.min(drag.start, drag.end) && column <= Math.max(drag.start, drag.end); return <div key={column} style={{ gridColumn: `${column + 1} / span 1`, background: selected ? "#EAF6FB" : "transparent", cursor: "cell" }} onMouseDown={() => setDrag({ roomId: room.id, start: column, end: column })} onMouseEnter={() => drag?.roomId === room.id && setDrag({ ...drag, end: column })} />; })}{bookings.map((booking, index) => <div key={`${booking.startCol}-${index}`} className="absolute top-[3px] flex h-[28px] cursor-default items-center gap-1 overflow-hidden whitespace-nowrap rounded px-2 text-[11.5px] font-semibold text-white" style={{ left: `calc(${(booking.startCol / 7) * 100}% + 2px)`, width: `calc(${(booking.span / 7) * 100}% - 4px)`, background: booking.color }} title={`${booking.guest} · ${booking.status}`}><u>{booking.guest}</u></div>)}</div></div>)}
            </div>;
          })}
          {groups.length === 0 && <div className="p-6 text-center text-[13px] text-pms-muted">Không có phòng phù hợp với bộ lọc.</div>}
        </div>
      )}
      {quickBooking !== null && <QuickBookingModal prefill={quickBooking} onClose={() => setQuickBooking(null)} onCreated={load} />}
    </div>
  );
}
