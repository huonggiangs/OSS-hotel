"use client";

import { Modal } from "@/components/ui/Modal";
import { customerSegmentColors, type CustomerRow } from "@/lib/mock-data";

const SEGMENTS = ["Mới", "Khách quen", "VIP"] as const;

// Modal chi tiết khách hàng — pixel-perfect theo khối `showCustomerDetail` (dòng
// 2055-2108 bản gốc): 4 ô số liệu, dropdown đổi phân khúc, lịch sử giao dịch, dịch vụ
// đã dùng, thói quen/sở thích, ghi chú.
export function CustomerDetailModal({
  customer,
  onClose,
  onChangeSegment,
}: {
  customer: CustomerRow;
  onClose: () => void;
  onChangeSegment: (segment: CustomerRow["segment"]) => void;
}) {
  const segColor = customerSegmentColors[customer.segment];

  return (
    <Modal
      title={
        <div>
          <b className="text-[16px]">{customer.name}</b>
          <p className="m-0 mt-1 text-[12.5px] text-pms-muted">
            {customer.phone} · {customer.email}
          </p>
        </div>
      }
      onClose={onClose}
      width={640}
    >
      <div className="flex flex-col gap-[18px] px-6 py-5">
        <div className="grid grid-cols-4 gap-3">
          <Stat value={customer.bookings} label="Số lần đặt" />
          <Stat value={customer.rebookings} label="Đặt lại" />
          <Stat value={customer.careAfterStay} label="CSKH sau lưu trú" />
          <Stat value={customer.spent} label="Tổng chi tiêu" small />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-pms-muted">Phân loại khách hàng:</span>
          <span
            className="rounded-full px-3 py-[5px] text-[12px] font-semibold"
            style={{ background: segColor.bg, color: segColor.fg }}
          >
            {customer.segment}
          </span>
          <select
            value={customer.segment}
            onChange={(e) => onChangeSegment(e.target.value as CustomerRow["segment"])}
            className="rounded-lg border border-pms-border px-2.5 py-[5px] text-[12px] text-pms-text"
          >
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <b className="text-[13.5px]">Lịch sử giao dịch</b>
          <table className="mt-2 w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Ngày", "Nội dung", "Số tiền"].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customer.transactions.map((t, i) => (
                <tr key={i}>
                  <td className="border-b border-pms-divider px-2 py-2 text-pms-muted">{t.date}</td>
                  <td className="border-b border-pms-divider px-2 py-2">{t.desc}</td>
                  <td className="border-b border-pms-divider px-2 py-2 font-semibold">{t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <b className="text-[13.5px]">Dịch vụ đã dùng</b>
          <div className="mt-2 flex flex-wrap gap-2">
            {customer.servicesUsed.length === 0 && <span className="text-[12.5px] text-pms-muted">Chưa sử dụng dịch vụ nào</span>}
            {customer.servicesUsed.map((s) => (
              <span key={s} className="rounded-full bg-pms-primary-soft px-3 py-[5px] text-[12px] font-semibold text-pms-primary">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div>
          <b className="text-[13.5px]">Thói quen &amp; sở thích</b>
          <p className="m-0 mt-1.5 text-[12.5px] text-pms-text">{customer.preferences}</p>
        </div>

        <div>
          <b className="text-[13.5px]">Ghi chú</b>
          <p className="m-0 mt-1.5 text-[12.5px] text-pms-text">{customer.note || "—"}</p>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ value, label, small }: { value: string | number; label: string; small?: boolean }) {
  return (
    <div className="rounded-[10px] bg-pms-divider p-3 text-center">
      <div className={small ? "text-[15px] font-bold" : "text-[18px] font-bold"}>{value}</div>
      <div className="text-[11px] text-pms-muted">{label}</div>
    </div>
  );
}
