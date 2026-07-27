"use client";

import { Modal, ButtonGhost, ButtonPrimary, FieldBox } from "@/components/ui/Modal";

// Modal "Thêm cơ sở mới" — pixel-perfect theo khối `showAddBranch` (dòng 1529-1550
// bản gốc). Toàn bộ trường là placeholder tĩnh đúng bản gốc (không bind state thật).
export function AddBranchModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Thêm cơ sở mới"
      onClose={onClose}
      width={720}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Thêm cơ sở</ButtonPrimary>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Tên khu vực</label>
          <FieldBox placeholder>Input</FieldBox>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Tỉnh/ Thành Phố</label>
          <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Select dropdown <span>⌄</span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Phường/ Xã</label>
          <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Select dropdown <span>⌄</span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Địa chỉ chi tiết</label>
          <FieldBox placeholder>Input</FieldBox>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Tên tòa</label>
          <FieldBox placeholder>Input</FieldBox>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Số tầng</label>
          <FieldBox placeholder>Input</FieldBox>
        </div>
      </div>
    </Modal>
  );
}
