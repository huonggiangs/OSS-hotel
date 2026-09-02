"use client";

import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { useState } from "react";

export interface NewPartnerForm {
  name: string;
  category: string;
  distance: string;
  commission: string;
}

// Modal "Thêm đối tác mới" — pixel-perfect theo khối `showAddPartner` (dòng 2215-2244
// bản gốc). Bản gốc để các trường là placeholder tĩnh (nút "Thêm đối tác" chỉ đóng
// modal, không lưu dữ liệu thật) — giữ nguyên hành vi đó.
export function AddPartnerModal({ onClose, onSave }: { onClose: () => void; onSave: (value: NewPartnerForm) => Promise<void> | void }) {
  const [form, setForm] = useState<NewPartnerForm>({ name: "", category: "Ẩm thực", distance: "", commission: "" });
  const set = (key: keyof NewPartnerForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <Modal
      title="Thêm đối tác mới"
      onClose={onClose}
      width={520}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={() => form.name.trim() && void onSave(form)}>Thêm đối tác</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <label className="block cursor-pointer rounded-[10px] border border-dashed border-pms-muted-2 p-4 text-center text-[13px] text-pms-muted">
          📷 Tải lên hình ảnh đối tác (logo, không gian, dịch vụ)
          <input type="file" accept="image/*" multiple className="hidden" />
        </label>
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
          <input placeholder="Nhập địa chỉ đối tác" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Số điện thoại</label>
            <input placeholder="Số điện thoại" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Email</label>
            <input placeholder="email@doitac.vn" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Người liên hệ</label>
          <input placeholder="Họ tên người phụ trách" className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" />
        </div>
      </div>
    </Modal>
  );
}
