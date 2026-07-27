import { auditStats, invoices } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui/StatusPill";

// Trang "Kế toán đêm" — pixel-perfect theo khối `isNightAudit` (dòng 1235-1273 bản gốc):
// 4 thẻ KPI đối soát + bảng hoá đơn cần đối soát (dùng chung dữ liệu `invoices` với
// trang Thanh toán). Nút "Chạy kế toán đêm" trong bản gốc không có logic (không có
// onClick) — giữ nguyên là nút tĩnh, không tự thêm hành vi.
export default function NightAuditPage() {
  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Kế toán đêm</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Đối soát doanh thu cuối ngày</p>

      <div className="mb-5 grid grid-cols-4 gap-4">
        {auditStats.map((s) => (
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
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="border-b border-pms-divider px-2 py-3">{inv.id}</td>
                <td className="border-b border-pms-divider px-2 py-3">{inv.guest}</td>
                <td className="border-b border-pms-divider px-2 py-3">{inv.method}</td>
                <td className="border-b border-pms-divider px-2 py-3 font-semibold">{inv.amount}</td>
                <td className="border-b border-pms-divider px-2 py-3">
                  <StatusPill bg={inv.bg} fg={inv.fg}>
                    {inv.status}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
