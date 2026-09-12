"use client";

import { useEffect, useState } from "react";
import type { BookingRow } from "@/lib/mock-data";
import { api, isApiError } from "@/lib/api-client";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { StatusPill } from "@/components/ui/StatusPill";

// Modal "Xem hợp đồng" — pixel-perfect theo khối `showViewBooking` (dòng 532-551).
export function ViewBookingModal({ booking, onClose, onOpenContractTemplate }: { booking: BookingRow; onClose: () => void; onOpenContractTemplate: () => void }) {
  return (
    <Modal
      title={`Hợp đồng ${booking.id}`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button type="button" className="mr-auto border-0 bg-transparent p-0 text-[13px] font-semibold text-pms-primary" onClick={onOpenContractTemplate}>
            ✎ Chỉnh sửa mẫu trước khi in
          </button>
          <ButtonGhost onClick={onClose}>Đóng</ButtonGhost>
          <ButtonPrimary onClick={() => window.print()}>🖨 In hợp đồng</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-2.5 px-6 py-5 text-[13px]">
        <Row label="Khách hàng" value={booking.guest} />
        <Row label="Phòng" value={booking.room} />
        <Row label="Nhận phòng" value={booking.checkin} />
        <Row label="Trả phòng" value={booking.checkout} />
        <Row label="Kênh" value={booking.channel} />
        <div className="flex justify-between">
          <span className="text-pms-muted">Trạng thái</span>
          <StatusPill bg={booking.bg} fg={booking.fg}>
            {booking.status}
          </StatusPill>
        </div>
      </div>
    </Modal>
  );
}

// Modal "Sửa hợp đồng" — pixel-perfect theo khối `showEditBooking` (dòng 553-571).
interface RoomOption { id: string; number: string; room_type_name?: string | null }

export function EditBookingModal({ booking, onClose, onSave }: { booking: BookingRow; onClose: () => void; onSave: (booking: BookingRow, changes: { roomId: string; checkinDate: string; checkoutDate: string; notes: string }) => Promise<void> }) {
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomId, setRoomId] = useState(booking.roomId ?? "");
  const [checkinDate, setCheckinDate] = useState(booking.rawCheckinDate ?? "");
  const [checkoutDate, setCheckoutDate] = useState(booking.rawCheckoutDate ?? "");
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.get<{ items: RoomOption[] }>("/api/v1/rooms").then((res) => setRooms(res.items)).catch(() => setError("Không tải được danh sách phòng."));
  }, []);

  async function submit() {
    if (!roomId || !checkinDate || !checkoutDate) return setError("Vui lòng chọn phòng và ngày lưu trú.");
    if (checkoutDate <= checkinDate) return setError("Ngày trả phòng phải sau ngày nhận phòng.");
    setSaving(true); setError(null);
    try { await onSave(booking, { roomId, checkinDate, checkoutDate, notes }); }
    catch (err) { setError(isApiError(err) ? err.message : err instanceof Error ? err.message : "Không cập nhật được hợp đồng."); setSaving(false); }
  }
  return (
    <Modal
      title={`Sửa hợp đồng ${booking.id}`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <ButtonGhost onClick={onClose} disabled={saving}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={() => void submit()} disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Phòng</label>
          <select value={roomId} onChange={(event) => setRoomId(event.target.value)} className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]">
            <option value="">— Chọn phòng —</option>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.number}{room.room_type_name ? ` · ${room.room_type_name}` : ""}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Nhận phòng</label>
            <input type="date" value={checkinDate} onChange={(event) => setCheckinDate(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Trả phòng</label>
            <input type="date" value={checkoutDate} onChange={(event) => setCheckoutDate(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Lý do điều chỉnh</label>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="VD: Khách yêu cầu đổi ngày trả phòng..." className="w-full resize-y rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
        </div>
        {error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12px] text-pms-danger">{error}</p>}
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-pms-muted">{label}</span>
      <b>{value}</b>
    </div>
  );
}
