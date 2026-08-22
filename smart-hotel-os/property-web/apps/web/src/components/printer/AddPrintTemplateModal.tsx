"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

export interface PrintTemplate {
  id: string;
  doc: string;
  template: string;
  size: string;
  linked: boolean;
}

export const PAPER_SIZE_OPTIONS = ["K80 (80mm)", "K58 (58mm)", "A4", "A5"];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `tpl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Modal "Thêm/Sửa mẫu in" — form thật: loại chứng từ (text), tên mẫu (text),
// khổ giấy (select dùng chung PAPER_SIZE_OPTIONS), đang dùng (checkbox).
export function AddPrintTemplateModal({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (item: PrintTemplate) => void;
  initial?: PrintTemplate;
}) {
  const [doc, setDoc] = useState(initial?.doc ?? "");
  const [template, setTemplate] = useState(initial?.template ?? "");
  const [size, setSize] = useState(initial?.size ?? PAPER_SIZE_OPTIONS[0]);
  const [linked, setLinked] = useState(initial?.linked ?? true);

  function handleSave() {
    if (!doc.trim() || !template.trim()) return;
    onSave({ id: initial?.id ?? newId(), doc: doc.trim(), template: template.trim(), size, linked });
  }

  return (
    <Modal
      title={initial ? "Sửa mẫu in" : "Thêm mẫu in"}
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
          <label className="mb-1.5 block text-[12px]">Loại chứng từ</label>
          <input
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            placeholder="VD: Hoá đơn thanh toán"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Tên mẫu in</label>
          <input
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
            placeholder="VD: Mẫu hoá đơn K80 chuẩn"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Khổ giấy</label>
          <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]">
            {PAPER_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={linked} onChange={(e) => setLinked(e.target.checked)} />
          Đang dùng (áp dụng mẫu này cho chứng từ)
        </label>
      </div>
    </Modal>
  );
}
