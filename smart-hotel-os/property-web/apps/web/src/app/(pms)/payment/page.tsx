"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { api, isApiError } from "@/lib/api-client";
import { useSettings } from "@/lib/useSettings";

// Trang "Thanh toán" — ĐÃ NỐI API THẬT: bảng "Hoá đơn hôm nay" gọi
// GET /api/v1/payments. Danh sách kênh thanh toán đọc từ property_settings
// (group "payment") — CHỦ CƠ SỞ đã phản ánh: các kênh VNPay/MoMo/ZaloPay/
// Stripe/... hiển thị như đang bật nhưng KHÔNG có API thật đứng sau, gây hiểu
// lầm. Từ bản này: mọi kênh trừ SePay hiển thị RÕ RÀNG là "Chưa hỗ trợ"
// (disabled, không xoá khỏi danh sách theo đúng yêu cầu), còn SePay (chuyển
// khoản/VietQR) là tích hợp THẬT — bật/tắt, cấu hình tài khoản/API Token, nút
// "Đồng bộ giao dịch ngay" gọi thẳng SePay, và QR nhận tiền cho khách quét.
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/backend";

interface SepaySettings {
  enabled: boolean;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  apiToken: string;
  hasApiToken: boolean;
}
interface PaymentSettings {
  channels: string[];
  selectedChannels: string[];
  howToPay: string[];
  selectedHowToPay: string[];
  sepay: SepaySettings;
}
const FALLBACK_SEPAY: SepaySettings = {
  enabled: false,
  bankAccount: "",
  bankName: "",
  accountHolder: "",
  apiToken: "",
  hasApiToken: false,
};
const FALLBACK: PaymentSettings = {
  channels: [],
  selectedChannels: [],
  howToPay: [],
  selectedHowToPay: [],
  sepay: FALLBACK_SEPAY,
};

