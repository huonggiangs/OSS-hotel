"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { api, isApiError } from "@/lib/api-client";
import { useSettings } from "@/lib/useSettings";

// Trang "Thanh toán" — ĐÃ NỐI API THẬT: bảng "Hoá đơn hôm nay" gọi
// GET /api/v1/payments (bảng invoices có sẵn). Danh sách kênh thanh toán/hình
// thức thanh toán đọc từ property_settings (group "payment") — checkbox giữ
// tĩnh đúng bản gốc (bản gốc không có onClick trên các checkbox này), chỉ
// nguồn dữ liệu danh sách chuyển từ mock sang API thật. Các trường cấu hình
// cổng thanh toán (VNPay/MoMo/Stripe) vẫn hiển thị placeholder tĩnh — bản gốc
// không có input thật cho các trường này (chỉ hiện giá trị mẫu).
interface ApiInvoice {
  id: string;
  code: string;
  guest_name: string;
  method: string;
  amount: string;
  status: "PAID" | "PENDING" | "FAILED";
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

interface PaymentSettings {
  channels: string[];
  selectedChannels: string[];
  howToPay: string[];
  selectedHowToPay: string[];
}
const FALLBACK: PaymentSettings = { channels: [], selectedChannels: [], howToPay: [], selectedHowToPay: [] };

export default function PaymentPage() {
  const { data: settings, loading: loadingSettings } = useSettings<PaymentSettings>("payment", FALLBACK);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: ApiInvoice[] }>("/api/v1/payments");
      setInvoices(res.items);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được danh sách hoá đơn.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Thanh toán</h1>

      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-0.5 text-[20px] font-bold">Thanh toán</h3>
        <p className="mb-5 text-[13px] text-pms-text">Thanh toán với mọi hình thức</p>

        <div className="mb-6 grid grid-cols-[220px_1fr] gap-4">
          <div>
            <div className="text-[13px] font-semibold">Kênh thanh toán</div>
            <div className="max-w-[180px] text-[11px] text-pms-muted">Lưu lại toàn bộ nhật ký hoạt động, bao gồm hoạt động bất thường.</div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {!loadingSettings &&
              settings.channels.map((c) => <Checkbox key={c} label={c} checked={settings.selectedChannels.includes(c)} />)}
          </div>
        </div>

        <GatewaySection title="VNPay" desc="Cổng thanh toán nội địa phổ biến nhất Việt Nam — thẻ ATM, QR, ví điện tử">
          <GatewayField label="Mã Terminal (TMN Code)" value="VNPAYXXXX" />
          <GatewayField label="Chuỗi bí mật (Secret Key)" value="••••••••••••••••" />
        </GatewaySection>

        <GatewaySection title="MoMo / ZaloPay" desc="Ví điện tử phổ biến tại Việt Nam">
          <GatewayField label="Partner Code" value="MOMOXXXX / ZALOXXXX" />
          <GatewayField label="Access Key" value="••••••••••••••••" />
          <GatewayField label="Secret Key" value="••••••••••••••••" />
        </GatewaySection>

        <GatewaySection title="Stripe (quốc tế)" desc="Visa, Mastercard, Apple Pay, Google Pay, PayPal cho khách quốc tế">
          <GatewayField label="Publishable Key" value="pk_live_••••••••" />
          <GatewayField label="Secret Key" value="sk_live_••••••••" />
        </GatewaySection>

        <h3 className="mb-0.5 text-[20px] font-bold">Hình thức thanh toán</h3>
        <p className="mb-5 text-[13px] text-pms-text">Thanh toán với mọi hình thức</p>
        <div className="grid grid-cols-[220px_1fr] gap-4">
          <span />
          <div className="flex flex-col gap-3.5">
            {!loadingSettings &&
              settings.howToPay.map((c) => <Checkbox key={c} label={c} checked={settings.selectedHowToPay.includes(c)} />)}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-4 text-[15px] font-semibold">Hoá đơn hôm nay</h3>
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {error && (
          <div className="text-[13px] text-pms-danger">
            {error} <span className="cursor-pointer font-semibold text-pms-primary" onClick={load}>Thử lại</span>
          </div>
        )}
        {!loading && !error && (
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
              {invoices.map((inv) => {
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
        )}
      </div>
    </div>
  );
}

function Checkbox({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-[13px]">
      <span
        className="inline-block h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2"
        style={checked ? { background: "#284AB1", borderColor: "#284AB1" } : undefined}
      />
      {label}
    </label>
  );
}

function GatewaySection({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <>
      <h3 className="mb-0.5 text-[20px] font-bold">{title}</h3>
      <p className="mb-5 text-[13px] text-pms-text">{desc}</p>
      <div className="mb-6 flex max-w-[760px] flex-col gap-[18px]">{children}</div>
    </>
  );
}

function GatewayField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[238px_1fr] items-center gap-6">
      <span className="text-[13px]">{label}</span>
      <div className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">{value}</div>
    </div>
  );
}
