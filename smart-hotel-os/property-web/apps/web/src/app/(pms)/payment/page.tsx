import { paymentChannels, howToPay, invoices } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui/StatusPill";

// Trang "Thanh toán" (mở từ panel Cài đặt) — pixel-perfect theo khối `isPayment`
// (dòng 1051-1124 trong bản gốc): cấu hình kênh thanh toán + cổng thanh toán
// (VNPay/MoMo-ZaloPay/Stripe) + bảng hoá đơn hôm nay.
export default function PaymentPage() {
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
            {paymentChannels.map((c) => (
              <Checkbox key={c} label={c} />
            ))}
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
            {howToPay.map((c) => (
              <Checkbox key={c} label={c} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-4 text-[15px] font-semibold">Hoá đơn hôm nay</h3>
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

function Checkbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-2.5 text-[13px]">
      <span className="inline-block h-4 w-4 flex-shrink-0 rounded border-[1.5px] border-pms-muted-2" />
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
