"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

// Modal "Thêm cơ sở mới" — ĐÃ NỐI API THẬT tối thiểu (POST /api/v1/branches,
// chỉ OWNER được gọi — xem apps/api/src/routes/branches.routes.ts). 2 trường
// còn thiếu bảng nguồn phù hợp (Tỉnh/Thành, Phường/Xã — địa giới hành chính,
// Tên tòa/Số tầng — chưa có cột riêng) giữ placeholder tĩnh đúng bản gốc.
export function AddBranchModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: { name: string; address: string }) => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      onCreate({ name, address });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Thêm cơ sở mới"
      onClose={onClose}
      width={720}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={handleSubmit}>{saving ? "Đang lưu..." : "Thêm cơ sở"}</ButtonPrimary>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Tên khu vực</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            placeholder="Tên cơ sở/khu vực"
          />
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
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            placeholder="Địa chỉ chi tiết"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Tên tòa</label>
          <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">Input</div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Số tầng</label>
          <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">Input</div>
        </div>
      </div>
    </Modal>
  );
}
