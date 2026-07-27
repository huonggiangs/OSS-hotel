"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { mainNav } from "@/lib/nav";
import { currentUser } from "@/lib/mock-data";

// Sidebar chính — pixel-perfect theo khối sidebar 208px/64px (thu gọn) trong bản gốc:
// logo vuông 36px bo góc 10px nền #284AB1, danh sách navMain, nút "Cài đặt" ở cuối.
export function Sidebar({
  collapsed,
  onToggleCollapsed,
  settingsActive,
  onToggleSettings,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  settingsActive: boolean;
  onToggleSettings: () => void;
}) {
  const pathname = usePathname();
  const width = collapsed ? 64 : 208;

  return (
    <div
      className="flex flex-shrink-0 flex-col gap-1 border-r border-pms-border bg-white p-3 transition-[width] duration-150"
      style={{ width }}
    >
      <div className="mb-4 flex items-center gap-2.5 px-1.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-pms-primary text-[15px] font-bold text-white">
          A
        </div>
        {!collapsed && <b className="overflow-hidden whitespace-nowrap text-[15px]">ANIO PMS</b>}
        <div
          onClick={onToggleCollapsed}
          title="Thu gọn menu"
          className="ml-auto flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-md bg-pms-divider"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#777E90"
            strokeWidth={2.5}
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </div>
      </div>

      {mainNav.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.key}
            href={item.href}
            title={item.label}
            className="flex h-10 items-center gap-2.5 rounded-[10px] px-2.5"
            style={{ background: active ? "#EEF1FB" : "transparent" }}
          >
            <Icon name={item.icon} className="h-5 w-5 flex-shrink-0" style={{ color: active ? "#284AB1" : "#777E90" }} />
            {!collapsed && (
              <span
                className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold"
                style={{ color: active ? "#284AB1" : "#777E90" }}
              >
                {item.label}
              </span>
            )}
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col gap-1">
        <div
          onClick={onToggleSettings}
          title="Cài đặt"
          className="flex h-10 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5"
          style={{ background: settingsActive ? "#EEF1FB" : "transparent" }}
        >
          <Icon name="gear" className="h-5 w-5 flex-shrink-0" style={{ color: settingsActive ? "#284AB1" : "#777E90" }} />
          {!collapsed && (
            <span className="text-[13px] font-semibold" style={{ color: settingsActive ? "#284AB1" : "#777E90" }}>
              Cài đặt
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pms-primary-soft text-[12px] font-bold text-pms-primary">
            {currentUser.initials}
          </div>
          {!collapsed && (
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-semibold">{currentUser.name}</div>
          )}
        </div>
      </div>
    </div>
  );
}
