"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";

interface ApiRoomOption {
  id: string;
  number: string;
  floor: string;
  zone: string;
  status: string;
  room_type_name: string;
  room_type_price: string;
}
interface BookingRange {
  room_id: string;
  checkin_date: string;
  checkout_date: string;
  status: string;
}

export interface QuickBookingPrefill {
  roomId?: string;
  checkinISO?: string;
  checkoutISO?: string;
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function tomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function nightsBetween(checkin: string, checkout: string) {
  return Math.max(1, Math.round((new Date(`${checkout}T00:00:00`).getTime() - new Date(`${checkin}T00:00:00`).getTime()) / 86_400_000));
}
function formatRoom(room: ApiRoomOption) {
  return `Phòng ${room.number} · Tầng ${room.floor} · ${room.zone} · ${room.room_type_name}`;
}

export function QuickBookingModal({ prefill, onClose, onCreated }: { prefill: QuickBookingPrefill; onClose: () => void; onCreated?: () => void }) {
  const [rooms, setRooms] = useState<ApiRoomOption[]>([]);
  const [bookings, setBookings] = useState<BookingRange[]>([]);
  const [roomIds, setRoomIds] = useState<string[]>(prefill.roomId ? [prefill.roomId] : []);
  const [checkinISO, setCheckinISO] = useState(prefill.checkinISO ?? todayIso());
  const [checkoutISO, setCheckoutISO] = useState(prefill.checkoutISO ?? tomorrowIso());
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ items: ApiRoomOption[] }>("/api/v1/rooms"),
      api.get<{ items: BookingRange[] }>("/api/v1/dashboard/gantt"),
    ])
      .then(([roomResponse, bookingResponse]) => {
        setRooms(roomResponse.items);
        setBookings(bookingResponse.items);
      })
      .catch((err) => setError(isApiError(err) ? err.message : "Không tải được phòng trống."));
  }, []);

  const availableRooms = useMemo(() => rooms.filter((room) => {
    if (room.status !== "VACANT") return false;
    return !bookings.some((booking) => booking.room_id === room.id && ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.status) && booking.checkin_date < checkoutISO && booking.checkout_date > checkinISO);
  }), [bookings, checkinISO, checkoutISO, rooms]);
  const selectedRooms = rooms.filter((room) => roomIds.includes(room.id));

  function toggleRoom(roomId: string) {
    setRoomIds((current) => current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId]);
  }

  async function handleSubmit() {
    setError(null);
    if (!fullName.trim() || roomIds.length === 0 || !checkinISO || !checkoutISO) {
      setError("Vui lòng nhập khách, ngày nhận/trả và ít nhất một phòng.");
      return;
    }
    if (checkoutISO <= checkinISO) {
      setError("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }
    const unavailable = roomIds.some((id) => !availableRooms.some((room) => room.id === id));
    if (unavailable) {
      setError("Một phòng đã được đặt hoặc không còn ở trạng thái trống. Vui lòng chọn lại.");
      return;
    }
    setSubmitting(true);
    try {
      const customer = await api.post<{ id: string }>("/api/v1/customers", { fullName: fullName.trim(), phone: phone || undefined });
      const nights = nightsBetween(checkinISO, checkoutISO);
      await Promise.all(selectedRooms.map((room) => api.post("/api/v1/bookings", {
        customerId: customer.id,
        roomId: room.id,
        channel: "DIRECT",
        status: "PENDING",
        checkinDate: checkinISO,
        checkoutDate: checkoutISO,
        totalPrice: Number(room.room_type_price) * nights,
        notes: notes || undefined,
      })));
      onCreated?.();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không thể tạo đặt phòng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Đặt phòng nhanh từ lịch" onClose={onClose} width={560} footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={handleSubmit}>{submitting ? "Đang tạo..." : "Tạo đặt phòng"}</ButtonPrimary></>}>
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
        <p className="m-0 text-[12px] text-pms-muted">Danh sách phòng và kiểm tra trùng lịch lấy trực tiếp từ cơ sở dữ liệu.</p>
        <div className="grid grid-cols-2 gap-4">
          <DateField label="Nhận phòng" value={checkinISO} onChange={setCheckinISO} />
          <DateField label="Trả phòng" value={checkoutISO} onChange={setCheckoutISO} />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Chọn phòng trống ({roomIds.length} phòng)</label>
          <div className="max-h-[180px] overflow-y-auto rounded-lg border border-pms-border">
            {availableRooms.map((room) => <label key={room.id} className="flex cursor-pointer items-center gap-2 border-b border-pms-divider px-3 py-2.5 text-[12.5px] last:border-0"><input type="checkbox" checked={roomIds.includes(room.id)} onChange={() => toggleRoom(room.id)} /><span>{formatRoom(room)} · {Number(room.room_type_price).toLocaleString("vi-VN")}đ</span></label>)}
            {availableRooms.length === 0 && <p className="m-0 px-3 py-3 text-[12px] text-pms-muted">Không có phòng trống trong khoảng ngày này.</p>}
          </div>
        </div>
        <div className="border-t border-pms-divider pt-3.5"><b className="text-[13.5px]">Thông tin khách đặt trước</b></div>
        <TextField label="Họ và tên / Tên đoàn" value={fullName} onChange={setFullName} placeholder="Nhập họ tên khách hoặc tên đoàn" />
        <TextField label="Số điện thoại" value={phone} onChange={setPhone} placeholder="Số điện thoại" />
        <div><label className="mb-1.5 block text-[12px]">Ghi chú</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Yêu cầu đặc biệt (nếu có)" className="min-h-[70px] w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary" /></div>
      </div>
    </Modal>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><label className="mb-1.5 block text-[12px]">{label}</label><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div>;
}
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div><label className="mb-1.5 block text-[12px]">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary" /></div>;
}
