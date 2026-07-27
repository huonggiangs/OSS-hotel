"use client";

import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

// Modal "Thêm ảnh" — pixel-perfect theo khối `showPhotoUpload` (dòng 1315-1333 bản gốc).
export function PhotoUploadModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Thêm ảnh"
      onClose={onClose}
      width={400}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Thêm ảnh</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-3.5 px-6 py-5">
        <label className="block cursor-pointer rounded-[10px] border border-dashed border-pms-muted-2 p-6 text-center text-[13px] text-pms-muted">
          📁 Chọn ảnh từ máy tính
          <input type="file" accept="image/*" className="hidden" />
        </label>
        <div className="flex items-center gap-2.5 text-[12px] text-pms-muted-2">
          <div className="h-px flex-1 bg-pms-border" />
          hoặc
          <div className="h-px flex-1 bg-pms-border" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Dán đường dẫn ảnh (URL)</label>
          <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">https://...</div>
        </div>
      </div>
    </Modal>
  );
}
