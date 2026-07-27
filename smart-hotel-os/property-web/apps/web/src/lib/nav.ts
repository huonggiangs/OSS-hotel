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
  { key: "booking", label: "Đặt phòng / Hợp đồng", icon: "calendar", href: "/booking" },
  { key: "rooms", label: "Trạng thái phòng", icon: "bed", href: "/rooms" },
  { key: "expenses", label: "Chi phí", icon: "wallet", href: "/stub/expenses" },
  { key: "marketing", label: "Marketing", icon: "megaphone", href: "/stub/marketing" },
  { key: "customers", label: "Khách hàng", icon: "users", href: "/stub/customers" },
  { key: "services", label: "Dịch vụ", icon: "link", href: "/stub/services" },
  { key: "utilities", label: "Tiện ích", icon: "map", href: "/stub/utilities" },
  { key: "modules", label: "Module nâng cao", icon: "puzzle", href: "/stub/modules" },
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
  { title: "Chi nhánh", items: [{ label: "Danh sách cơ sở", href: "/stub/branches" }] },
  {
    title: "Cài đặt",
    items: [
      { label: "Cơ bản", href: "/stub/basic" },
      { label: "Tiện ích", href: "/stub/amenities" },
      { label: "Hình ảnh", href: "/stub/images" },
      { label: "Email", href: "/stub/email" },
      { label: "Bảo vệ", href: "/stub/security" },
      { label: "Phòng và giá", href: "/price", badge: true },
      { label: "Thanh toán", href: "/payment", badge: true },
      { label: "Kế toán đêm", href: "/stub/nightaudit", badge: true },
      { label: "Tiền tệ", href: "/stub/currency" },
      { label: "Thuế", href: "/stub/tax" },
      { label: "Thời gian", href: "/stub/time" },
      { label: "Máy in & mẫu in", href: "/stub/printer", badge: true },
    ],
  },
  {
    title: "Kết nối",
    items: [
      { label: "Kênh bán (OTA)", href: "/stub/channel", badge: true },
      { label: "Đồng bộ hoá", href: "/stub/sync" },
    ],
  },
  {
    title: "Bảo mật",
    items: [
      { label: "Cơ sở dữ liệu", href: "/stub/db" },
      { label: "Người dùng & phân quyền", href: "/stub/users", badge: true },
    ],
  },
  {
    title: "Hợp đồng & tài sản",
    items: [
      { label: "Mạng xã hội", href: "/stub/social" },
      { label: "Quản lý tài sản", href: "/stub/assets", badge: true },
    ],
  },
];

// Nhãn hiển thị cho trang "stub" (placeholder) theo từng key — dùng đúng câu chữ
// kiểu isStub trong bản gốc: 'Chức năng "..." sẽ được thiết kế chi tiết ở đợt tiếp theo.'
export const stubLabels: Record<string, string> = {
  expenses: "Chi phí",
  marketing: "Marketing",
  customers: "Khách hàng",
  services: "Dịch vụ",
  utilities: "Tiện ích",
  modules: "Module nâng cao",
  branches: "Danh sách cơ sở",
  basic: "Cơ bản",
  amenities: "Tiện ích cơ sở",
  images: "Hình ảnh",
  email: "Email",
  security: "Bảo vệ",
  nightaudit: "Kế toán đêm",
  currency: "Tiền tệ",
  tax: "Thuế",
  time: "Thời gian",
  printer: "Máy in & mẫu in",
  channel: "Kênh bán (OTA)",
  sync: "Đồng bộ hoá",
  db: "Cơ sở dữ liệu",
  users: "Người dùng & phân quyền",
  social: "Mạng xã hội",
  assets: "Quản lý tài sản",
};
