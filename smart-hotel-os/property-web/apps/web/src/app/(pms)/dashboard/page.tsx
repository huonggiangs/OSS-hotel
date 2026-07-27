"use client";

import { useState } from "react";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";

// Trang Tổng quan — 2 subtab "Tổng quan cơ sở" / "Lịch đặt phòng", pixel-perfect
// theo khối `isDashboard` > `isDashOverview` / `isDashCalendar` trong bản gốc.
export default function DashboardPage() {
  const [subTab, setSubTab] = useState<"overview" | "calendar">("overview");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <div
          className="cursor-pointer rounded-lg px-4 py-2 text-[13px] font-semibold"
          style={{ background: subTab === "overview" ? "#EEF1FB" : "transparent", color: subTab === "overview" ? "#284AB1" : "#777E90" }}
          onClick={() => setSubTab("overview")}
        >
          Tổng quan cơ sở
        </div>
        <div
          className="cursor-pointer rounded-lg px-4 py-2 text-[13px] font-semibold"
          style={{ background: subTab === "calendar" ? "#EEF1FB" : "transparent", color: subTab === "calendar" ? "#284AB1" : "#777E90" }}
          onClick={() => setSubTab("calendar")}
        >
          Lịch đặt phòng
        </div>
      </div>

      {subTab === "calendar" ? <DashboardCalendar /> : <DashboardOverview />}
    </div>
  );
}
