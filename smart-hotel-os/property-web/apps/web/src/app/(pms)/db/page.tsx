import { dbInfo } from "@/lib/mock-data";

// Trang "Cơ sở dữ liệu" (mở từ panel Cài đặt) — pixel-perfect theo khối `isDb` (dòng
// 1943-1956 bản gốc): lưới thông tin sao lưu + 2 nút hành động tĩnh.
export default function DbPage() {
  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Cơ sở dữ liệu</h1>
      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        <div className="grid grid-cols-2 gap-4">
          {dbInfo.map((d) => (
            <div key={d.label}>
              <div className="mb-1 text-[12px] text-pms-muted">{d.label}</div>
              <b className="text-[14px]">{d.value}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white">Sao lưu ngay</div>
        <div className="cursor-pointer rounded-[10px] border border-pms-border px-[18px] py-2.5 text-[13px] font-semibold text-pms-text">
          Xuất dữ liệu
        </div>
      </div>
    </div>
  );
}
