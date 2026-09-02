"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import type { OwnServiceRow } from "@/lib/mock-data";

export type NewServiceForm = Omit<OwnServiceRow, "id" | "linked">;

export function AddServiceModal({ onClose, onSave }: { onClose: () => void; onSave: (form: NewServiceForm) => Promise<void> | void }) {
  const [form, setForm] = useState<NewServiceForm>({ category: "Dịch vụ khác", name: "", unit: "Lượt", schedule: "Theo yêu cầu", vehicle: "Không cần", price: "0đ", location: "Tại cơ sở" });
  const set = (key: keyof NewServiceForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal title="Thêm dịch vụ của cơ sở" onClose={onClose} width={520} footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={() => form.name.trim() && void onSave(form)}>Lưu dịch vụ</ButtonPrimary></>}>
    <div className="flex flex-col gap-3 px-6 py-5"><p className="m-0 text-[12px] text-pms-muted">Sau khi lưu, chọn “Đã công khai” để lễ tân ghi nhận dịch vụ vào hóa đơn của khách.</p><Field label="Tên dịch vụ *"><input autoFocus value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Ví dụ: Đưa đón sân bay" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></Field><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Nhóm dịch vụ"><input value={form.category} onChange={(event) => set("category", event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></Field><Field label="Đơn vị tính"><input value={form.unit} onChange={(event) => set("unit", event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></Field><Field label="Giá niêm yết"><input value={form.price} onChange={(event) => set("price", event.target.value)} placeholder="300.000đ" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></Field><Field label="Nơi cung cấp"><input value={form.location} onChange={(event) => set("location", event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></Field></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Thời gian"><input value={form.schedule} onChange={(event) => set("schedule", event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></Field><Field label="Phương tiện"><input value={form.vehicle} onChange={(event) => set("vehicle", event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" /></Field></div></div>
  </Modal>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-[12px]">{label}<span className="mt-1 block">{children}</span></label>; }
