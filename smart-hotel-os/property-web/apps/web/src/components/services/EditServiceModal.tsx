"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import type { OwnServiceRow } from "@/lib/mock-data";

export interface EditServiceForm {
  name: string;
  category: string;
  unit: string;
  price: string;
  location: string;
  statusLabel: "Đã xuất bản" | "Chưa xuất bản";
}

// Modal "Sửa dịch vụ" — pixel-perfect theo khối `showEditService` (dòng 2176-2201 bản
// gốc): form thật (setEditServiceField/saveEditService), lưu đè lên đúng dòng dịch vụ
// đang sửa trong bảng "Gói dịch vụ của cơ sở".
export function EditServiceModal({
  service,
  onClose,
  onSave,
}: {
  service: OwnServiceRow & { statusLabel: string };
  onClose: () => void;
  onSave: (form: EditServiceForm) => void;
}) {
  const [form, setForm] = useState<EditServiceForm>({
    name: service.name,
    category: service.category,
    unit: service.unit,
    price: service.price,
    location: service.location,
    statusLabel: service.statusLabel === "Đã xuất bản" ? "Đã xuất bản" : "Chưa xuất bản",
  });

  function setField<K extends keyof EditServiceForm>(field: K, value: EditServiceForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <Modal
      title="Sửa dịch vụ"
      onClose={onClose}
      width={480}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={() => onSave(form)}>Lưu thay đổi</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <Field label="Tên dịch vụ">
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Loại dịch vụ">
            <input value={form.category} onChange={(e) => setField("category", e.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text" />
          </Field>
          <Field label="Đơn vị tính">
            <input value={form.unit} onChange={(e) => setField("unit", e.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text" />
          </Field>
        </div>
        <Field label="Giá">
          <input value={form.price} onChange={(e) => setField("price", e.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text" />
        </Field>
        <Field label="Địa điểm yêu cầu">
          <input value={form.location} onChange={(e) => setField("location", e.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text" />
        </Field>
        <Field label="Trạng thái">
          <select
            value={form.statusLabel}
            onChange={(e) => setField("statusLabel", e.target.value as EditServiceForm["statusLabel"])}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text"
          >
            <option value="Đã xuất bản">Đã xuất bản</option>
            <option value="Chưa xuất bản">Chưa xuất bản</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">{label}</label>
      {children}
    </div>
  );
}
