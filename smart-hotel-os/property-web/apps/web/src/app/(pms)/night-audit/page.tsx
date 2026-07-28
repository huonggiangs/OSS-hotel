"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { api, isApiError } from "@/lib/api-client";

// Trang "Kế toán đêm" — ĐÃ NỐI API THẬT: GET /api/v1/dashboard/night-audit
// (mới thêm, tính từ invoices/rooms thật, xem apps/api/src/repositories/dashboard.repo.ts
// hàm nightAudit). Nút "Chạy kế toán đêm" giữ tĩnh đúng bản gốc (không có
// onClick trong thiết kế gốc).
interface ApiInvoice {
  id: string;
  code: string;
  guest_name: string;
  method: string;
  amount: string;
  status: "PAID" | "PENDING" | "FAILED";
}
interface NightAuditSummary {
  invoices_issued_today: number;
  room_revenue_today: number;
  service_revenue_today: number;
  reconciliation_diff: number;
  invoices_today: ApiInvoice[];
}
const METHOD_LABEL: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Thẻ ngân hàng",
  OTA_WALLET: "Ví OTA",
  VNPAY: "VNPay",
  MOMO: "MoMo",
  ZALOPAY: "ZaloPay",
  STRIPE: "Stripe",
};
const STATUS_STYLE: Record<ApiInvoice["status"], { label: string; bg: string; fg: string }> = {
  PAID: { label: "Đã thanh toán", bg: "#E6F9EE", fg: "#00C853" },
  PENDING: { label: "Chờ xác nhận", bg: "#FFF7E0", fg: "#946200" },
  FAILED: { label: "Thất bại", bg: "#FDECEE", fg: "#CC2F42" },
};
function formatVnd(v: string | number) {
  return Number(v).toLocaleString("vi-VN") + "đ";
}

export default function NightAuditPage() {
  const [summary, setSummary] = useState<NightAuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<NightAuditSummary>("/api/v1/dashboard/night-audit");
      setSummary(res);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được dữ liệu kế toán đêm.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;
  if (error || !summary)
    return (
      <div className="rounded-xl bg-white p-6 text-[13px] text-pms-danger shadow-card">
        {error} <span className="cursor-pointer font-semibold text-pms-primary" onClick={load}>Thử lại</span>
      </div>
    );

  const stats = [
    { label: "Hoá đơn đã phát hành", value: String(summary.invoices_issued_today) },
    { label: "Doanh thu phòng", value: formatVnd(summary.room_revenue_today) },
    { label: "Doanh thu dịch vụ", value: formatVnd(summary.service_revenue_today) },
    { label: "Chênh lệch đối soát", value: formatVnd(summary.reconciliation_diff) },
  ];

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Kế toán đêm</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Đối soát doanh thu cuối ngày</p>

      <div className="mb-5 grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white px-5 py-[18px] shadow-card">
            <span className="text-[12px] text-pms-muted">{s.label}</span>
            <b className="mt-1.5 block text-[22px]">{s.value}</b>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Hoá đơn cần đối soát</h3>
          <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white">
            Chạy kế toán đêm
          </div>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Hoá đơn", "Khách hàng", "Hình thức", "Số tiền", "Trạng thái"].map((h) => (
                <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.invoices_today.map((inv) => {
              const st = STATUS_STYLE[inv.status];
              return (
                <tr key={inv.id}>
                  <td className="border-b border-pms-divider px-2 py-3">{inv.code}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{inv.guest_name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{METHOD_LABEL[inv.method] ?? inv.method}</td>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{formatVnd(inv.amount)}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <StatusPill bg={st.bg} fg={st.fg}>
                      {st.label}
                    </StatusPill>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
