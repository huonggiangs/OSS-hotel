"use client";

import { useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { AddTaxModal } from "@/components/tax/AddTaxModal";

interface TaxItem {
  name: string;
  rate: string;
  applyTo: string;
}
interface TaxData {
  items: TaxItem[];
}
const FALLBACK: TaxData = { items: [] };

// Trang "Thuế & phí" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT: property_settings
// nhóm "tax". Modal Thêm giữ tĩnh (đúng bản gốc, không có form thật).
export default function TaxPage() {
  const [showAdd, setShowAdd] = useState(false);
  const { data, loading, error } = useSettings<TaxData>("tax", FALLBACK);

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Thuế &amp; phí</h1>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách thuế/phí áp dụng</h3>
          <div
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAdd(true)}
          >
            + Thêm
          </div>
        </div>
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {error && <div className="text-[13px] text-red-500">{error}</div>}
        {!loading && (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["Tên", "Mức thu", "Áp dụng cho"].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.name}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{t.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{t.rate}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{t.applyTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddTaxModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
