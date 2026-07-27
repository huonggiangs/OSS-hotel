"use client";

import { useState } from "react";
import { campaignsSeed, type CampaignRow } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddCampaignModal } from "@/components/marketing/AddCampaignModal";

// Trang "Marketing" — pixel-perfect theo khối `isMarketing` (dòng 1978-1992 bản gốc):
// bảng chiến dịch email/SMS + modal "Tạo chiến dịch mới" (form thật, prepend vào bảng
// khi tạo — đúng hành vi `addCampaign` bản gốc).
export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(campaignsSeed);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Marketing</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Chiến dịch email/SMS gửi tới khách hàng</p>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Chiến dịch</h3>
          <div
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAdd(true)}
          >
            + Tạo chiến dịch
          </div>
        </div>
        <table className="w-full border-collapse text-[13px]">
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
            {campaigns.map((c, i) => (
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
      </div>

      {showAdd && (
        <AddCampaignModal
          onClose={() => setShowAdd(false)}
          onCreate={(row) => {
            setCampaigns((prev) => [row, ...prev]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
