"use client";

import { useState } from "react";
import { socialLinksSeed, type SocialLink } from "@/lib/mock-data";

// Trang "Mạng xã hội" (mở từ panel Cài đặt) — pixel-perfect theo khối `isSocial` (dòng
// 1958-1976 bản gốc): bảng kênh mạng xã hội, mỗi dòng có 2 công tắc thật (Kết nối /
// Tự động đăng khi còn phòng trống).
export default function SocialPage() {
  const [links, setLinks] = useState<SocialLink[]>(socialLinksSeed);

  function toggle(name: string, field: "on" | "autoOn") {
    setLinks((prev) => prev.map((s) => (s.name === name ? { ...s, [field]: !s[field] } : s)));
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Mạng xã hội</h1>
      <p className="mb-5 text-[13px] text-pms-muted">Kết nối kênh &amp; tự động đăng bán/giới thiệu khi phòng còn trống</p>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="grid grid-cols-[1fr_100px_220px] gap-4 border-b border-pms-divider pb-2.5 text-[11px] uppercase tracking-wide text-pms-muted">
          <span>Kênh</span>
          <span>Kết nối</span>
          <span>Tự động đăng khi còn phòng trống</span>
        </div>
        {links.map((s) => (
          <div key={s.name} className="grid grid-cols-[1fr_100px_220px] items-center gap-4 border-b border-pms-divider py-3.5">
            <div>
              <div className="text-[13px] font-semibold">{s.name}</div>
              <div className="text-[12px] text-pms-muted">{s.handle}</div>
            </div>
            <div
              className="relative h-6 w-10 cursor-pointer rounded-full"
              style={{ background: s.on ? "#284AB1" : "#E6E8EC" }}
              onClick={() => toggle(s.name, "on")}
            >
              <div className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white" style={{ left: s.on ? "auto" : 3, right: s.on ? 3 : "auto" }} />
            </div>
            <div className="flex items-center gap-2">
              <div
                className="relative h-6 w-10 flex-shrink-0 cursor-pointer rounded-full"
                style={{ background: s.autoOn ? "#284AB1" : "#E6E8EC" }}
                onClick={() => toggle(s.name, "autoOn")}
              >
                <div
                  className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white"
                  style={{ left: s.autoOn ? "auto" : 3, right: s.autoOn ? 3 : "auto" }}
                />
              </div>
              <span className="text-[11.5px] text-pms-muted">{s.autoOn ? "Đang tự động đăng bài" : "Tắt"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
