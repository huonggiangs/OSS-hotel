"use client";

import { useState } from "react";
import { taxes } from "@/lib/mock-data";
import { AddTaxModal } from "@/components/tax/AddTaxModal";

// Trang "Thuế & phí" (mở từ panel Cài đặt) — pixel-perfect theo khối `isTax` (dòng
// 1772-1807 bản gốc): bảng danh sách thuế/phí + modal Thêm.
export default function TaxPage() {
  const [showAdd, setShowAdd] = useState(false);

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
            {taxes.map((t) => (
              <tr key={t.name}>
                <td className="border-b border-pms-divider px-2 py-3 font-semibold">{t.name}</td>
                <td className="border-b border-pms-divider px-2 py-3">{t.rate}</td>
                <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{t.applyTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddTaxModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
