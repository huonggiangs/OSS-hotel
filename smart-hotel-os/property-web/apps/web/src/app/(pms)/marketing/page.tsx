"use client";

import { type CampaignRow } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddCampaignModal } from "@/components/marketing/AddCampaignModal";
import { useSettings } from "@/lib/useSettings";
import { useState } from "react";

// Trang "Marketing" — ĐÃ NỐI API THẬT: danh sách chiến dịch lưu trong
// property_settings nhóm "marketing" (chưa có bảng nghiệp vụ campaigns riêng
// — CRM/Marketing service thật thuộc smart-hotel-os/services/crm-service,
// property-web chỉ lưu cấu hình/khai báo chiến dịch cấp cơ sở, xem
// PROGRESS.md). Tạo chiến dịch mới giờ ghi thật xuống DB qua PUT (không chỉ
// setState cục bộ như bản mock trước đây).
interface MarketingData {
  campaigns: CampaignRow[];
}
const FALLBACK: MarketingData = { campaigns: [] };

export default function MarketingPage() {
  const { data, loading, save } = useSettings<MarketingData>("marketing", FALLBACK);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Tiếp thị</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Chiến dịch thư điện tử hoặc tin nhắn gửi tới khách hàng</p>

      <div className="rounded-xl bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Chiến dịch</h3>
          <button type="button"
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAdd(true)}
          >
            + Tạo chiến dịch
          </button>
        </div>
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {!loading && (
          <>
          <div className="space-y-3 md:hidden">
            {data.campaigns.map((c, i) => (
              <article key={c.name + i} className="rounded-lg border border-pms-divider p-3">
                <div className="flex items-start justify-between gap-3"><b className="break-words text-[13px]">{c.name}</b><StatusPill bg={c.bg} fg={c.fg}>{c.status}</StatusPill></div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-pms-muted"><span>{c.channel}</span><span className="text-right">Đã gửi: {c.sent}</span><span>{c.start} – {c.end}</span><span className="text-right">Mở: {c.opened}</span></div>
              </article>
            ))}
            {data.campaigns.length === 0 && <p className="py-4 text-center text-[13px] text-pms-muted">Chưa có chiến dịch.</p>}
          </div>
          <table className="hidden w-full border-collapse text-[13px] md:table">
            <thead>
              <tr>
                {["Chiến dịch", "Kênh", "Bắt đầu", "Kết thúc", "Đã gửi", "Tỷ lệ mở", "Trạng thái"].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c, i) => (
                <tr key={c.name + i}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{c.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.channel}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.start}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.end}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.sent}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.opened}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <StatusPill bg={c.bg} fg={c.fg}>
                      {c.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {showAdd && (
        <AddCampaignModal
          onClose={() => setShowAdd(false)}
          onCreate={(row) => {
            save({ campaigns: [row, ...data.campaigns] });
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
