"use client";

import { useState } from "react";
import Link from "next/link";
import { amenityGroups, activitiesList, amenityServicesList } from "@/lib/mock-data";

type Tab = "info" | "activities" | "services";

const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Thông tin tiện tích" },
  { key: "activities", label: "Các hoạt động" },
  { key: "services", label: "Các dịch vụ" },
];

// Trang "Tiện ích cơ sở" (mở từ Danh sách cơ sở) — pixel-perfect theo khối `isAmenities`
// (dòng 1610-1660 bản gốc): 3 tab con, mỗi mục là 1 checkbox + icon tròn + tên tiện ích
// (chỉ hiển thị, không có logic chọn thật trong bản gốc).
export default function AmenitiesPage() {
  const [tab, setTab] = useState<Tab>("info");

  return (
    <div>
      <Link href="/branches" className="mb-4 flex items-center gap-3 text-[#23262F]">
        <span className="text-[18px]">←</span>
        <h1 className="m-0 text-[20px] font-bold">Tên cơ sở</h1>
      </Link>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-6 flex gap-7 border-b border-pms-border text-[14px]">
          {TABS.map((t) => (
            <div
              key={t.key}
              className="cursor-pointer pb-3 font-semibold"
              style={{ color: tab === t.key ? "#284AB1" : "#777E90", borderBottom: `2px solid ${tab === t.key ? "#284AB1" : "transparent"}` }}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>

        {tab === "info" &&
          amenityGroups.map((grp) => (
            <div key={grp.title} className="mb-6">
              <div className="mb-3.5 text-[14px] font-bold">{grp.title}</div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-3.5">
                {grp.items.map((name, i) => (
                  <AmenityItem key={name + i} name={name} />
                ))}
              </div>
            </div>
          ))}

        {tab === "activities" && (
          <div className="grid grid-cols-3 gap-x-6 gap-y-3.5">
            {activitiesList.map((name, i) => (
              <AmenityItem key={name + i} name={name} />
            ))}
          </div>
        )}

        {tab === "services" && (
          <div className="grid grid-cols-3 gap-x-6 gap-y-3.5">
            {amenityServicesList.map((name, i) => (
              <AmenityItem key={name + i} name={name} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AmenityItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px]">
      <div className="h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
      <div className="h-5 w-5 flex-shrink-0 rounded-full bg-pms-muted" />
      {name}
    </div>
  );
}
