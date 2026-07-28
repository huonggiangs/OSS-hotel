"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/useSettings";

type Tab = "info" | "activities" | "services";

const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Thông tin tiện tích" },
  { key: "activities", label: "Các hoạt động" },
  { key: "services", label: "Các dịch vụ" },
];

// zip3 — trộn 3 cột dữ liệu thành 1 mảng phẳng (đúng thuật toán bản gốc, xem
// mock-data.ts) — giờ áp dụng lên dữ liệu lấy từ API thay vì mảng tĩnh.
function zip3(a: string[], b: string[], c: string[]): string[] {
  const out: string[] = [];
  const n = Math.max(a.length, b.length, c.length);
  for (let i = 0; i < n; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
    if (c[i]) out.push(c[i]);
  }
  return out;
}

// Trang "Tiện ích cơ sở" — ĐÃ NỐI API THẬT: property_settings nhóm
// "amenities" (groups/activitiesCols/amenityServicesCols/selected). Bản gốc
// KHÔNG có logic chọn thật (chỉ hiển thị checkbox tĩnh) — bổ sung state
// "selected" (đã chọn) + nút "Lưu lựa chọn" để nút Lưu gọi API thật, đúng yêu
// cầu nhiệm vụ, mà không phá vỡ giao diện gốc (checkbox vẫn giữ hình dạng cũ).
interface AmenityGroup {
  title: string;
  items: string[];
}
interface AmenitiesData {
  groups: AmenityGroup[];
  activitiesCols: string[][];
  amenityServicesCols: string[][];
  selected: string[];
}
const FALLBACK: AmenitiesData = { groups: [], activitiesCols: [[], [], []], amenityServicesCols: [[], [], []], selected: [] };

export default function AmenitiesPage() {
  const [tab, setTab] = useState<Tab>("info");
  const { data, loading, saving, save } = useSettings<AmenitiesData>("amenities", FALLBACK);
  const [selected, setSelected] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useMemo(() => {
    if (!loading && !dirty) setSelected(data.selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data.selected]);

  const activitiesList = useMemo(() => zip3(data.activitiesCols[0] ?? [], data.activitiesCols[1] ?? [], data.activitiesCols[2] ?? []), [data]);
  const amenityServicesList = useMemo(
    () => zip3(data.amenityServicesCols[0] ?? [], data.amenityServicesCols[1] ?? [], data.amenityServicesCols[2] ?? []),
    [data]
  );

  function toggle(name: string) {
    setDirty(true);
    setSelected((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  async function handleSave() {
    await save({ ...data, selected });
    setDirty(false);
  }

  return (
    <div>
      <Link href="/branches" className="mb-4 flex items-center gap-3 text-[#23262F]">
        <span className="text-[18px]">←</span>
        <h1 className="m-0 text-[20px] font-bold">Tên cơ sở</h1>
      </Link>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-6 flex items-center justify-between border-b border-pms-border">
          <div className="flex gap-7 text-[14px]">
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
          <div className="cursor-pointer pb-3 text-[13px] font-semibold text-pms-primary" onClick={handleSave}>
            {saving ? "Đang lưu..." : "Lưu lựa chọn"}
          </div>
        </div>

        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}

        {!loading && tab === "info" &&
          data.groups.map((grp) => (
            <div key={grp.title} className="mb-6">
              <div className="mb-3.5 text-[14px] font-bold">{grp.title}</div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-3.5">
                {grp.items.map((name, i) => (
                  <AmenityItem key={name + i} name={name} checked={selected.includes(name)} onToggle={() => toggle(name)} />
                ))}
              </div>
            </div>
          ))}

        {!loading && tab === "activities" && (
          <div className="grid grid-cols-3 gap-x-6 gap-y-3.5">
            {activitiesList.map((name, i) => (
              <AmenityItem key={name + i} name={name} checked={selected.includes(name)} onToggle={() => toggle(name)} />
            ))}
          </div>
        )}

        {!loading && tab === "services" && (
          <div className="grid grid-cols-3 gap-x-6 gap-y-3.5">
            {amenityServicesList.map((name, i) => (
              <AmenityItem key={name + i} name={name} checked={selected.includes(name)} onToggle={() => toggle(name)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AmenityItem({ name, checked, onToggle }: { name: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex cursor-pointer items-center gap-2.5 text-[13px]" onClick={onToggle}>
      <div
        className="h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2"
        style={checked ? { background: "#284AB1", borderColor: "#284AB1" } : undefined}
      />
      <div className="h-5 w-5 flex-shrink-0 rounded-full bg-pms-muted" />
      {name}
    </div>
  );
}
