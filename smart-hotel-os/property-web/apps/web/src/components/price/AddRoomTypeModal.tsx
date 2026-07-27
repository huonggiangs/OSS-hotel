"use client";

import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

// Modal "Thêm loại phòng" — pixel-perfect theo khối `showAddRoomType` (dòng 981-1010).
export function AddRoomTypeModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Thêm loại phòng" onClose={onClose} width={640} footer={<>
      <ButtonGhost onClick={onClose}>Cancel</ButtonGhost>
      <ButtonPrimary onClick={onClose}>Save</ButtonPrimary>
    </>}>
      <div className="flex flex-col gap-4 px-6 py-5">
        <Field label="Loại phòng" required placeholder="Tên loại phòng" />
        <div className="grid grid-cols-2 gap-4">
          <FieldSelect label="Tầng và phòng" required placeholder="Chọn tầng" />
          <Stepper label="Số lượng phòng" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Stepper label="Số lượng giường lớn" />
          <Stepper label="Số lượng giường nhỏ" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Stepper label="Sức chứa tối đa (Người lớn)" />
          <Stepper label="Sức chứa tối đa (Trẻ em)" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Giá cơ bản" required placeholder="0đ" />
          <FieldSelect label="Cách tính giá" required placeholder="Chọn cách tính giá" />
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, required, placeholder }: { label: string; required?: boolean; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">
        {label} {required && <span className="text-pms-danger">*</span>}
      </label>
      <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">{placeholder}</div>
    </div>
  );
}
function FieldSelect({ label, required, placeholder }: { label: string; required?: boolean; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">
        {label} {required && <span className="text-pms-danger">*</span>}
      </label>
      <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
        {placeholder} <span>⌄</span>
      </div>
    </div>
  );
}
function Stepper({ label, required }: { label: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">
        {label} {required && <span className="text-pms-danger">*</span>}
      </label>
      <div className="flex items-center justify-between rounded-lg border border-pms-border px-3 py-2">
        <span className="cursor-pointer text-[13px]">−</span>
        <span className="text-[13px]">0</span>
        <span className="cursor-pointer text-[13px]">+</span>
      </div>
    </div>
  );
}
