"use client";

import { useEffect, useState } from "react";
import type { BookingRow } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddBookingModal } from "@/components/booking/AddBookingModal";
import { ViewBookingModal, EditBookingModal } from "@/components/booking/ViewEditBookingModal";
import { ContractTemplateModal } from "@/components/booking/ContractTemplateModal";
import { api, isApiError } from "@/lib/api-client";

const COLUMNS = ["Mã HĐ", "Khách hàng", "Phòng", "Nhận phòng", "Trả phòng", "Kênh", "Trạng thái", ""];

interface ApiBooking {
  id: string;
  code: string;
  guest_name: string | null;
  room_number: string | null;
  room_type_name: string | null;
  channel: string;
  status: string;
  checkin_date: string;
  checkout_date: string;
}

const CHANNEL_LABEL: Record<string, string> = {
  DIRECT: "Trực tiếp",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
  AIRBNB: "Airbnb",
  TRAVELOKA: "Traveloka",
  OTHER: "Khác",
};

const STATUS_INFO: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: "Chờ xác nhận", bg: "#FFF7E0", fg: "#946200" },
  CONFIRMED: { label: "Đã xác nhận", bg: "#E6F9EE", fg: "#00C853" },
  CHECKED_IN: { label: "Đã nhận phòng", bg: "#EEF1FB", fg: "#284AB1" },
  CHECKED_OUT: { label: "Đã trả phòng", bg: "#F4F5F6", fg: "#777E90" },
  CANCELLED: { label: "Đã huỷ", bg: "#FCEAEC", fg: "#CC2F42" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mapBooking(b: ApiBooking): BookingRow {
  const s = STATUS_INFO[b.status] ?? STATUS_INFO.PENDING;
  return {
    id: b.code,
    guest: b.guest_name ?? "—",
    room: b.room_number ? `${b.room_number} · ${b.room_type_name ?? ""}` : "—",
    checkin: formatDate(b.checkin_date),
    checkout: formatDate(b.checkout_date),
    channel: CHANNEL_LABEL[b.channel] ?? b.channel,
    status: s.label,
    bg: s.bg,
    fg: s.fg,
  };
}

// Trang "Quản lý hợp đồng / đặt phòng" — ĐÃ NỐI API THẬT (GET /api/v1/bookings +
// tạo mới qua AddBookingModal). Dữ liệu API được ánh xạ sang đúng shape `BookingRow`
// mà bảng/modal Xem/Sửa/Mẫu hợp đồng đã dùng sẵn (pixel-perfect không đổi), nên các
// component đó giữ nguyên không sửa.
export default function BookingPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [viewBooking, setViewBooking] = useState<BookingRow | null>(null);
  const [editBooking, setEditBooking] = useState<BookingRow | null>(null);
  const [showContract, setShowContract] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: ApiBooking[] }>("/api/v1/bookings");
      setBookings(res.items.map(mapBooking));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được danh sách hợp đồng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Quản lý hợp đồng / đặt phòng</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">{bookings.length} hợp đồng</p>

      <div className="rounded-xl bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách hợp đồng</h3>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <div className="col-span-2 hidden items-center gap-2 rounded-[10px] bg-pms-divider px-3.5 py-2.5 text-[13px] text-pms-muted sm:flex">Tìm kiếm</div>
            <button type="button"
              className="cursor-pointer whitespace-nowrap rounded-[10px] border border-pms-border px-[18px] py-2.5 text-[13px] font-semibold"
              onClick={() => setShowContract(true)}
            >
              🖨 Mẫu hợp đồng
            </button>
            <button type="button"
              className="cursor-pointer whitespace-nowrap rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
              onClick={() => setShowAdd(true)}
            >
              + Thêm mới
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-6 text-center text-[13px] text-pms-muted">Đang tải...</div>
        ) : error ? (
          <div className="py-6 text-center text-[13px] text-pms-danger">
            {error} <span className="cursor-pointer font-semibold text-pms-primary" onClick={load}>Thử lại</span>
          </div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {bookings.map((b) => <article key={b.id} className="rounded-lg border border-pms-divider p-3"><div className="flex items-start justify-between gap-3"><div><b className="block text-[13px]">{b.guest}</b><span className="text-[11.5px] text-pms-muted">{b.id} · {b.room}</span></div><StatusPill bg={b.bg} fg={b.fg}>{b.status}</StatusPill></div><p className="mt-2 text-[12px] text-pms-muted">{b.checkin} → {b.checkout} · {b.channel}</p><div className="mt-3 flex gap-4 text-[12px]"><button type="button" className="font-semibold text-pms-primary" onClick={() => setViewBooking(b)}>Xem</button><button type="button" className="font-semibold text-pms-muted" onClick={() => setEditBooking(b)}>Sửa</button></div></article>)}{bookings.length === 0 && <p className="py-4 text-center text-[13px] text-pms-muted">Chưa có hợp đồng.</p>}</div>
          <table className="hidden w-full border-collapse text-[13px] md:table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="border-b border-pms-divider px-2 py-3">{b.id}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{b.guest}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{b.room}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{b.checkin}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{b.checkout}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{b.channel}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <StatusPill bg={b.bg} fg={b.fg}>
                      {b.status}
                    </StatusPill>
                  </td>
                  <td className="whitespace-nowrap border-b border-pms-divider px-2 py-3">
                    <span className="cursor-pointer font-semibold text-pms-primary" onClick={() => setViewBooking(b)}>
                      Xem
                    </span>
                    <span className="ml-2.5 cursor-pointer font-semibold text-pms-muted" onClick={() => setEditBooking(b)}>
                      Sửa
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {showAdd && <AddBookingModal onClose={() => setShowAdd(false)} onCreated={load} />}
      {viewBooking && (
        <ViewBookingModal booking={viewBooking} onClose={() => setViewBooking(null)} onOpenContractTemplate={() => setShowContract(true)} />
      )}
      {editBooking && <EditBookingModal booking={editBooking} onClose={() => setEditBooking(null)} />}
      {showContract && (
        <ContractTemplateModal guestName={(viewBooking || editBooking)?.guest ?? ""} onClose={() => setShowContract(false)} />
      )}
    </div>
  );
}
