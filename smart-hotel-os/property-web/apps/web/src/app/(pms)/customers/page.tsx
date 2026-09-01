"use client";

import { useEffect, useState } from "react";
import { customerSegmentColors, type CustomerRow } from "@/lib/mock-data";
import { CustomerDetailModal } from "@/components/customers/CustomerDetailModal";
import { api, isApiError } from "@/lib/api-client";

// Trang "Khách hàng" — ĐÃ NỐI API THẬT: GET /api/v1/customers (bảng customers
// có sẵn). Đổi phân khúc trong modal chi tiết giờ gọi thật
// PATCH /api/v1/customers/:id (thay vì chỉ setState cục bộ như bản mock cũ).
// Các số liệu tổng hợp (số lần đặt/đặt lại/CSKH/tổng chi tiêu/giao dịch/dịch
// vụ đã dùng) CHƯA có bảng thống kê tương ứng trong MVP này — hiển thị "—"
// thay vì số liệu trang trí giả, xem PROGRESS.md.
interface ApiCustomer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  segment: string;
  note: string | null;
}

function mapCustomer(c: ApiCustomer): CustomerRow {
  return {
    key: c.id,
    name: c.full_name,
    phone: c.phone ?? "—",
    email: c.email ?? "—",
    bookings: 0,
    rebookings: 0,
    careAfterStay: 0,
    spent: "—",
    segment: (c.segment as CustomerRow["segment"]) || "Mới",
    note: c.note ?? "",
    preferences: "Chưa có dữ liệu tổng hợp.",
    servicesUsed: [],
    transactions: [],
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: ApiCustomer[] }>("/api/v1/customers");
      setCustomers(res.items.map(mapCustomer));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  }

  const selected = customers.find((c) => c.key === selectedKey) || null;

  async function handleChangeSegment(segment: CustomerRow["segment"]) {
    if (!selected) return;
    setCustomers((prev) => prev.map((c) => (c.key === selected.key ? { ...c, segment } : c)));
    try {
      await api.patch(`/api/v1/customers/${selected.key}`, { segment });
    } catch {
      load();
    }
  }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;
  if (error)
    return (
      <div className="rounded-xl bg-white p-6 text-[13px] text-pms-danger shadow-card">
        {error} <span className="cursor-pointer font-semibold text-pms-primary" onClick={load}>Thử lại</span>
      </div>
    );

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Khách hàng</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">{customers.length} khách hàng đã lưu trú</p>

      <div className="rounded-xl bg-white p-4 shadow-card sm:p-6">
        <div className="space-y-3 md:hidden">
          {customers.map((c) => {
            const segColor = customerSegmentColors[c.segment] ?? customerSegmentColors["Mới"];
            return (
              <button key={c.key} type="button" onClick={() => setSelectedKey(c.key)} className="block w-full rounded-lg border border-pms-divider p-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-pms-primary">{c.name}</span>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: segColor.bg, color: segColor.fg }}>{c.segment}</span>
                </div>
                <p className="mt-2 break-words text-[12px] text-pms-muted">{c.phone} · {c.email}</p>
                {c.note && <p className="mt-1 line-clamp-2 text-[12px] text-pms-muted">{c.note}</p>}
              </button>
            );
          })}
          {customers.length === 0 && <p className="py-4 text-center text-[13px] text-pms-muted">Chưa có khách hàng.</p>}
        </div>
        <table className="hidden w-full border-collapse text-[13px] md:table">
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
              const segColor = customerSegmentColors[c.segment] ?? customerSegmentColors["Mới"];
              return (
                <tr key={c.key} className="cursor-pointer" onClick={() => setSelectedKey(c.key)}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold text-pms-primary">{c.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.phone}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.email}</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
                  <td className="border-b border-pms-divider px-2 py-3">—</td>
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
        <CustomerDetailModal customer={selected} onClose={() => setSelectedKey(null)} onChangeSegment={handleChangeSegment} />
      )}
    </div>
  );
}
