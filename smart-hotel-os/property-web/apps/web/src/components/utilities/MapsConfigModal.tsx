"use client";

import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { useState } from "react";

// Modal "Cấu hình Google Maps" — pixel-perfect theo khối `showMapsConfig` (dòng
// 2283-2307 bản gốc). Trường thông tin để tĩnh (placeholder) đúng như bản gốc.
export function MapsConfigModal({ initial, onClose, onSave }: { initial?: { address?: string; description?: string }; onClose: () => void; onSave: (value: { address: string; description: string }) => Promise<void> | void }) {
  const [address, setAddress] = useState(initial?.address ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <Modal
      title="Cấu hình Google Maps"
      onClose={onClose}
      width={520}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={() => void onSave({ address: address.trim(), description: description.trim() })}>Lưu &amp; cập nhật bản đồ</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="m-0 text-[12px] text-pms-muted">
          Gắn vị trí, hình ảnh và giới thiệu cơ sở để khách dễ dàng tìm đường và nhận diện trên Google Maps.
        </p>
        <div>
          <label className="mb-1.5 block text-[12px]">Vị trí trên bản đồ</label>
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Số nhà, đường, phường/xã, tỉnh/thành" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Giới thiệu cơ sở lưu trú</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Mô tả ngắn về cơ sở, tiện ích nổi bật..." className="w-full resize-y rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
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
