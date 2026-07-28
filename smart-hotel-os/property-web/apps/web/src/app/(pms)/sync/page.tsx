"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { AddOtaModal } from "@/components/sync/AddOtaModal";

interface SyncData {
  otaChannels: string[];
  selectedChannels: string[];
  syncGoogleHotel: boolean;
  syncWebsite: boolean;
  autoSync: boolean;
}
const FALLBACK: SyncData = { otaChannels: [], selectedChannels: [], syncGoogleHotel: true, syncWebsite: true, autoSync: true };

// Trang "Đồng bộ hoá" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT: property_settings
// nhóm "sync". Khác quyết định cũ ở phiên 2 (giữ 3 công tắc tĩnh vì bản gốc
// không có onClick) — nay đã có bảng cấu hình thật để đọc/ghi nên bật onClick
// thật cho cả 3 công tắc + checkbox kênh, gộp lại lưu 1 lần qua nút "Cập nhật".
export default function SyncPage() {
  const [showAdd, setShowAdd] = useState(false);
  const { data, loading, saving, save } = useSettings<SyncData>("sync", FALLBACK);
  const [form, setForm] = useState<SyncData>(FALLBACK);

  useEffect(() => {
    if (!loading) setForm(data);
  }, [loading, data]);

  function toggleChannel(c: string) {
    setForm((f) => ({
      ...f,
      selectedChannels: f.selectedChannels.includes(c) ? f.selectedChannels.filter((x) => x !== c) : [...f.selectedChannels, c],
    }));
  }

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

        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}

        {!loading && (
          <>
            <div className="mb-5 grid grid-cols-[220px_1fr] gap-4">
              <span className="pt-2 text-[13px]">Đồng bộ Booking, OTA</span>
              <div className="flex flex-col gap-3">
                {form.otaChannels.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2.5 text-[13px]" onClick={() => toggleChannel(c)}>
                    <span
                      className="inline-block h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2"
                      style={form.selectedChannels.includes(c) ? { background: "#284AB1", borderColor: "#284AB1" } : undefined}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <ToggleRow label="Đồng bộ với google hotel" on={form.syncGoogleHotel} onClick={() => setForm((f) => ({ ...f, syncGoogleHotel: !f.syncGoogleHotel }))} />
            <ToggleRow label="Đồng bộ website" on={form.syncWebsite} onClick={() => setForm((f) => ({ ...f, syncWebsite: !f.syncWebsite }))} />
            <div className="grid grid-cols-[220px_1fr] items-center gap-4 border-t border-pms-divider py-3">
              <span className="text-[13px]">Thời gian đồng bộ</span>
              <div className="flex max-w-[220px] justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
                Chọn thời gian <span>⌄</span>
              </div>
            </div>
            <ToggleRow label="Tự động đồng bộ" on={form.autoSync} onClick={() => setForm((f) => ({ ...f, autoSync: !f.autoSync }))} />

            <div
              className="mt-4 w-[140px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white"
              onClick={() => save(form)}
            >
              {saving ? "Đang lưu..." : "Cập nhật"}
            </div>
          </>
        )}
      </div>

      {showAdd && <AddOtaModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-center gap-4 border-t border-pms-divider py-3">
      <span className="text-[13px]">{label}</span>
      <div className="relative h-6 w-10 cursor-pointer rounded-full" style={{ background: on ? "#284AB1" : "#E6E8EC" }} onClick={onClick}>
        <div className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white" style={{ left: on ? "auto" : 3, right: on ? 3 : "auto" }} />
      </div>
    </div>
  );
}
