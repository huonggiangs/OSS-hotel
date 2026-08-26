"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";

type Tab = "settings" | "content";
type Trigger = "BOOKING_CREATED" | "BEFORE_CHECKIN" | "PAYMENT_DUE" | "CHECKOUT" | "MANUAL";

interface EmailTemplate { id: string; name: string; trigger: Trigger; subject: string; body: string; enabled: boolean; }
interface EmailData {
  fields: { email: string; password: string; smtpHost: string; smtpPort: string; encryption: string };
  autoEmails: string[];
  autoEmailsEnabled: string[];
  templates?: EmailTemplate[];
}
const FALLBACK: EmailData = { fields: { email: "", password: "", smtpHost: "", smtpPort: "", encryption: "" }, autoEmails: [], autoEmailsEnabled: [], templates: [] };
const TRIGGERS: { value: Trigger; label: string }[] = [
  { value: "BOOKING_CREATED", label: "Khi tạo đặt phòng" },
  { value: "BEFORE_CHECKIN", label: "Trước ngày đến" },
  { value: "PAYMENT_DUE", label: "Đến hạn thanh toán" },
  { value: "CHECKOUT", label: "Sau khi trả phòng" },
  { value: "MANUAL", label: "Gửi thủ công" },
];

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `mail-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function normalise(data: EmailData): EmailData {
  const templates = Array.isArray(data.templates) && data.templates.length > 0
    ? data.templates
    : data.autoEmails.map((name, index) => ({ id: `legacy-${index}`, name, trigger: "MANUAL" as Trigger, subject: name, body: "Kính gửi {{guest_name}},\n\n", enabled: data.autoEmailsEnabled.includes(name) }));
  return { ...FALLBACK, ...data, fields: { ...FALLBACK.fields, ...data.fields }, templates };
}

export default function EmailPage() {
  const [tab, setTab] = useState<Tab>("settings");
  const { data, loading, saving, error, save } = useSettings<EmailData>("email", FALLBACK);
  const [form, setForm] = useState<EmailData>(FALLBACK);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { if (!loading) setForm(normalise(data)); }, [data, loading]);

  function updateTemplate(id: string, patch: Partial<EmailTemplate>) {
    setForm((current) => ({ ...current, templates: (current.templates ?? []).map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }
  function addTemplate() {
    setForm((current) => ({ ...current, templates: [...(current.templates ?? []), { id: newId(), name: "Email mới", trigger: "MANUAL", subject: "", body: "Kính gửi {{guest_name}},\n\n", enabled: false }] }));
  }
  function removeTemplate(id: string) {
    if (!window.confirm("Xóa nội dung email này?")) return;
    setForm((current) => ({ ...current, templates: (current.templates ?? []).filter((item) => item.id !== id) }));
  }
  async function saveForm() {
    const templates = (form.templates ?? []).map((item) => ({ ...item, name: item.name.trim(), subject: item.subject.trim() })).filter((item) => item.name);
    const next = { ...form, templates, autoEmails: templates.map((item) => item.name), autoEmailsEnabled: templates.filter((item) => item.enabled).map((item) => item.name) };
    try { await save(next); setForm(next); setNotice("Đã lưu cấu hình email và kịch bản."); }
    catch { setNotice("Không thể lưu cấu hình email."); }
  }

  return <div><div className="rounded-xl bg-white p-6 shadow-card">
    <div className="mb-6 flex gap-7 border-b border-pms-border text-[14px]">{([ ["settings", "Cài đặt email"], ["content", "Nội dung email"] ] as const).map(([key, label]) => <button key={key} type="button" className="cursor-pointer border-0 bg-transparent pb-3 font-semibold" style={{ color: tab === key ? "#284AB1" : "#777E90", borderBottom: `2px solid ${tab === key ? "#284AB1" : "transparent"}` }} onClick={() => setTab(key)}>{label}</button>)}</div>
    {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
    {(error || notice) && <p className={`text-[12px] ${notice?.startsWith("Đã") ? "text-[#00A844]" : "text-pms-danger"}`}>{notice ?? error}</p>}
    {!loading && tab === "settings" && <div className="max-w-[760px]"><h3 className="mb-1 text-[20px] font-semibold">Máy chủ gửi email</h3><p className="mb-5 text-[13px] text-pms-muted">Thông tin mật khẩu được bảo vệ ở server và không hiển thị lại sau khi lưu.</p><div className="space-y-4">{([ ["email", "Email", "email"], ["password", "Mật khẩu", "password"], ["smtpHost", "SMTP Host", "text"], ["smtpPort", "SMTP Port", "number"], ["encryption", "Mã hóa SMTP", "text"] ] as const).map(([key, label, type]) => <label key={key} className="grid gap-3 md:grid-cols-[220px_1fr]"><span className="text-[13px] font-medium">{label}</span><input type={type} value={form.fields[key]} onChange={(event) => setForm((current) => ({ ...current, fields: { ...current.fields, [key]: event.target.value } }))} className="input" placeholder={label} /></label>)}</div><button type="button" onClick={saveForm} disabled={saving} className="button mt-5 disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu cài đặt email"}</button></div>}
    {!loading && tab === "content" && <div><div className="mb-4 flex items-center justify-between"><div><h3 className="m-0 text-[16px] font-semibold">Nội dung &amp; kịch bản email</h3><p className="mb-0 mt-1 text-[12px] text-pms-muted">Biến dùng được: {"{{guest_name}}"}, {"{{booking_code}}"}, {"{{checkin_date}}"}, {"{{checkout_date}}"}, {"{{property_name}}"}.</p></div><button type="button" onClick={addTemplate} className="button">+ Thêm nội dung</button></div><div className="space-y-3">{(form.templates ?? []).map((item) => <section key={item.id} className="rounded-lg border border-pms-border p-4"><div className="mb-3 grid gap-2 md:grid-cols-[1fr_220px_auto]"><input value={item.name} onChange={(event) => updateTemplate(item.id, { name: event.target.value })} className="input" placeholder="Tên kịch bản" /><select value={item.trigger} onChange={(event) => updateTemplate(item.id, { trigger: event.target.value as Trigger })} className="input">{TRIGGERS.map((trigger) => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}</select><label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={item.enabled} onChange={(event) => updateTemplate(item.id, { enabled: event.target.checked })} />Bật tự động</label></div><input value={item.subject} onChange={(event) => updateTemplate(item.id, { subject: event.target.value })} className="input mb-2" placeholder="Tiêu đề email" /><textarea value={item.body} onChange={(event) => updateTemplate(item.id, { body: event.target.value })} className="min-h-[130px] w-full rounded-lg border border-pms-border p-3 text-[13px]" placeholder="Nội dung email" /><div className="mt-2 text-right"><button type="button" onClick={() => removeTemplate(item.id)} className="text-[12px] text-pms-danger">Xóa kịch bản</button></div></section>)}</div><button type="button" onClick={saveForm} disabled={saving} className="button mt-5 disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu nội dung email"}</button></div>}
  </div></div>;
}
