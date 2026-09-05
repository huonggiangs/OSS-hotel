"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { customerSegmentColors, type CustomerRow } from "@/lib/mock-data";

const SEGMENTS = ["Mới", "Khách quen", "VIP"] as const;

interface BookingDetail {
  id: string;
  code: string;
  room_number: string | null;
  room_type_name: string | null;
  channel: string;
  status: string;
  checkin_date: string;
  checkout_date: string;
  deposit?: string;
  arrival_confirmation_status?: "PENDING" | "WILL_ARRIVE" | "NO_SHOW";
  no_show_reason?: string | null;
  deposit_resolution?: "REFUND" | "RETAIN" | "PENDING" | null;
  created_at: string;
}

const BOOKING_STATUS: Record<string, string> = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", NO_SHOW: "Không đến", CHECKED_IN: "Đang ở", CHECKED_OUT: "Đã trả phòng", CANCELLED: "Đã hủy" };
const BOOKING_CHANNEL: Record<string, string> = { DIRECT: "Trực tiếp", BOOKING_COM: "Booking.com", AGODA: "Agoda", AIRBNB: "Airbnb", TRAVELOKA: "Traveloka", OTHER: "Khác" };

// Modal chi tiết khách hàng — pixel-perfect theo khối `showCustomerDetail` (dòng
// 2055-2108 bản gốc): 4 ô số liệu, dropdown đổi phân khúc, lịch sử giao dịch, dịch vụ
// đã dùng, thói quen/sở thích, ghi chú.
export function CustomerDetailModal({
  customer,
  onClose,
  onChangeSegment,
  onBookingAction,
}: {
  customer: CustomerRow;
  onClose: () => void;
  onChangeSegment: (segment: CustomerRow["segment"]) => void;
  onBookingAction?: (bookingId: string, action: "arrive" | "no-show", reason?: string, resolution?: "REFUND" | "RETAIN" | "PENDING") => Promise<void>;
}) {
  const segColor = customerSegmentColors[customer.segment];
  const bookingDetails = (customer as CustomerRow & { bookingDetails?: BookingDetail[] }).bookingDetails ?? [];

  return (
    <Modal
      title={
        <div>
          <b className="text-[16px]">{customer.name}</b>
          <p className="m-0 mt-1 text-[12.5px] text-pms-muted">
            {customer.phone} · {customer.email}
          </p>
        </div>
      }
      onClose={onClose}
      width={640}
    >
      <div className="flex flex-col gap-[18px] px-6 py-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={customer.bookings} label="Số lần đặt" />
          <Stat value={customer.rebookings} label="Đặt lại" />
          <Stat value={customer.careAfterStay} label="CSKH sau lưu trú" />
          <Stat value={customer.spent} label="Tổng chi tiêu" small />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-pms-muted">Phân loại khách hàng:</span>
          <span
            className="rounded-full px-3 py-[5px] text-[12px] font-semibold"
            style={{ background: segColor.bg, color: segColor.fg }}
          >
            {customer.segment}
          </span>
          <select
            value={customer.segment}
            onChange={(e) => onChangeSegment(e.target.value as CustomerRow["segment"])}
            className="rounded-lg border border-pms-border px-2.5 py-[5px] text-[12px] text-pms-text"
          >
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <b className="text-[13.5px]">Lịch đặt phòng &amp; xác nhận khách</b>
          <div className="mt-2 space-y-2">
            {bookingDetails.length === 0 && <p className="m-0 text-[12.5px] text-pms-muted">Chưa có đặt phòng liên kết.</p>}
            {bookingDetails.map((booking) => <BookingCard key={booking.id} booking={booking} onBookingAction={onBookingAction} />)}
          </div>
        </div>

        <div>
          <b className="text-[13.5px]">Lịch sử giao dịch</b>
          <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[420px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Ngày", "Nội dung", "Số tiền"].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customer.transactions.map((t, i) => (
                <tr key={i}>
                  <td className="border-b border-pms-divider px-2 py-2 text-pms-muted">{t.date}</td>
                  <td className="border-b border-pms-divider px-2 py-2">{t.desc}</td>
                  <td className="border-b border-pms-divider px-2 py-2 font-semibold">{t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        <div>
          <b className="text-[13.5px]">Dịch vụ đã dùng</b>
          <div className="mt-2 flex flex-wrap gap-2">
            {customer.servicesUsed.length === 0 && <span className="text-[12.5px] text-pms-muted">Chưa sử dụng dịch vụ nào</span>}
            {customer.servicesUsed.map((s) => (
              <span key={s} className="rounded-full bg-pms-primary-soft px-3 py-[5px] text-[12px] font-semibold text-pms-primary">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div>
          <b className="text-[13.5px]">Thói quen &amp; sở thích</b>
          <p className="m-0 mt-1.5 text-[12.5px] text-pms-text">{customer.preferences}</p>
        </div>

        <div>
          <b className="text-[13.5px]">Ghi chú</b>
          <p className="m-0 mt-1.5 text-[12.5px] text-pms-text">{customer.note || "—"}</p>
        </div>
      </div>
    </Modal>
  );
}

function BookingCard({ booking, onBookingAction }: { booking: BookingDetail; onBookingAction?: (bookingId: string, action: "arrive" | "no-show", reason?: string, resolution?: "REFUND" | "RETAIN" | "PENDING") => Promise<void> }) {
  const [showNoShow, setShowNoShow] = useState(false);
  const [reason, setReason] = useState(booking.no_show_reason ?? "");
  const [resolution, setResolution] = useState<"REFUND" | "RETAIN" | "PENDING">(booking.deposit_resolution ?? "PENDING");
  const canConfirm = ["PENDING", "CONFIRMED"].includes(booking.status) && booking.arrival_confirmation_status !== "NO_SHOW";
  const fmt = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN"); };
  return <div className="rounded-lg border border-pms-divider p-3 text-[12px]">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><b>{booking.code}</b><span className="ml-2 text-pms-muted">Đặt ngày {fmt(booking.created_at)}</span></div><span className="rounded-full bg-pms-divider px-2 py-1 font-semibold">{BOOKING_STATUS[booking.status] ?? booking.status}</span></div>
    <p className="m-0 mt-1 text-pms-muted">Đến {fmt(booking.checkin_date)} → rời {fmt(booking.checkout_date)} · {booking.room_number ? `${booking.room_number} · ${booking.room_type_name ?? ""}` : "Chưa gán phòng"} · {BOOKING_CHANNEL[booking.channel] ?? booking.channel}</p>
    {booking.no_show_reason && <p className="m-0 mt-1 text-pms-danger">Lý do không đến: {booking.no_show_reason}</p>}
    {booking.deposit && Number(booking.deposit) > 0 ? <p className="m-0 mt-1 text-pms-muted">Tiền cọc: {Number(booking.deposit).toLocaleString("vi-VN")}đ{booking.deposit_resolution ? ` · ${booking.deposit_resolution === "REFUND" ? "Hoàn cọc" : booking.deposit_resolution === "RETAIN" ? "Giữ cọc" : "Chờ quyết định"}` : ""}</p> : null}
    {canConfirm && onBookingAction && <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => void onBookingAction(booking.id, "arrive")} className="rounded-md bg-pms-primary px-2.5 py-1.5 font-semibold text-white">Xác nhận sẽ đến</button><button type="button" onClick={() => setShowNoShow((value) => !value)} className="rounded-md border border-pms-danger px-2.5 py-1.5 font-semibold text-pms-danger">Không đến</button></div>}
    {showNoShow && onBookingAction && <div className="mt-2 space-y-2 rounded-md bg-pms-divider/60 p-2"><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do khách không đến (bắt buộc)" className="min-h-[58px] w-full rounded-md border border-pms-border bg-white px-2 py-1.5 text-[12px]" /><select value={resolution} onChange={(e) => setResolution(e.target.value as typeof resolution)} className="w-full rounded-md border border-pms-border bg-white px-2 py-1.5 text-[12px]"><option value="PENDING">Chờ duyệt hoàn/giữ cọc</option><option value="REFUND">Hoàn tiền cọc</option><option value="RETAIN">Giữ tiền cọc</option></select><button type="button" disabled={reason.trim().length < 3} onClick={() => void onBookingAction(booking.id, "no-show", reason.trim(), resolution)} className="rounded-md bg-pms-danger px-2.5 py-1.5 font-semibold text-white disabled:opacity-50">Lưu lý do &amp; xử lý cọc</button></div>}
  </div>;
}

function Stat({ value, label, small }: { value: string | number; label: string; small?: boolean }) {
  return (
    <div className="rounded-[10px] bg-pms-divider p-3 text-center">
      <div className={small ? "text-[15px] font-bold" : "text-[18px] font-bold"}>{value}</div>
      <div className="text-[11px] text-pms-muted">{label}</div>
    </div>
  );
}
