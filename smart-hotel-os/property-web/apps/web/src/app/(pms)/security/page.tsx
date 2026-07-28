"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { accountActivity } from "@/lib/mock-data";

interface SecurityItem {
  key: string;
  label: string;
  desc: string;
  on: boolean;
}
interface SecurityData {
  items: SecurityItem[];
}
const FALLBACK: SecurityData = { items: [] };

// Trang "Bảo vệ" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT: property_settings
// nhóm "security". Công tắc bấm là LƯU NGAY (PUT), không cần nút "Cập nhật"
// riêng — đúng hành vi công tắc cấu hình bật/tắt tức thời. Nhật ký hoạt động
// tài khoản vẫn dùng mock (chưa có bảng audit trình bày riêng cho UI này —
// bảng audit_log thật đã có nhưng có shape khác, để dành phiên sau nối đúng).
export default function SecurityPage() {
  const { data, loading, saving, save } = useSettings<SecurityData>("security", FALLBACK);
  const [items, setItems] = useState<SecurityItem[]>([]);

  useEffect(() => {
    if (!loading) setItems(data.items);
  }, [loading, data]);

  function toggle(key: string) {
    const next = items.map((it) => (it.key === key ? { ...it, on: !it.on } : it));
    setItems(next);
    save({ items: next });
  }

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Bảo mật</h1>

      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-3.5 text-[15px] font-semibold">
          Chính sách bảo mật {saving && <span className="text-[11px] font-normal text-pms-muted">(đang lưu...)</span>}
        </h3>
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {!loading &&
          items.map((s) => (
            <div key={s.key} className="flex items-center justify-between border-b border-pms-divider py-3">
              <div>
                <div className="text-[13px] font-semibold">{s.label}</div>
                <div className="text-[12px] text-pms-muted">{s.desc}</div>
              </div>
              <div
                className="relative h-6 w-10 flex-shrink-0 cursor-pointer rounded-full"
                style={{ background: s.on ? "#284AB1" : "#E6E8EC" }}
                onClick={() => toggle(s.key)}
              >
                <div className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white" style={{ left: s.on ? "auto" : 3, right: s.on ? 3 : "auto" }} />
              </div>
            </div>
          ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-3.5 text-[15px] font-semibold">Nhật ký hoạt động tài khoản</h3>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Người dùng", "Hành động", "Thời gian", "IP"].map((h) => (
                <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accountActivity.map((a, i) => (
              <tr key={i}>
                <td className="border-b border-pms-divider px-2 py-3">{a.user}</td>
                <td className="border-b border-pms-divider px-2 py-3">{a.action}</td>
                <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{a.time}</td>
                <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
