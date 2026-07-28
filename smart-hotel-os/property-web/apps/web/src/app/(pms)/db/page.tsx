"use client";

import { useSettings } from "@/lib/useSettings";

interface DbInfoItem {
  label: string;
  value: string;
}
interface DbData {
  info: DbInfoItem[];
}
const FALLBACK: DbData = { info: [] };

// Trang "Cơ sở dữ liệu" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT: property_settings
// nhóm "db". 2 nút hành động giữ tĩnh đúng bản gốc (chưa có backend sao lưu/xuất
// dữ liệu thật — nằm ngoài phạm vi MVP này).
export default function DbPage() {
  const { data, loading, error } = useSettings<DbData>("db", FALLBACK);

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Cơ sở dữ liệu</h1>
      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {error && <div className="text-[13px] text-red-500">{error}</div>}
        {!loading && (
          <div className="grid grid-cols-2 gap-4">
            {data.info.map((d) => (
              <div key={d.label}>
                <div className="mb-1 text-[12px] text-pms-muted">{d.label}</div>
                <b className="text-[14px]">{d.value}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2.5">
        <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white">Sao lưu ngay</div>
        <div className="cursor-pointer rounded-[10px] border border-pms-border px-[18px] py-2.5 text-[13px] font-semibold text-pms-text">
          Xuất dữ liệu
        </div>
      </div>
    </div>
  );
}
