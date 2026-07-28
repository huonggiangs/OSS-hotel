"use client";

import { useSettings } from "@/lib/useSettings";
import { StatusPill } from "@/components/ui/StatusPill";

interface PrintTemplate {
  doc: string;
  template: string;
  size: string;
  linked: boolean;
}
interface PrinterData {
  defaultPrinter: string;
  paperSize: string;
  templates: PrintTemplate[];
}
const FALLBACK: PrinterData = { defaultPrinter: "", paperSize: "", templates: [] };

// Trang "Máy in & mẫu in" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT:
// property_settings nhóm "printer". statusLabel/màu suy ra tại chỗ từ `linked`
// (đúng công thức bản gốc, backend chỉ lưu boolean thô).
export default function PrinterPage() {
  const { data, loading, error } = useSettings<PrinterData>("printer", FALLBACK);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Máy in &amp; mẫu in</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Cấu hình máy in tại quầy và chọn mẫu in áp dụng cho từng loại chứng từ</p>

      {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
      {error && <div className="text-[13px] text-red-500">{error}</div>}

      {!loading && (
        <>
          <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
            <h3 className="mb-3.5 text-[15px] font-semibold">Máy in</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[12px]">Máy in mặc định</label>
                <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">
                  {data.defaultPrinter} <span>⌄</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px]">Khổ giấy</label>
                <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px]">
                  {data.paperSize} <span>⌄</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-semibold">Mẫu in</h3>
              <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white">+ Thêm mẫu in</div>
            </div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Loại chứng từ", "Mẫu đang dùng", "Khổ giấy", "Trạng thái", ""].map((h) => (
                    <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.templates.map((t) => (
                  <tr key={t.doc}>
                    <td className="border-b border-pms-divider px-2 py-3 font-semibold">{t.doc}</td>
                    <td className="border-b border-pms-divider px-2 py-3">{t.template}</td>
                    <td className="border-b border-pms-divider px-2 py-3">{t.size}</td>
                    <td className="border-b border-pms-divider px-2 py-3">
                      <StatusPill bg={t.linked ? "#E9FBEF" : "#F4F5F6"} fg={t.linked ? "#00C853" : "#777E90"}>
                        {t.linked ? "Đang dùng" : "Chưa cấu hình"}
                      </StatusPill>
                    </td>
                    <td className="cursor-pointer border-b border-pms-divider px-2 py-3 font-semibold text-pms-primary">Xem mẫu</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
