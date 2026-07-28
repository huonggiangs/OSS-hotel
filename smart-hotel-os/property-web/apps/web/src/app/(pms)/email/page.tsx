"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";

type Tab = "settings" | "content";

// Trang "Email" — ĐÃ NỐI API THẬT: property_settings nhóm "email". Các
// trường cấu hình SMTP giờ là input thật (bản gốc để placeholder tĩnh) +
// checkbox "Gửi email tự động" lưu thật qua PUT khi bấm "Cập nhật".
interface EmailData {
  fields: { email: string; password: string; smtpHost: string; smtpPort: string; encryption: string };
  autoEmails: string[];
  autoEmailsEnabled: string[];
}
const FALLBACK: EmailData = {
  fields: { email: "", password: "", smtpHost: "", smtpPort: "", encryption: "" },
  autoEmails: [],
  autoEmailsEnabled: [],
};
const FIELD_DESC: Record<string, string> = {
  email: "Nhập địa chỉ email của cơ sở.",
  password: "Nhập mật khẩu email.",
  smtpHost: "Nhập máy chủ SMTP của email.",
  smtpPort: "Nhập cổng SMTP của email.",
  encryption: "Chọn kiểu mã hoá cho email của cơ sở.",
};
const FIELD_LABEL: Record<string, string> = {
  email: "Email",
  password: "Mật khẩu",
  smtpHost: "SMTP Host",
  smtpPort: "SMTP Port",
  encryption: "Mã hoá SMTP",
};

export default function EmailPage() {
  const [tab, setTab] = useState<Tab>("settings");
  const { data, loading, saving, save } = useSettings<EmailData>("email", FALLBACK);
  const [form, setForm] = useState<EmailData>(FALLBACK);

  useEffect(() => {
    if (!loading) setForm(data);
  }, [loading, data]);

  function toggleAuto(name: string) {
    setForm((f) => ({
      ...f,
      autoEmailsEnabled: f.autoEmailsEnabled.includes(name) ? f.autoEmailsEnabled.filter((x) => x !== name) : [...f.autoEmailsEnabled, name],
    }));
  }

  return (
    <div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-6 flex gap-7 border-b border-pms-border text-[14px]">
          <div
            className="cursor-pointer pb-3 font-semibold"
            style={{ color: tab === "settings" ? "#284AB1" : "#777E90", borderBottom: `2px solid ${tab === "settings" ? "#284AB1" : "transparent"}` }}
            onClick={() => setTab("settings")}
          >
            Cài đặt email
          </div>
          <div
            className="cursor-pointer pb-3 font-semibold"
            style={{ color: tab === "content" ? "#284AB1" : "#777E90", borderBottom: `2px solid ${tab === "content" ? "#284AB1" : "transparent"}` }}
            onClick={() => setTab("content")}
          >
            Nội dung email
          </div>
        </div>

        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}

        {!loading && tab === "settings" && (
          <>
            <h3 className="mb-0.5 text-[20px] font-semibold">Cài đặt email</h3>
            <p className="mb-5 text-[13px] text-pms-text">Các cài đặt này giúp bạn tuỳ chỉnh email của cơ sở.</p>
            <div className="mb-7 flex max-w-[760px] flex-col gap-[18px]">
              {(Object.keys(form.fields) as (keyof EmailData["fields"])[]).map((key) => (
                <div key={key} className="grid grid-cols-[238px_1fr] items-center gap-6">
                  <div>
                    <div className="text-[13px] font-medium">{FIELD_LABEL[key]}</div>
                    <div className="text-[11px] text-pms-muted">{FIELD_DESC[key]}</div>
                  </div>
                  <input
                    value={form.fields[key]}
                    onChange={(e) => setForm((f) => ({ ...f, fields: { ...f.fields, [key]: e.target.value } }))}
                    className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                    placeholder={FIELD_LABEL[key]}
                  />
                </div>
              ))}
            </div>
            <h3 className="mb-0.5 text-[20px] font-semibold">Gửi email tự động</h3>
            <p className="mb-4 text-[13px] text-pms-text">Các cài đặt này giúp bạn tuỳ chỉnh email của cơ sở.</p>
            <div className="flex flex-col gap-3.5 pl-[262px]">
              {form.autoEmails.map((name) => (
                <label key={name} className="flex cursor-pointer items-center gap-2.5 text-[13px]" onClick={() => toggleAuto(name)}>
                  <span
                    className="h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2"
                    style={form.autoEmailsEnabled.includes(name) ? { background: "#284AB1", borderColor: "#284AB1" } : undefined}
                  />
                  {name}
                </label>
              ))}
            </div>
            <div
              className="mt-5 w-[140px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white"
              onClick={() => save(form)}
            >
              {saving ? "Đang lưu..." : "Cập nhật"}
            </div>
          </>
        )}

        {!loading && tab === "content" && (
          <>
            <h3 className="mb-4 text-[15px] font-semibold">Nội dung email tự động</h3>
            {form.autoEmails.map((name) => (
              <div key={name} className="flex items-center justify-between border-b border-pms-divider py-3.5">
                <span className="text-[13px]">{name}</span>
                <span className="cursor-pointer text-[13px] font-semibold text-pms-primary">Chỉnh sửa nội dung</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
