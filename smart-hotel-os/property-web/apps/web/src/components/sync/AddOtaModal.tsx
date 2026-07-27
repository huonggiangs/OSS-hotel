"use client";

import { Modal, ButtonGhost, ButtonPrimary, FieldBox } from "@/components/ui/Modal";

// Modal "Thêm kênh OTA mới" — pixel-perfect theo khối `showAddOta` (dòng 1926-1939
// bản gốc). Toàn bộ trường tĩnh đúng bản gốc.
export function AddOtaModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Thêm kênh OTA mới"
      onClose={onClose}
      width={420}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Lưu</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Tên kênh OTA</label>
          <FieldBox placeholder>VD: Booking.com, Agoda, Traveloka...</FieldBox>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">API Key / Mã kết nối</label>
          <FieldBox placeholder>Nhập mã kết nối</FieldBox>
        </div>
      </div>
    </Modal>
  );
}
