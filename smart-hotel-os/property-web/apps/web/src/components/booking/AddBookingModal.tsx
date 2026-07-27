"use client";

import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

// Modal "Thêm mới hợp đồng" — pixel-perfect theo khối `showAddBooking` (dòng 501-530).
export function AddBookingModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Thêm mới hợp đồng"
      onClose={onClose}
      width={540}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Tạo hợp đồng</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <Field label="Họ và tên khách" placeholder="Nhập họ tên đầy đủ" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Số điện thoại" placeholder="Số điện thoại" />
          <Field label="Số giấy tờ (CCCD/Hộ chiếu)" placeholder="Nhập số giấy tờ" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldSelect label="Loại phòng" placeholder="Chọn loại phòng" />
          <FieldSelect label="Phòng" placeholder="Chọn phòng trống" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldSelect label="Nhận phòng" placeholder="dd/mm/yyyy 📅" />
          <FieldSelect label="Trả phòng" placeholder="dd/mm/yyyy 📅" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldSelect label="Kênh đặt" placeholder="Trực tiếp" />
          <Field label="Tiền cọc" placeholder="0đ" />
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">{label}</label>
      <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">{placeholder}</div>
    </div>
  );
}
function FieldSelect({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">{label}</label>
      <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
        {placeholder} <span>⌄</span>
      </div>
    </div>
  );
}
