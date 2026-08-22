"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

export interface TaxItem {
  id: string;
  name: string;
  rate: string;
  applyTo: string;
  visibleToGuest: boolean;
}

const APPLY_TO_OPTIONS = ["Toàn bộ hoá đơn", "Tiền phòng"];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `tax-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Modal "Thêm/Sửa loại thuế/phí" — form thật (name/rate/applyTo/visibleToGuest),
// dùng chung cho cả tạo mới và chỉnh sửa qua prop `initial` (cùng khuôn mẫu với
// AddRoomTypeModal ở trang Phòng và giá).
export function AddTaxModal({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (item: TaxItem) => void;
  initial?: TaxItem;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [rate, setRate] = useState(initial?.rate ?? "");
  const [applyTo, setApplyTo] = useState(initial?.applyTo ?? APPLY_TO_OPTIONS[0]);
  const [visibleToGuest, setVisibleToGuest] = useState(initial?.visibleToGuest ?? true);

  function handleSave() {
    if (!name.trim() || !rate.trim()) return;
    onSave({
      id: initial?.id ?? newId(),
      name: name.trim(),
      rate: rate.trim(),
      applyTo,
      visibleToGuest,
    });
  }

  return (
    <Modal
      title={initial ? "Sửa loại thuế/phí" : "Thêm loại thuế/phí"}
      onClose={onClose}
      width={420}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={handleSave}>Lưu</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[12px]">Tên loại thuế/phí</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            placeholder="VD: Thuế GTGT, Phí dịch vụ..."
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Mức thu</label>
          <input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            placeholder="VD: 8% hoặc 20.000đ/đêm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Áp dụng cho</label>
          <select
            value={applyTo}
            onChange={(e) => setApplyTo(e.target.value)}
            className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]"
          >
            {APPLY_TO_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-[12px]">Mục đích</label>
          <label className="mb-2.5 flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={visibleToGuest} onChange={() => setVisibleToGuest(true)} />
            Tính vào hoá đơn khách hàng
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={!visibleToGuest} onChange={() => setVisibleToGuest(false)} />
            Chỉ hạch toán nội bộ (không hiển thị cho khách)
          </label>
        </div>
      </div>
    </Modal>
  );
}
