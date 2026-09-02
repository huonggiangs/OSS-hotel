"use client";

import { useState } from "react";
import { useSettings } from "@/lib/useSettings";
import Link from "next/link";

// Trang "Module nâng cao" — ĐÃ NỐI API THẬT: property_settings nhóm
// "modules". Bật/tắt module giờ lưu thật qua PUT (thay vì chỉ setState cục
// bộ như bản mock trước đây).
interface ModuleItem {
  key: string;
  name: string;
  icon: string;
  bg: string;
  price?: string;
  free?: boolean;
  on: boolean;
}
interface ModulesData {
  items: ModuleItem[];
}
const FALLBACK: ModulesData = { items: [] };
const MODULE_LABELS: Record<string, string> = {
  power: "Điều khiển điện", notify: "Thông báo", cots: "Gọi dịch vụ trong phòng", housekeeping: "Dọn phòng", rfid: "Mã QR phòng",
  camera: "Camera giám sát", passport: "Giấy tờ tùy thân", gatelock: "Khóa cổng", cms: "Quản trị nội dung và kênh bán", marketing2: "Tiếp thị",
  account: "Tài khoản", doorlock: "Khóa cửa", task: "Công việc", hrm: "Nhân sự", webbooking: "Đặt phòng qua trang web", otasync: "Đồng bộ kênh bán",
  extend: "Gia hạn lưu trú", breakeven: "Điểm hòa vốn", combo: "Gói dịch vụ", aicamera: "Thống kê bằng camera thông minh", screenlink: "Màn hình phụ", contactlessagent: "Trợ lý QR trong phòng",
};
const MODULE_FLOWS: Record<string, { label: string; href: string }> = {
  power: { label: "Gán thiết bị và kiểm tra điện", href: "/price" }, notify: { label: "Soạn nội dung thông báo", href: "/email" }, cots: { label: "Tạo dịch vụ để khách gọi", href: "/services" },
  housekeeping: { label: "Xem hàng đợi dọn phòng", href: "/rooms?status=DIRTY" }, rfid: { label: "In mã QR cho phòng", href: "/rooms" }, camera: { label: "Khai báo thiết bị camera", href: "/assets" },
  passport: { label: "Mở quy trình nhận phòng", href: "/rooms" }, gatelock: { label: "Gán khóa theo khu vực", href: "/price" }, cms: { label: "Kiểm tra kênh bán", href: "/channel" }, marketing2: { label: "Tạo chiến dịch đầu tiên", href: "/marketing" },
  account: { label: "Phân quyền người dùng", href: "/users" }, doorlock: { label: "Gán khóa cho phòng", href: "/price" }, task: { label: "Tạo công việc vận hành", href: "/rooms" }, hrm: { label: "Tạo tài khoản nhân sự", href: "/users" },
  webbooking: { label: "Cấu hình nhận đặt phòng", href: "/booking" }, otasync: { label: "Kết nối kênh bán", href: "/sync" }, extend: { label: "Thiết lập gia hạn", href: "/rooms" }, breakeven: { label: "Xem điểm hòa vốn", href: "/value-dashboard" },
  combo: { label: "Tạo gói dịch vụ", href: "/services" }, aicamera: { label: "Xem báo cáo vận hành", href: "/dashboard" }, screenlink: { label: "Mở màn hình phụ", href: "/dashboard" }, contactlessagent: { label: "Thiết lập trợ lý QR", href: "/amenities" },
};

export default function ModulesPage() {
  const { data, loading, save, error } = useSettings<ModulesData>("modules", FALLBACK);
  const [notice, setNotice] = useState<string | null>(null);

  async function toggle(key: string) {
    const module = data.items.find((item) => item.key === key);
    if (!module) return;
    const nextOn = !module.on;
    try {
      await save({ items: data.items.map((m) => (m.key === key ? { ...m, on: nextOn } : m)) });
      setNotice(nextOn ? `Đã bật “${MODULE_LABELS[key] ?? module.name}”. Bước tiếp theo: ${MODULE_FLOWS[key]?.label ?? "mở cấu hình chi tiết"}.` : `Đã tắt “${MODULE_LABELS[key] ?? module.name}”.`);
    } catch {
      setNotice("Không thể cập nhật chức năng. Kiểm tra kết nối rồi thử lại.");
    }
  }

  if (loading) return <div className="text-[13px] text-pms-muted">Đang tải dữ liệu...</div>;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Module nâng cao</h1>
      <p className="mb-2 text-[13px] text-pms-muted">Bật một chức năng sẽ mở bước cấu hình tiếp theo để dùng được trong vận hành.</p>
      {error && <p className="mb-3 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12px] text-pms-danger">{error}</p>}
      {notice && <p className="mb-4 rounded-lg bg-[#E9FBEF] px-3 py-2 text-[12px] text-pms-success">{notice}</p>}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.items.map((m) => (
          <div key={m.key} className="min-w-0 overflow-hidden rounded-xl bg-white px-[18px] pb-3.5 pt-[18px] shadow-card">
            <div className="mb-2.5 flex justify-end">
              <button type="button"
                aria-label={`${m.on ? "Tắt" : "Bật"} ${MODULE_LABELS[m.key] ?? m.name}`}
                aria-pressed={m.on}
                onClick={() => toggle(m.key)}
                className="flex h-[22px] w-[38px] cursor-pointer items-center rounded-full p-0.5"
                style={{ background: m.on ? "#284AB1" : "#E6E8EC", justifyContent: m.on ? "flex-end" : "flex-start" }}
              >
                <div className="h-[18px] w-[18px] rounded-full bg-white" />
              </button>
            </div>
            <div
              className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl text-[26px]"
              style={{ background: m.bg }}
            >
              <span aria-hidden="true">{m.icon}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <span className="min-w-0 break-words text-[13.5px] font-semibold text-pms-text">{MODULE_LABELS[m.key] ?? m.name}</span>
              <span className="min-w-0 break-words text-[12.5px] font-semibold leading-5 text-pms-primary sm:text-right">
                {m.free ? "Miễn phí" : m.price}
              </span>
            </div>
            {MODULE_FLOWS[m.key] && <Link href={MODULE_FLOWS[m.key].href} className="mt-3 block rounded-lg bg-pms-divider px-2.5 py-2 text-[11px] font-semibold text-pms-primary no-underline">Bước tiếp theo: {MODULE_FLOWS[m.key].label} →</Link>}
          </div>
        ))}
      </div>
    </div>
  );
}
