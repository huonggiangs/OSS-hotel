// Cấu hình điều hướng — map lại từ `navMain` và `settingsTree` trong bản thiết kế gốc.
// Khác với bản gốc (chuyển tab bằng setState trong 1 trang SPA), ở đây dùng route
// Next.js App Router thật cho từng màn hình vì phù hợp hơn với target codebase
// (webadmin cũng dùng App Router theo route, không phải SPA state) — xem README bundle
// mục "match visual output, đừng copy y nguyên cấu trúc nội bộ prototype".

export interface NavItem {
  key: string;
  label: string;
  icon: "grid" | "calendar" | "bed" | "wallet" | "megaphone" | "users" | "link" | "map" | "puzzle";
  href: string;
}

export const mainNav: NavItem[] = [
  { key: "dashboard", label: "Tổng quan", icon: "grid", href: "/dashboard" },
  { key: "value-dashboard", label: "Giá trị tạo ra", icon: "wallet", href: "/value-dashboard" },
  { key: "alerts", label: "Cảnh báo & thời hạn", icon: "megaphone", href: "/alerts" },
  { key: "booking", label: "Đặt phòng / Hợp đồng", icon: "calendar", href: "/booking" },
  { key: "rooms", label: "Trạng thái phòng", icon: "bed", href: "/rooms" },
  { key: "expenses", label: "Chi phí", icon: "wallet", href: "/expenses" },
  { key: "marketing", label: "Tiếp thị", icon: "megaphone", href: "/marketing" },
  { key: "customers", label: "Khách hàng", icon: "users", href: "/customers" },
  { key: "services", label: "Dịch vụ", icon: "link", href: "/services" },
  { key: "utilities", label: "Tiện ích", icon: "map", href: "/utilities" },
  { key: "modules", label: "Module nâng cao", icon: "puzzle", href: "/modules" },
];

export interface SettingsTreeItem {
  label: string;
  href: string;
  badge?: boolean;
}
export interface SettingsTreeGroup {
  title: string;
  items: SettingsTreeItem[];
}

export const settingsTree: SettingsTreeGroup[] = [
  { title: "Chi nhánh", items: [{ label: "Danh sách cơ sở", href: "/branches" }] },
  {
    title: "Cài đặt",
    items: [
      { label: "Cơ bản", href: "/basic" },
      { label: "Tiện ích", href: "/amenities" },
      { label: "Hình ảnh", href: "/images" },
      { label: "Email", href: "/email" },
      { label: "Bảo vệ", href: "/security" },
      { label: "Phòng và giá", href: "/price", badge: true },
      { label: "Thanh toán", href: "/payment", badge: true },
      { label: "Kế toán đêm", href: "/night-audit", badge: true },
      { label: "Tiền tệ", href: "/currency" },
      { label: "Thuế", href: "/tax" },
      { label: "Thời gian", href: "/time" },
      { label: "Máy in & mẫu in", href: "/printer", badge: true },
    ],
  },
  {
    title: "Kết nối",
    items: [
      { label: "Kênh bán trực tuyến", href: "/channel", badge: true },
      { label: "Đồng bộ hoá", href: "/sync" },
    ],
  },
  {
    title: "Bảo mật",
    items: [
      { label: "Cơ sở dữ liệu", href: "/db" },
      { label: "Người dùng & phân quyền", href: "/users", badge: true },
    ],
  },
  {
    title: "Hợp đồng & tài sản",
    items: [
      { label: "Mạng xã hội", href: "/social" },
      { label: "Quản lý tài sản", href: "/assets", badge: true },
    ],
  },
];

// Nhãn hiển thị cho trang "stub" (placeholder) theo từng key — dùng đúng câu chữ
// kiểu isStub trong bản gốc: 'Chức năng "..." sẽ được thiết kế chi tiết ở đợt tiếp theo.'
// Tất cả màn hình main nav + panel Cài đặt đã implement pixel-perfect (xem PROGRESS.md)
// nên hiện không còn key nào trỏ vào /stub/[key] — giữ export rỗng để route đó không
// lỗi biên dịch nếu còn nơi nào import (an toàn, không phá vỡ convention cũ).
export const stubLabels: Record<string, string> = {};
