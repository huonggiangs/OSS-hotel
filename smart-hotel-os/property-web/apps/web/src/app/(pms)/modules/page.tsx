"use client";

import { useState } from "react";
import { advancedModulesSeed } from "@/lib/mock-data";

// Trang "Module nâng cao" — pixel-perfect theo khối `isModules` (dòng 2262-2281 bản
// gốc): lưới 4 cột thẻ module, mỗi thẻ có công tắc bật/tắt thật (đúng hành vi
// `advancedModules.toggle` bản gốc).
export default function ModulesPage() {
  const [modules, setModules] = useState(advancedModulesSeed);

  function toggle(key: string) {
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, on: !m.on } : m)));
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Module nâng cao</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Bật/tắt các module mở rộng cho cơ sở của bạn</p>

      <div className="grid grid-cols-4 gap-4">
        {modules.map((m) => (
          <div key={m.key} className="rounded-xl bg-white px-[18px] pb-3.5 pt-[18px] shadow-card">
            <div className="mb-2.5 flex justify-end">
              <div
                onClick={() => toggle(m.key)}
                className="flex h-[22px] w-[38px] cursor-pointer items-center rounded-full p-0.5"
                style={{ background: m.on ? "#284AB1" : "#E6E8EC", justifyContent: m.on ? "flex-end" : "flex-start" }}
              >
                <div className="h-[18px] w-[18px] rounded-full bg-white" />
              </div>
            </div>
            <div
              className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl text-[26px]"
              style={{ background: m.bg }}
            >
              {m.icon}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-semibold text-pms-text">{m.name}</span>
              <span className="whitespace-nowrap text-[12.5px] font-semibold text-pms-primary">
                {m.free ? "Miễn phí" : m.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
