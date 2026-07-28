"use client";

import { useSettings } from "@/lib/useSettings";

interface ChannelItem {
  name: string;
  initial: string;
  color: string;
  status: string;
  statusColor: string;
  stat: string;
}
interface ChannelData {
  items: ChannelItem[];
}
const FALLBACK: ChannelData = { items: [] };

// Trang "Kênh bán (OTA)" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT:
// property_settings nhóm "channel". Đây là cấu hình cấp cơ sở lưu trong DB của
// property-web — đồng bộ THẬT với `smart-hotel-os/services/channel-manager-service`
// (OTA thật) là bước sau, KHÔNG gọi chéo trực tiếp sang service đó (vi phạm
// ranh giới kiến trúc — xem ARCHITECTURE_OVERVIEW.md).
export default function ChannelPage() {
  const { data, loading, error } = useSettings<ChannelData>("channel", FALLBACK);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Kênh bán (OTA)</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Đồng bộ giá &amp; phòng trống theo thời gian thực</p>
      {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
      {error && <div className="text-[13px] text-red-500">{error}</div>}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {data.items.map((ch) => (
            <div key={ch.name} className="flex flex-col gap-2.5 rounded-xl border border-pms-border bg-white p-5">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[13px] font-bold text-white"
                style={{ background: ch.color }}
              >
                {ch.initial}
              </div>
              <div className="text-[14px] font-semibold">{ch.name}</div>
              <div className="flex items-center gap-1.5 text-[12px]" style={{ color: ch.statusColor }}>
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: ch.statusColor }} />
                {ch.status}
              </div>
              <div className="text-[12px] text-pms-muted">{ch.stat}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