export default function PaymentPage() {
  const { data: settings, loading: loadingSettings, saving, save } = useSettings<PaymentSettings>("payment", FALLBACK);
  const [form, setForm] = useState<PaymentSettings>(FALLBACK);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/api/v1/payments/sepay/webhook`;

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!loadingSettings) setForm(settings.sepay ? settings : { ...settings, sepay: FALLBACK_SEPAY });
  }, [loadingSettings, settings]);

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

  function setSepay(patch: Partial<SepaySettings>) {
    setForm((f) => ({ ...f, sepay: { ...f.sepay, ...patch } }));
  }

  async function handleSaveSepay() {
    setSaveMsg(null);
    try {
      await save(form);
      setSaveMsg("Đã lưu cấu hình SePay.");
    } catch {
      // useSettings đã set error riêng, không cần xử lý thêm ở đây
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await api.post<{ checked: number; matched: number }>("/api/v1/payments/sepay/sync");
      setSyncMsg(`Đã kiểm tra ${res.checked} giao dịch, khớp được ${res.matched} hoá đơn.`);
      load();
    } catch (err) {
      setSyncMsg(isApiError(err) ? err.message : "Đồng bộ giao dịch thất bại.");
    } finally {
      setSyncing(false);
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Thanh toán</h1>

      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-0.5 text-[20px] font-bold">Thanh toán</h3>
        <p className="mb-5 text-[13px] text-pms-text">Thanh toán với mọi hình thức</p>

        <div className="mb-6 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <div className="text-[13px] font-semibold">Kênh thanh toán</div>
            <div className="max-w-[180px] text-[11px] text-pms-muted">
              Chỉ SePay hiện có tích hợp API thật. Các kênh khác hiển thị để tham khảo, chưa thể sử dụng.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {!loadingSettings &&
              settings.channels.map((c) => (
                <Checkbox key={c} label={c} checked={settings.selectedChannels.includes(c)} disabled={c !== "SePay"} />
              ))}
          </div>
        </div>

        <GatewaySection title="VNPay" desc="Cổng thanh toán nội địa phổ biến nhất Việt Nam — thẻ ATM, QR, ví điện tử" unconfigured>
          <GatewayField label="Mã Terminal (TMN Code)" value="VNPAYXXXX" />
          <GatewayField label="Chuỗi bí mật (Secret Key)" value="••••••••••••••••" />
        </GatewaySection>

        <GatewaySection title="MoMo / ZaloPay" desc="Ví điện tử phổ biến tại Việt Nam" unconfigured>
          <GatewayField label="Partner Code" value="MOMOXXXX / ZALOXXXX" />
          <GatewayField label="Access Key" value="••••••••••••••••" />
          <GatewayField label="Secret Key" value="••••••••••••••••" />
        </GatewaySection>

        <GatewaySection title="Stripe (quốc tế)" desc="Visa, Mastercard, Apple Pay, Google Pay, PayPal cho khách quốc tế" unconfigured>
          <GatewayField label="Publishable Key" value="pk_live_••••••••" />
          <GatewayField label="Secret Key" value="sk_live_••••••••" />
        </GatewaySection>

        <GatewaySection
          title="SePay"
          desc="Chuyển khoản ngân hàng / VietQR — tự động khớp giao dịch với hoá đơn, tích hợp API thật"
        >
          {loadingSettings ? (
            <div className="text-[13px] text-pms-muted">Đang tải...</div>
          ) : (
            <>
              <div className="grid gap-2 md:grid-cols-[238px_minmax(0,1fr)] md:items-center md:gap-6">
                <span className="text-[13px]">Bật SePay</span>
                <div
                  className="flex h-6 w-11 cursor-pointer items-center rounded-full p-0.5 transition-colors"
                  style={{ background: form.sepay.enabled ? "#284AB1" : "#D6D9DF" }}
                  onClick={() => setSepay({ enabled: !form.sepay.enabled })}
                >
                  <div
                    className="h-5 w-5 rounded-full bg-white transition-transform"
                    style={{ transform: form.sepay.enabled ? "translateX(20px)" : "translateX(0)" }}
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-[238px_minmax(0,1fr)] md:items-center md:gap-6">
                <span className="text-[13px]">Số tài khoản ngân hàng</span>
                <input
                  value={form.sepay.bankAccount}
                  onChange={(e) => setSepay({ bankAccount: e.target.value })}
                  className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                  placeholder="VD: 0123456789"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-[238px_minmax(0,1fr)] md:items-center md:gap-6">
                <div>
                  <div className="text-[13px]">Tên ngân hàng</div>
                  <div className="text-[11px] text-pms-muted">VD: Vietcombank, ACB, MB, Techcombank...</div>
                </div>
                <input
                  value={form.sepay.bankName}
                  onChange={(e) => setSepay({ bankName: e.target.value })}
                  className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                  placeholder="Vietcombank"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-[238px_minmax(0,1fr)] md:items-center md:gap-6">
                <span className="text-[13px]">Tên chủ tài khoản</span>
                <input
                  value={form.sepay.accountHolder}
                  onChange={(e) => setSepay({ accountHolder: e.target.value })}
                  className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                  placeholder="CONG TY TNHH..."
                />
              </div>

              <div className="grid gap-2 md:grid-cols-[238px_minmax(0,1fr)] md:items-center md:gap-6">
                <div>
                  <div className="text-[13px]">API Token</div>
                  <div className="text-[11px] text-pms-muted">
                    Tạo tại my.sepay.vn → Cấu hình Công ty → API Access.
                    {form.sepay.hasApiToken ? " Để trống nếu không đổi." : ""}
                  </div>
                </div>
                <input
                  type="password"
                  value={form.sepay.apiToken}
                  onChange={(e) => setSepay({ apiToken: e.target.value })}
                  className="rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                  placeholder={form.sepay.hasApiToken ? "•••••••••••••••• (đã cấu hình)" : "Dán API Token từ SePay"}
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSaveSepay}
                  disabled={saving}
                  className="rounded-lg bg-pms-primary px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu cấu hình SePay"}
                </button>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="rounded-lg border border-pms-border px-4 py-2.5 text-[13px] font-semibold disabled:opacity-60"
                >
                  {syncing ? "Đang đồng bộ..." : "Đồng bộ giao dịch ngay"}
                </button>
                {saveMsg && <span className="text-[12px] text-pms-primary">{saveMsg}</span>}
              </div>
              {syncMsg && <div className="text-[12.5px] text-pms-text">{syncMsg}</div>}

              <div className="mt-2 rounded-lg bg-pms-divider px-3.5 py-3">
                <div className="mb-1 text-[12px] font-semibold">Webhook nhận thanh toán tự động</div>
                <div className="mb-2 text-[11.5px] text-pms-muted">
                  Dán URL này vào SePay (Cấu hình Công ty → Webhook) để nhận thông báo thanh toán theo thời gian thực. Chỉ
                  hoạt động khi hệ thống được triển khai với địa chỉ công khai.
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded border border-pms-border bg-white px-2.5 py-1.5 text-[11.5px]">
                    {webhookUrl}
                  </code>
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="whitespace-nowrap rounded-lg border border-pms-border px-3 py-1.5 text-[12px] font-semibold"
                  >
                    {copied ? "Đã sao chép" : "Sao chép"}
                  </button>
                </div>
              </div>
            </>
          )}
        </GatewaySection>

        <h3 className="mb-0.5 text-[20px] font-bold">Hình thức thanh toán</h3>
        <p className="mb-5 text-[13px] text-pms-text">Thanh toán với mọi hình thức</p>
        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
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

function Checkbox({
  label,
  checked,
  disabled,
  onClick,
}: {
  label: string;
  checked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-2.5 text-[13px] ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      onClick={disabled ? undefined : onClick}
    >
      <span
        className="inline-block h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2"
        style={checked && !disabled ? { background: "#284AB1", borderColor: "#284AB1" } : undefined}
      />
      {label}
      {disabled && <span className="text-[11px] text-pms-muted">(Chưa hỗ trợ)</span>}
    </label>
  );
}

function GatewaySection({
  title,
  desc,
  unconfigured,
  children,
}: {
  title: string;
  desc: string;
  unconfigured?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-0.5 flex items-center gap-2.5">
        <h3 className="text-[20px] font-bold">{title}</h3>
        {unconfigured && (
          <span className="rounded-full bg-[#FDECEE] px-2.5 py-1 text-[11px] font-semibold text-pms-danger">
            Chưa cấu hình — cần tích hợp API đối tác
          </span>
        )}
      </div>
      <p className="mb-5 text-[13px] text-pms-text">{desc}</p>
      <div className="mb-6 flex max-w-[760px] flex-col gap-[18px]">{children}</div>
    </>
  );
}

function GatewayField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-[238px_minmax(0,1fr)] md:items-center md:gap-6">
      <span className="text-[13px]">{label}</span>
      <div className="cursor-not-allowed rounded-lg border border-pms-border bg-pms-divider px-3 py-2.5 text-[13px] text-pms-muted-2">
        {value}
      </div>
    </div>
  );
}
