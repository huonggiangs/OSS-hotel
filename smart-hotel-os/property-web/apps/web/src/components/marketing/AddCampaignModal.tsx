"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { campaignAudienceOptions, type CampaignRow } from "@/lib/mock-data";

export interface CampaignForm {
  name: string;
  channel: string;
  start: string;
  end: string;
  audience: string;
  subject: string;
  body: string;
  promoCode: string;
}

const EMPTY_FORM: CampaignForm = { name: "", channel: "Email", start: "", end: "", audience: "all", subject: "", body: "", promoCode: "" };

function fmt(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

// Modal "Tạo chiến dịch mới" — pixel-perfect theo khối `showAddCampaign` (dòng
// 1994-2029 bản gốc). Khác các modal Thêm khác trong app, bản gốc bind form này vào
// state thật (`campaignForm`, `setCampaignField`, `addCampaign`) nên giữ nguyên hành
// vi input thật (không phải placeholder tĩnh).
export function AddCampaignModal({ onClose, onCreate }: { onClose: () => void; onCreate: (row: CampaignRow) => void }) {
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);

  function setField<K extends keyof CampaignForm>(field: K, value: CampaignForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit() {
    onCreate({
      name: form.name || "Chiến dịch mới",
      channel: form.channel || "Email",
      start: fmt(form.start),
      end: fmt(form.end),
      sent: 0,
      opened: "0%",
      status: "Đang chạy",
      bg: "#E6F9EE",
      fg: "#00C853",
    });
  }

  return (
    <Modal
      title="Tạo chiến dịch mới"
      onClose={onClose}
      width={620}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={submit}>Tạo chiến dịch</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <Field label="Tên chiến dịch">
          <input
            type="text"
            placeholder="VD: Ưu đãi hè 2026"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text"
          />
        </Field>
        <Field label="Kênh">
          <select
            value={form.channel}
            onChange={(e) => setField("channel", e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text"
          >
            <option value="Email">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ngày bắt đầu">
            <input
              type="date"
              value={form.start}
              onChange={(e) => setField("start", e.target.value)}
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text"
            />
          </Field>
          <Field label="Ngày kết thúc">
            <input
              type="date"
              value={form.end}
              onChange={(e) => setField("end", e.target.value)}
              className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text"
            />
          </Field>
        </div>
        <div className="border-t border-pms-divider pt-3.5">
          <b className="text-[13.5px]">Nội dung chiến dịch</b>
        </div>
        <Field label="Đối tượng nhận">
          <select
            value={form.audience}
            onChange={(e) => setField("audience", e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text"
          >
            {campaignAudienceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tiêu đề">
          <input
            type="text"
            placeholder="VD: Ưu đãi 20% cho lần đặt tiếp theo"
            value={form.subject}
            onChange={(e) => setField("subject", e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text"
          />
        </Field>
        <Field label="Nội dung soạn thảo">
          <textarea
            placeholder="Soạn nội dung email/SMS gửi tới khách hàng…"
            value={form.body}
            onChange={(e) => setField("body", e.target.value)}
            className="min-h-[100px] w-full resize-y rounded-lg border border-pms-border px-3 py-2.5 font-sans text-[13px] text-pms-text"
          />
        </Field>
        <Field label="Ưu đãi đính kèm (tuỳ chọn)">
          <input
            type="text"
            placeholder="VD: Mã giảm giá SUMMER20"
            value={form.promoCode}
            onChange={(e) => setField("promoCode", e.target.value)}
            className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-text"
          />
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
