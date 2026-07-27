"use client";

import type { BookingRow } from "@/lib/mock-data";
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
          <div className="mr-auto cursor-pointer text-[13px] font-semibold text-pms-primary" onClick={onOpenContractTemplate}>
            ✎ Chỉnh sửa mẫu trước khi in
          </div>
          <ButtonGhost onClick={onClose}>Đóng</ButtonGhost>
          <ButtonPrimary>🖨 In hợp đồng</ButtonPrimary>
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
export function EditBookingModal({ booking, onClose }: { booking: BookingRow; onClose: () => void }) {
  return (
    <Modal
      title={`Sửa hợp đồng ${booking.id}`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Lưu thay đổi</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Phòng</label>
          <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">
            {booking.room} <span>⌄</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Nhận phòng</label>
            <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">{booking.checkin} 📅</div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Trả phòng</label>
            <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">{booking.checkout} 📅</div>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Lý do điều chỉnh</label>
          <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">VD: Khách yêu cầu đổi ngày trả phòng...</div>
        </div>
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
