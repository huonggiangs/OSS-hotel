"use client";

import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

// Modal "Cấu hình Google Maps" — pixel-perfect theo khối `showMapsConfig` (dòng
// 2283-2307 bản gốc). Trường thông tin để tĩnh (placeholder) đúng như bản gốc.
export function MapsConfigModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Cấu hình Google Maps"
      onClose={onClose}
      width={520}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Lưu &amp; đồng bộ lên Google Maps</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="m-0 text-[12px] text-pms-muted">
          Gắn vị trí, hình ảnh và giới thiệu cơ sở để khách dễ dàng tìm đường và nhận diện trên Google Maps.
        </p>
        <div>
          <label className="mb-1.5 block text-[12px]">Vị trí trên bản đồ</label>
          <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Chọn toạ độ / tìm địa chỉ <span>📍</span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Giới thiệu cơ sở lưu trú</label>
          <div className="min-h-[60px] rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Mô tả ngắn về cơ sở, tiện ích nổi bật...
          </div>
        </div>
        <label className="block cursor-pointer rounded-[10px] border border-dashed border-pms-muted-2 p-4 text-center text-[13px] text-pms-muted">
          📷 Tải lên hình ảnh cơ sở (mặt tiền, phòng, tiện ích)
          <input type="file" accept="image/*" multiple className="hidden" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div className="aspect-square rounded-lg bg-pms-divider" />
          <div className="aspect-square rounded-lg bg-pms-divider" />
          <div className="aspect-square rounded-lg bg-pms-divider" />
        </div>
      </div>
    </Modal>
  );
}
