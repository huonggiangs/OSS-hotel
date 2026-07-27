import { channels } from "@/lib/mock-data";

// Trang "Kênh bán (OTA)" (mở từ panel Cài đặt) — pixel-perfect theo khối `isChannel`
// (dòng 1274-1287 bản gốc): lưới 3 cột thẻ kênh OTA với trạng thái kết nối.
export default function ChannelPage() {
  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Kênh bán (OTA)</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Đồng bộ giá &amp; phòng trống theo thời gian thực</p>
      <div className="grid grid-cols-3 gap-4">
        {channels.map((ch) => (
          <div key={ch.name} className="flex flex-col gap-2.5 rounded-xl border border-pms-border bg-white p-5">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-[13px] font-bold text-white"
              style={{ background: ch.color }}
            >
              {ch.initial}
            </div>
            <div className="text-[14px] font-semibold">{ch.name}</div>
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: ch.statusColor }}>
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: ch.statusColor }} />
              {ch.status}
            </div>
            <div className="text-[12px] text-pms-muted">{ch.stat}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
