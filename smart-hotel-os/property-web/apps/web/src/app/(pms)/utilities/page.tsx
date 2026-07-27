"use client";

import { useState } from "react";
import { utilityLinksSeed } from "@/lib/mock-data";
import { MapsConfigModal } from "@/components/utilities/MapsConfigModal";
import { HotelConfigModal } from "@/components/utilities/HotelConfigModal";

// Trang "Tiện ích" — pixel-perfect theo khối `isUtilities` (dòng 2246-2260 bản gốc):
// 2 thẻ liên kết Google Maps/Google Hotel, mỗi thẻ mở modal cấu hình riêng.
export default function UtilitiesPage() {
  const [openConfig, setOpenConfig] = useState<"maps" | "hotel" | null>(null);
  const [syncAvail, setSyncAvail] = useState(true);
  const [syncPromo, setSyncPromo] = useState(false);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Tiện ích</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">
        Gắn cơ sở lên Google Maps, Google Hotel để tăng khả năng tìm kiếm và đặt phòng
      </p>

      <div className="flex flex-col gap-3.5">
        {utilityLinksSeed.map((u) => (
          <div key={u.key} className="flex items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-card">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <b className="text-[14.5px]">{u.name}</b>
                <span
                  className="rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                  style={{ background: u.linked ? "#E9FBEF" : "#F4F5F6", color: u.linked ? "#00C853" : "#777E90" }}
                >
                  {u.linked ? "Đã gắn kết" : "Chưa gắn kết"}
                </span>
              </div>
              <p className="m-0 text-[12.5px] text-pms-muted">{u.desc}</p>
            </div>
            <div
              className="cursor-pointer whitespace-nowrap rounded-lg bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
              onClick={() => setOpenConfig(u.key)}
            >
              Cấu hình
            </div>
          </div>
        ))}
      </div>

      {openConfig === "maps" && <MapsConfigModal onClose={() => setOpenConfig(null)} />}
      {openConfig === "hotel" && (
        <HotelConfigModal
          syncAvail={syncAvail}
          syncPromo={syncPromo}
          onToggleAvail={() => setSyncAvail((v) => !v)}
          onTogglePromo={() => setSyncPromo((v) => !v)}
          onClose={() => setOpenConfig(null)}
        />
      )}
    </div>
  );
}
