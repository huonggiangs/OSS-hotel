"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { SettingsPanel } from "./SettingsPanel";
import { Topbar } from "./Topbar";
import { UserProfileModal } from "./UserProfileModal";

// Khung sườn dùng chung cho toàn bộ property-web: Sidebar + panel Cài đặt (mở/đóng)
// + Topbar + vùng nội dung có zoom theo cỡ chữ đã chọn — tương ứng khối
// `<div style="display:flex;width:1440px...">` bọc ngoài cùng trong bản gốc.
// Các route settings (price/payment/stub/*) tự mở panel Cài đặt khi vào thẳng URL.
const SETTINGS_ROUTE_PREFIXES = ["/price", "/payment", "/stub"];

export function PmsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSettingsRoute = SETTINGS_ROUTE_PREFIXES.some((p) => pathname?.startsWith(p));

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(isSettingsRoute);
  const [fontScale, setFontScale] = useState(1);
  const [showUserProfile, setShowUserProfile] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-pms-bg text-pms-text">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        settingsActive={isSettingsRoute || settingsOpen}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
      />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar fontScale={fontScale} onFontScaleChange={setFontScale} onOpenUserProfile={() => setShowUserProfile(true)} />
        {showUserProfile && <UserProfileModal onClose={() => setShowUserProfile(false)} />}
        <div className="flex-1 overflow-y-auto p-8" style={{ zoom: fontScale } as React.CSSProperties}>
          {children}
        </div>
      </div>
    </div>
  );
}
