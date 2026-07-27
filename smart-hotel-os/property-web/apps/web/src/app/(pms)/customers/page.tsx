"use client";

import { useState } from "react";
import { customersSeed, customerSegmentColors, type CustomerRow } from "@/lib/mock-data";
import { CustomerDetailModal } from "@/components/customers/CustomerDetailModal";

// Trang "Khách hàng" — pixel-perfect theo khối `isCustomers` (dòng 2031-2109 bản gốc):
// bảng danh sách khách hàng (bấm 1 dòng để xem chi tiết) + modal chi tiết cho phép đổi
// phân khúc (segment) tại chỗ — đồng bộ ngược lại bảng danh sách, đúng hành vi
// `customerSegmentOverrides` bản gốc.
export default function CustomersPage() {
  const [segments, setSegments] = useState<Record<string, CustomerRow["segment"]>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const customers = customersSeed.map((c) => ({ ...c, segment: segments[c.key] || c.segment }));
  const selected = customers.find((c) => c.key === selectedKey) || null;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Khách hàng</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">1.603 khách hàng đã lưu trú</p>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Khách hàng", "Số điện thoại", "Email", "Số lần đặt", "Đặt lại", "Chăm sóc sau lưu trú", "Tổng chi tiêu", "Phân khúc", "Ghi chú"].map(
                (h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const segColor = customerSegmentColors[c.segment];
              return (
                <tr key={c.key} className="cursor-pointer" onClick={() => setSelectedKey(c.key)}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold text-pms-primary">{c.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.phone}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.email}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.bookings}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.rebookings}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.careAfterStay}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{c.spent}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: segColor.bg, color: segColor.fg }}
                    >
                      {c.segment}
                    </span>
                  </td>
                  <td className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-pms-divider px-2 py-3 text-pms-muted">
                    {c.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <CustomerDetailModal
          customer={selected}
          onClose={() => setSelectedKey(null)}
          onChangeSegment={(segment) => setSegments((prev) => ({ ...prev, [selected.key]: segment }))}
        />
      )}
    </div>
  );
}
