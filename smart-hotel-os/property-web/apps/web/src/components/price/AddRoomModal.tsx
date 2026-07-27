"use client";

import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

// Modal "Thêm phòng" — pixel-perfect theo khối `showAddRoom` (dòng 1012-1048),
// bao gồm khối gán Device (thiết bị IoT/khoá cửa) theo phòng.
export function AddRoomModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Thêm phòng" onClose={onClose} width={680} footer={<>
      <ButtonGhost onClick={onClose}>Cancel</ButtonGhost>
      <ButtonPrimary onClick={onClose}>Save</ButtonPrimary>
    </>}>
      <div className="flex flex-col gap-4 px-6 py-5">
        <Field label="Tên phòng" required placeholder="Tên loại phòng" />
        <div className="grid grid-cols-2 gap-4">
          <FieldSelect label="Tầng" placeholder="Chọn tầng" />
          <FieldSelect label="Loại phòng" required placeholder="Chọn loại phòng" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Field label="Mã phòng" required placeholder="Mã phòng" />
            <AutoHint />
          </div>
          <div>
            <Field label="QR code" required placeholder="" />
            <AutoHint />
          </div>
        </div>
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-[12px]">
            Device <span className="cursor-pointer font-bold text-pms-primary">+</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <DeviceRow name="SN device A" on />
            <DeviceRow name="Acc device B" on={false} muted />
          </div>
        </div>
        <Field label="Tính tiền" required placeholder="Giá tiền" />
        <div>
          <label className="mb-2 block text-[12px]">Bữa ăn</label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
              <div className="flex-1 rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">&nbsp;</div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
              <div className="flex-1 rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">&nbsp;</div>
            </div>
          </div>
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
function AutoHint() {
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-pms-muted">
      <span className="h-3.5 w-3.5 rounded border-[1.5px] border-pms-muted-2" />
      Hệ thống tự động tạo
    </div>
  );
}
function DeviceRow({ name, on, muted }: { name: string; on: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-3.5 w-3.5 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
      <div className={`flex-1 rounded-lg border border-pms-border px-3 py-2.5 text-[13px] ${muted ? "text-pms-muted-2" : ""}`}>{name}</div>
      <div className="relative h-5 w-9 flex-shrink-0 rounded-full" style={{ background: on ? "#284AB1" : "#E6E8EC" }}>
        <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white" style={{ left: on ? "18px" : "2px" }} />
      </div>
    </div>
  );
}
