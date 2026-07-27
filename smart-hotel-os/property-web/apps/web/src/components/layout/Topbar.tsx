"use client";

import { useState } from "react";
import { useAuth, roleLabel } from "@/lib/auth";

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const last2 = parts.slice(-2);
  return last2.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

const FONT_SCALES = [
  { v: 1, label: "Nhỏ" },
  { v: 1.15, label: "Trung bình" },
  { v: 1.3, label: "Lớn" },
];

// Topbar 80px — pixel-perfect theo khối topbar trong bản gốc: ô tìm kiếm, chọn
// ngôn ngữ (tĩnh), menu cỡ chữ "Aa", icon thông báo (tĩnh), avatar mở modal thông tin.
export function Topbar({
  fontScale,
  onFontScaleChange,
  onOpenUserProfile,
}: {
  fontScale: number;
  onFontScaleChange: (v: number) => void;
  onOpenUserProfile: () => void;
}) {
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-20 flex-shrink-0 items-center justify-between border-b border-pms-border bg-white px-8">
      <div className="flex w-80 items-center gap-2.5 rounded-[10px] bg-pms-divider px-3.5 py-2.5 text-[13px] text-pms-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Tìm kiếm khách, mã đặt phòng...
      </div>
      <div className="relative flex items-center gap-5">
        <div className="flex cursor-pointer items-center gap-1.5 text-pms-text">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a15 15 0 010 18a15 15 0 010-18" />
          </svg>
          <span className="text-[13px] font-semibold">Tiếng Việt</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#777E90" strokeWidth={2.5}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <div className="h-6 w-px bg-pms-border" />
        <div className="relative">
          <div className="flex cursor-pointer items-center gap-1 text-pms-text" onClick={() => setFontMenuOpen((v) => !v)}>
            <span className="text-[13px] font-bold">Aa</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#777E90" strokeWidth={2.5}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          {fontMenuOpen && (
            <div className="absolute right-0 top-8 z-50 w-[150px] rounded-[10px] bg-white p-2 shadow-popover">
              {FONT_SCALES.map((fo) => (
                <div
                  key={fo.label}
                  className="cursor-pointer rounded-lg px-2.5 py-2.5 text-[13px]"
                  style={{
                    fontWeight: fontScale === fo.v ? 700 : 500,
                    color: fontScale === fo.v ? "#284AB1" : "#23262F",
                    background: fontScale === fo.v ? "#EEF1FB" : "transparent",
                  }}
                  onClick={() => {
                    onFontScaleChange(fo.v);
                    setFontMenuOpen(false);
                  }}
                >
                  {fo.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="h-6 w-px bg-pms-border" />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777E90" strokeWidth={2}>
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        <div className="h-6 w-px bg-pms-border" />
        {user && (
          <div className="flex cursor-pointer items-center gap-2.5" onClick={onOpenUserProfile}>
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-pms-primary text-[13px] font-semibold text-white">
              {initialsOf(user.full_name)}
            </div>
            <div className="text-[13px]">
              <b>{user.full_name}</b>
              <div className="text-[12px] text-pms-muted">{roleLabel[user.role]}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
