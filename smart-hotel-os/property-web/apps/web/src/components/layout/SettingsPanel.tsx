"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsTree } from "@/lib/nav";

// Panel "Cài đặt" (264px) — mở ra khi bấm icon bánh răng ở Sidebar, chứa cây điều
// hướng tới Chi nhánh/Cài đặt/Kết nối/Bảo mật/Hợp đồng & tài sản. Pixel-perfect theo
// khối `settingsOpen` trong bản gốc.
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex max-h-full w-[264px] flex-shrink-0 flex-col overflow-y-auto border-r border-pms-border bg-white p-3">
      <div className="flex items-center justify-between px-2 pb-4 pt-1">
        <span className="text-[16px] font-bold">Cài đặt</span>
        <div
          onClick={onClose}
          title="Ẩn menu"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-pms-divider"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#777E90" strokeWidth={2.5}>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </div>
      </div>
      {settingsTree.map((grp) => (
        <div key={grp.title}>
          <div className="px-2 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-wide text-pms-muted-2">{grp.title}</div>
          {grp.items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className="flex items-center justify-between rounded-lg px-2.5 py-2.5"
                style={{ background: active ? "#EEF1FB" : "transparent" }}
              >
                <span className="text-[13px]" style={{ fontWeight: active ? 600 : 500, color: active ? "#284AB1" : "#23262F" }}>
                  {it.label}
                </span>
                {it.badge && (
                  <span className="rounded-full bg-pms-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-pms-primary">Mới</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
