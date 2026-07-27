// Hằng số dùng chung giữa db/seed.ts và scripts/simulate-device.ts — tách riêng
// để script mô phỏng thiết bị KHÔNG phải import seed.ts (seed.ts tự chạy
// main() + mở kết nối DB ngay khi import, không an toàn để import làm thư viện).
export const TENANT_ID = "demo-tenant";
export const PROPERTY_ID = "demo-property-1";
export const ROOM_ID = "room-101";
export const SWITCH_DEVICE_ID = "device-switch-101";
export const AIRCON_DEVICE_ID = "device-aircon-101";
