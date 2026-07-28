"use client";

import { useState } from "react";
import { MapsConfigModal } from "@/components/utilities/MapsConfigModal";
import { HotelConfigModal } from "@/components/utilities/HotelConfigModal";
import { useSettings } from "@/lib/useSettings";

// Trang "Tiện ích" — ĐÃ NỐI API THẬT: property_settings nhóm "utilities".
// 2 công tắc trong modal Google Hotel (đồng bộ tình trạng phòng/khuyến mãi)
// giờ lưu thật qua PUT (thay vì chỉ setState cục bộ).
interface UtilityLink {
  key: "maps" | "hotel";
  name: string;
  desc: string;
  linked: boolean;
}
interface UtilitiesData {
  links: UtilityLink[];
  syncAvail: boolean;
  syncPromo: boolean;
}
const FALLBACK: UtilitiesData = { links: [], syncAvail: true, syncPromo: false };

export default function UtilitiesPage() {
  const { data, loading, save } = useSettings<UtilitiesData>("utilities", FALLBACK);
  const [openConfig, setOpenConfig] = useState<"maps" | "hotel" | null>(null);

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Tiện ích</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">
        Gắn cơ sở lên Google Maps, Google Hotel để tăng khả năng tìm kiếm và đặt phòng
      </p>

      <div className="flex flex-col gap-3.5">
        {data.links.map((u) => (
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
          syncAvail={data.syncAvail}
          syncPromo={data.syncPromo}
          onToggleAvail={() => save({ ...data, syncAvail: !data.syncAvail })}
          onTogglePromo={() => save({ ...data, syncPromo: !data.syncPromo })}
          onClose={() => setOpenConfig(null)}
        />
      )}
    </div>
  );
}
