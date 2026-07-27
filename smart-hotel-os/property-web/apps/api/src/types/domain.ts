// Kiểu dữ liệu TypeScript viết tay, khớp 1-1 với cột trong
// database/migrations/001_init.sql (không sinh tự động — cùng lựa chọn kỹ thuật với
// webadmin: không dùng ORM code-gen).

export type PropertyStatus = "ACTIVE" | "SUSPENDED";
export type PropertyUserRole = "OWNER" | "MANAGER" | "RECEPTIONIST" | "HOUSEKEEPING";
export type PropertyUserStatus = "ACTIVE" | "DISABLED";
export type RoomTypeStatus = "ACTIVE" | "INACTIVE";
export type RoomStatus = "OCCUPIED" | "VACANT" | "DIRTY" | "MAINTENANCE";
export type BookingChannel = "DIRECT" | "BOOKING_COM" | "AGODA" | "AIRBNB" | "TRAVELOKA" | "OTHER";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
export type InvoiceMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "OTA_WALLET" | "VNPAY" | "MOMO" | "ZALOPAY" | "STRIPE";
export type InvoiceStatus = "PAID" | "PENDING" | "FAILED";
export type DeviceType = "POWER_SWITCH" | "AC_CONTROLLER" | "DOOR_LOCK" | "OTHER";
export type DeviceStatus = "ONLINE" | "OFFLINE" | "ERROR";

export interface Property {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  currency: string;
  status: PropertyStatus;
  created_at: Date;
  updated_at: Date;
}

export interface PropertyUser {
  id: string;
  property_id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: PropertyUserRole;
  status: PropertyUserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface RoomType {
  id: string;
  property_id: string;
  tenant_id: string;
  name: string;
  base_price: string; // NUMERIC trả về dạng string từ pg theo mặc định
  capacity: number;
  beds_big: number;
  beds_small: number;
  area_m2: string | null;
  status: RoomTypeStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Room {
  id: string;
  property_id: string;
  tenant_id: string;
  room_type_id: string;
  number: string;
  floor: string;
  zone: string;
  status: RoomStatus;
  power_on: boolean;
  note: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: string;
  property_id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  segment: string;
  note: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: string;
  property_id: string;
  tenant_id: string;
  code: string;
  customer_id: string | null;
  room_id: string | null;
  channel: BookingChannel;
  status: BookingStatus;
  checkin_date: string;
  checkout_date: string;
  total_price: string;
  deposit: string;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  property_id: string;
  tenant_id: string;
  booking_id: string | null;
  code: string;
  guest_name: string;
  method: InvoiceMethod;
  amount: string;
  status: InvoiceStatus;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Expense {
  id: string;
  property_id: string;
  tenant_id: string;
  category: string;
  description: string | null;
  amount: string;
  expense_date: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Device {
  id: string;
  property_id: string;
  tenant_id: string;
  room_id: string | null;
  device_type: DeviceType;
  name: string;
  external_id: string | null;
  status: DeviceStatus;
  power_on: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  property_id: string | null;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  ip_address: string | null;
  created_at: Date;
}
