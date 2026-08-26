"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { api, isApiError } from "@/lib/api-client";
import type { RoomCard } from "@/lib/room-status";

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function StayManageModal({ room, onClose, onChanged }: { room: RoomCard; onClose: () => void; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balance = Math.max(0, (room.activeBookingTotal ?? 0) - (room.activeBookingDeposit ?? 0));

  async function checkout() {
    if (!room.activeBookingId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/v1/bookings/${room.activeBookingId}/checkout`);
      onChanged();
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không thể trả phòng.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Quản lý lưu trú — Phòng ${room.n}`} onClose={onClose} width={540} footer={<ButtonGhost onClick={onClose}>Đóng</ButtonGhost>}>
      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="rounded-lg bg-pms-primary-soft px-3 py-2 text-[13px] text-pms-text">Khách: <b>{room.guest ?? "Chưa gắn khách"}</b>{room.stayLabel ? ` · Đã ở ${room.stayLabel}` : ""}</div>
        <div className="rounded-lg border border-pms-divider p-3.5"><div className="mb-2 flex justify-between text-[12.5px]"><span className="text-pms-muted">Tổng tiền hợp đồng</span><b>{money(room.activeBookingTotal ?? 0)}</b></div><div className="mb-2 flex justify-between text-[12.5px]"><span className="text-pms-muted">Đặt cọc</span><b className="text-pms-success">− {money(room.activeBookingDeposit ?? 0)}</b></div><div className="flex justify-between border-t border-pms-border pt-2 text-[13.5px]"><span className="font-semibold">Còn phải thu</span><b className="text-pms-danger">{money(balance)}</b></div></div>
        {!room.activeBookingId ? <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">Không tìm thấy hợp đồng đang lưu trú của phòng này. Không thể trả phòng tự động.</p> : confirming ? <><p className="m-0 text-[13px] text-pms-muted">Xác nhận trả phòng sẽ chuyển phòng sang “Chờ dọn phòng” và tắt nguồn điện.</p>{error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12.5px] text-pms-danger">{error}</p>}<div className="flex gap-2"><button type="button" className="flex-1 rounded-lg border border-pms-border py-2.5 text-[13px] font-semibold" onClick={() => setConfirming(false)}>Quay lại</button><ButtonPrimary onClick={checkout}>{saving ? "Đang trả phòng..." : "Xác nhận trả phòng"}</ButtonPrimary></div></> : <ButtonPrimary onClick={() => setConfirming(true)}>Trả phòng ngay</ButtonPrimary>}
      </div>
    </Modal>
  );
}
