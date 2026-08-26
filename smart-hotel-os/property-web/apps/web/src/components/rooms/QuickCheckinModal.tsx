"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";
import type { RoomCard } from "@/lib/room-status";

function tomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function QuickCheckinModal({ room, onClose, onChanged }: { room: RoomCard; onClose: () => void; onChanged: () => void }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkout, setCheckout] = useState(tomorrowIso());
  const [powerOn, setPowerOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!fullName.trim() || checkout <= todayIso()) {
      setError("Vui lòng nhập họ tên khách và ngày trả phòng hợp lệ.");
      return;
    }
    setSubmitting(true);
    try {
      const customer = await api.post<{ id: string }>("/api/v1/customers", { fullName: fullName.trim(), phone: phone || undefined });
      const booking = await api.post<{ id: string }>("/api/v1/bookings", {
        customerId: customer.id,
        roomId: room.id,
        channel: "DIRECT",
        status: "CONFIRMED",
        checkinDate: todayIso(),
        checkoutDate: checkout,
        totalPrice: room.priceAmount,
      });
      await api.post(`/api/v1/bookings/${booking.id}/checkin`);
      if (!powerOn) await api.patch(`/api/v1/rooms/${room.id}/power`, { powerOn: false });
      onChanged();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không thể nhận phòng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Nhận phòng nhanh — Phòng ${room.n}`} onClose={onClose} width={520} footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={submit}>{submitting ? "Đang nhận phòng..." : "Xác nhận nhận phòng"}</ButtonPrimary></>}>
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}
        <div className="rounded-lg bg-pms-primary-soft px-3 py-2 text-[12.5px] text-pms-primary">{room.type} · {room.price}</div>
        <Field label="Họ và tên khách" value={fullName} onChange={setFullName} placeholder="Nhập họ tên đầy đủ" />
        <Field label="Số điện thoại" value={phone} onChange={setPhone} placeholder="Số điện thoại" />
        <div><label className="mb-1.5 block text-[12px]">Dự kiến trả phòng</label><input type="date" min={tomorrowIso()} value={checkout} onChange={(event) => setCheckout(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></div>
        <div className="flex items-center justify-between gap-3 border-t border-pms-divider pt-3.5"><div><b className="text-[13.5px]">Bật nguồn điện phòng</b><p className="m-0 mt-1 text-[11.5px] text-pms-muted">Đồng bộ với trạng thái nguồn của phòng.</p></div><button type="button" className="relative h-5 w-9 rounded-full" style={{ background: powerOn ? "#284AB1" : "#E6E8EC" }} onClick={() => setPowerOn((value) => !value)}><span className="absolute top-0.5 h-4 w-4 rounded-full bg-white" style={{ left: powerOn ? "18px" : "2px" }} /></button></div>
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div><label className="mb-1.5 block text-[12px]">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] outline-none focus:border-pms-primary" /></div>;
}
