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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-pms-bg text-pms-text">
      <div className="hidden md:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          settingsActive={isSettingsRoute || settingsOpen}
          onToggleSettings={() => setSettingsOpen((v) => !v)}
        />
      </div>
      {mobileNavOpen && <button type="button" aria-label="Đóng menu" className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileNavOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden ${mobileNavOpen ? "block" : "hidden"}`}>
        <Sidebar
          collapsed={false}
          onToggleCollapsed={() => setMobileNavOpen(false)}
          settingsActive={isSettingsRoute || settingsOpen}
          onToggleSettings={() => { setSettingsOpen((v) => !v); setMobileNavOpen(false); }}
        />
      </div>
      {settingsOpen && <div className="hidden md:flex"><SettingsPanel onClose={() => setSettingsOpen(false)} /></div>}
      {settingsOpen && <><button type="button" aria-label="Đóng cài đặt" className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setSettingsOpen(false)} /><div className="fixed inset-y-0 left-0 z-50 md:hidden"><SettingsPanel onClose={() => setSettingsOpen(false)} /></div></>}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-pms-border bg-white md:hidden"><button type="button" aria-label="Mở menu" className="ml-3 rounded-lg bg-pms-divider px-2.5 py-2 text-[16px]" onClick={() => setMobileNavOpen(true)}>☰</button><div className="min-w-0 flex-1"><Topbar fontScale={fontScale} onFontScaleChange={setFontScale} onOpenUserProfile={() => setShowUserProfile(true)} /></div></div>
        <div className="hidden md:block"><Topbar fontScale={fontScale} onFontScaleChange={setFontScale} onOpenUserProfile={() => setShowUserProfile(true)} /></div>
        {showUserProfile && <UserProfileModal onClose={() => setShowUserProfile(false)} />}
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8" style={{ zoom: fontScale } as React.CSSProperties}>
          {children}
        </div>
      </div>
    </div>
  );
}
