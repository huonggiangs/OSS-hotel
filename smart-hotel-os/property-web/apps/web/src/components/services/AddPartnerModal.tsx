"use client";

import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { useState } from "react";

export interface NewPartnerForm {
  name: string;
  category: string;
  distance: string;
  commission: string;
  address: string;
  phone: string;
  email: string;
  contactName: string;
  imageDataUrls: string[];
}

export function AddPartnerModal({ onClose, onSave, initial }: { onClose: () => void; onSave: (value: NewPartnerForm) => Promise<void> | void; initial?: Partial<NewPartnerForm> }) {
  const [form, setForm] = useState<NewPartnerForm>({ name: "", category: "Ẩm thực", distance: "", commission: "", address: "", phone: "", email: "", contactName: "", imageDataUrls: [], ...initial });
  const set = (key: "name" | "category" | "distance" | "commission" | "address" | "phone" | "email" | "contactName", value: string) => setForm((current) => ({ ...current, [key]: value }));
  function readImages(files: FileList | null) {
    if (!files) return;
    Promise.all(Array.from(files).slice(0, 5).map((file) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); })))
      .then((imageDataUrls) => setForm((current) => ({ ...current, imageDataUrls })))
      .catch(() => undefined);
  }
  return (
    <Modal
      title={initial ? "Sửa đối tác" : "Thêm đối tác mới"}
      onClose={onClose}
      width={520}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={() => form.name.trim() && void onSave(form)}>{initial ? "Lưu thay đổi" : "Thêm đối tác"}</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <label className="block cursor-pointer rounded-[10px] border border-dashed border-pms-muted-2 p-4 text-center text-[13px] text-pms-muted">
          📷 Tải lên hình ảnh đối tác (logo, không gian, dịch vụ)
          <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => readImages(event.target.files)} />
        </label>
        {form.imageDataUrls.length > 0 && <p className="m-0 text-[11px] text-pms-success">Đã chọn {form.imageDataUrls.length} ảnh (tối đa 5).</p>}
        <div>
          <label className="mb-1.5 block text-[12px]">Tên đối tác</label>
          <input autoFocus value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="VD: Spa Hương Sen" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Loại hình dịch vụ</label>
          <select value={form.category} onChange={(event) => set("category", event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"><option>Ẩm thực</option><option>Spa &amp; chăm sóc sức khỏe</option><option>Tour &amp; trải nghiệm</option><option>Di chuyển</option><option>Thể thao</option><option>Dịch vụ khác</option></select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Khoảng cách</label>
            <input value={form.distance} onChange={(event) => set("distance", event.target.value)} placeholder="VD: 150m" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Hoa hồng</label>
            <input value={form.commission} onChange={(event) => set("commission", event.target.value)} placeholder="VD: 10%" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
        </div>
        <div className="border-t border-pms-divider pt-3.5">
          <b className="text-[13.5px]">Thông tin liên hệ</b>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Địa chỉ</label>
          <input value={form.address} onChange={(event) => set("address", event.target.value)} placeholder="Nhập địa chỉ đối tác" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Số điện thoại</label>
            <input value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="Số điện thoại" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Email</label>
            <input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} placeholder="email@doitac.vn" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Người liên hệ</label>
          <input value={form.contactName} onChange={(event) => set("contactName", event.target.value)} placeholder="Họ tên người phụ trách" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
        </div>
      </div>
    </Modal>
  );
}
