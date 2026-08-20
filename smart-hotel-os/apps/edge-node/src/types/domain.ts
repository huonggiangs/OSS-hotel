// Kiểu dữ liệu TypeScript viết tay, khớp 1-1 với cột trong
// database/migrations/001_init.sql (không sinh tự động — cùng lựa chọn kỹ
// thuật với property-web/webadmin: không dùng ORM code-gen).

export type RoomTypeStatus = "ACTIVE" | "INACTIVE";
export type RoomStatus = "OCCUPIED" | "VACANT" | "DIRTY" | "MAINTENANCE";
export type PropertyUserRole = "OWNER" | "MANAGER" | "RECEPTIONIST" | "HOUSEKEEPING";
export type PropertyUserStatus = "ACTIVE" | "DISABLED";
export type BookingChannel = "DIRECT" | "BOOKING_COM" | "AGODA" | "AIRBNB" | "TRAVELOKA" | "OTHER";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
export type DeviceType = "POWER_SWITCH" | "AC_CONTROLLER" | "DOOR_LOCK" | "OTHER";
export type DeviceStatus = "ONLINE" | "OFFLINE" | "ERROR";
export type CommandType =
  | "POWER_ON"
  | "POWER_OFF"
  | "AC_SET_TEMPERATURE"
  | "AC_SET_MODE"
  | "DEVICE_STATUS_CHECK"
  | "DEVICE_RESTART";
export type CommandStatus = "PENDING" | "ACKED" | "TIMEOUT" | "FAILED";
export type OutboxStatus = "PENDING" | "SYNCED" | "FAILED";

export interface RoomType {
  id: string;
  property_id: string;
  tenant_id: string;
  name: string;
  base_price: string;
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

export interface PropertyUser {
  id: string;
  property_id: string;
  tenant_id: string;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: PropertyUserRole;
  status: PropertyUserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: string;
  property_id: string;
  tenant_id: string;
  code: string;
  guest_name: string | null;
  guest_phone: string | null;
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

export interface DeviceCommand {
  id: string;
  tenant_id: string;
  property_id: string;
  device_id: string;
  command_type: CommandType;
  payload: unknown;
  idempotency_key: string;
  status: CommandStatus;
  sent_at: Date;
  expires_at: Date;
  acked_at: Date | null;
  ack_result: unknown;
  created_at: Date;
}

export interface OutboxEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  next_retry_at: Date | null;
  created_at: Date;
  synced_at: Date | null;
  last_error: string | null;
}
