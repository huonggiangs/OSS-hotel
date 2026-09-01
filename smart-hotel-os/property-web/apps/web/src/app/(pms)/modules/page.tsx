"use client";

import { useSettings } from "@/lib/useSettings";

// Trang "Module nâng cao" — ĐÃ NỐI API THẬT: property_settings nhóm
// "modules". Bật/tắt module giờ lưu thật qua PUT (thay vì chỉ setState cục
// bộ như bản mock trước đây).
interface ModuleItem {
  key: string;
  name: string;
  icon: string;
  bg: string;
  price?: string;
  free?: boolean;
  on: boolean;
}
interface ModulesData {
  items: ModuleItem[];
}
const FALLBACK: ModulesData = { items: [] };

export default function ModulesPage() {
  const { data, loading, save } = useSettings<ModulesData>("modules", FALLBACK);

  async function toggle(key: string) {
    await save({ items: data.items.map((m) => (m.key === key ? { ...m, on: !m.on } : m)) });
  }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Module nâng cao</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Bật/tắt các module mở rộng cho cơ sở của bạn</p>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.items.map((m) => (
          <div key={m.key} className="min-w-0 overflow-hidden rounded-xl bg-white px-[18px] pb-3.5 pt-[18px] shadow-card">
            <div className="mb-2.5 flex justify-end">
              <button type="button"
                aria-label={`${m.on ? "Tắt" : "Bật"} ${m.name}`}
                onClick={() => toggle(m.key)}
                className="flex h-[22px] w-[38px] cursor-pointer items-center rounded-full p-0.5"
                style={{ background: m.on ? "#284AB1" : "#E6E8EC", justifyContent: m.on ? "flex-end" : "flex-start" }}
              >
                <div className="h-[18px] w-[18px] rounded-full bg-white" />
              </button>
            </div>
            <div
              className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl text-[26px]"
              style={{ background: m.bg }}
            >
              {m.icon}
            </div>
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <span className="min-w-0 break-words text-[13.5px] font-semibold text-pms-text">{m.name}</span>
              <span className="min-w-0 break-words text-[12.5px] font-semibold leading-5 text-pms-primary sm:text-right">
                {m.free ? "Miễn phí" : m.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
