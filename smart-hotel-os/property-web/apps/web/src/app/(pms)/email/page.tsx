"use client";

import { useState } from "react";
import { emailFields, autoEmails } from "@/lib/mock-data";

type Tab = "settings" | "content";

// Trang "Email" (mở từ panel Cài đặt) — pixel-perfect theo khối `isEmail` (dòng
// 1692-1731 bản gốc): 2 tab con (Cài đặt email / Nội dung email).
export default function EmailPage() {
  const [tab, setTab] = useState<Tab>("settings");

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

        {tab === "settings" && (
          <>
            <h3 className="mb-0.5 text-[20px] font-semibold">Cài đặt email</h3>
            <p className="mb-5 text-[13px] text-pms-text">Các cài đặt này giúp bạn tuỳ chỉnh email của cơ sở.</p>
            <div className="mb-7 flex max-w-[760px] flex-col gap-[18px]">
              {emailFields.map((f) => (
                <div key={f.label} className="grid grid-cols-[238px_1fr] items-center gap-6">
                  <div>
                    <div className="text-[13px] font-medium">{f.label}</div>
                    <div className="text-[11px] text-pms-muted">{f.desc}</div>
                  </div>
                  <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">{f.label}</div>
                </div>
              ))}
            </div>
            <h3 className="mb-0.5 text-[20px] font-semibold">Gửi email tự động</h3>
            <p className="mb-4 text-[13px] text-pms-text">Các cài đặt này giúp bạn tuỳ chỉnh email của cơ sở.</p>
            <div className="flex flex-col gap-3.5 pl-[262px]">
              {autoEmails.map((name) => (
                <div key={name} className="flex items-center gap-2.5 text-[13px]">
                  <div className="h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
                  {name}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "content" && (
          <>
            <h3 className="mb-4 text-[15px] font-semibold">Nội dung email tự động</h3>
            {autoEmails.map((name) => (
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
