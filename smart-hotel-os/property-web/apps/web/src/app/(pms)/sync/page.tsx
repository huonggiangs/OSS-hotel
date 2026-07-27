"use client";

import { useState } from "react";
import { otaChannels } from "@/lib/mock-data";
import { AddOtaModal } from "@/components/sync/AddOtaModal";

// Trang "Đồng bộ hoá" (mở từ panel Cài đặt) — pixel-perfect theo khối `isSync` (dòng
// 1892-1941 bản gốc): checkbox đồng bộ từng kênh OTA + 3 công tắc tĩnh (Google Hotel/
// Website/Tự động đồng bộ — bản gốc hard-code luôn bật, không có onClick).
export default function SyncPage() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="mb-0.5 text-[20px] font-bold">Đồng bộ</h3>
            <p className="m-0 text-[13px] text-pms-text">Thanh toán với mọi hình thức</p>
          </div>
          <div
            className="cursor-pointer whitespace-nowrap rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAdd(true)}
          >
            + Thêm kênh OTA
          </div>
        </div>

        <div className="mb-5 grid grid-cols-[220px_1fr] gap-4">
          <span className="pt-2 text-[13px]">Đồng bộ Booking, OTA</span>
          <div className="flex flex-col gap-3">
            {otaChannels.map((c) => (
              <label key={c} className="flex items-center gap-2.5 text-[13px]">
                <span className="inline-block h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
                {c}
              </label>
            ))}
          </div>
        </div>

        <ToggleRow label="Đồng bộ với google hotel" />
        <ToggleRow label="Đồng bộ website" />
        <div className="grid grid-cols-[220px_1fr] items-center gap-4 border-t border-pms-divider py-3">
          <span className="text-[13px]">Thời gian đồng bộ</span>
          <div className="flex max-w-[220px] justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Chọn thời gian <span>⌄</span>
          </div>
        </div>
        <ToggleRow label="Tự động đồng bộ" />
      </div>

      {showAdd && <AddOtaModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function ToggleRow({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-center gap-4 border-t border-pms-divider py-3">
      <span className="text-[13px]">{label}</span>
      <div className="relative h-6 w-10 rounded-full bg-pms-primary">
        <div className="absolute right-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white" />
      </div>
    </div>
  );
}
