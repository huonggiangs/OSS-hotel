import { currencies } from "@/lib/mock-data";

// Trang "Tiền tệ" (mở từ panel Cài đặt) — pixel-perfect theo khối `isCurrency` (dòng
// 1757-1770 bản gốc): bảng danh sách tiền tệ, đánh dấu "Mặc định".
export default function CurrencyPage() {
  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Tiền tệ</h1>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách tiền tệ</h3>
          <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white">+ Thêm tiền tệ</div>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Mã", "Tên", "Tỷ giá", ""].map((h) => (
                <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currencies.map((c) => (
              <tr key={c.code}>
                <td className="border-b border-pms-divider px-2 py-3 font-semibold">{c.code}</td>
                <td className="border-b border-pms-divider px-2 py-3">{c.name}</td>
                <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{c.rate}</td>
                <td className="border-b border-pms-divider px-2 py-3">
                  {c.isDefault && (
                    <span className="rounded-full bg-pms-primary-soft px-2.5 py-1 text-[11px] font-semibold text-pms-primary">Mặc định</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
