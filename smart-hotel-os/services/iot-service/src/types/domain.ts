export type DeviceType = "SWITCH" | "AIRCON";
export type DeviceStatus = "ONLINE" | "OFFLINE" | "ERROR" | "MAINTENANCE_MODE";
export type PowerState = "ON" | "OFF";
export type CommandType =
  | "POWER_ON"
  | "POWER_OFF"
  | "AC_SET_TEMPERATURE"
  | "AC_SET_MODE"
  | "DEVICE_STATUS_CHECK"
  | "DEVICE_RESTART";
export type CommandStatus = "PENDING" | "ACKED" | "TIMEOUT" | "FAILED";

export interface Device {
  id: string;
  tenant_id: string;
  property_id: string;
  room_id: string;
  device_type: DeviceType;
  name: string;
  status: DeviceStatus;
  power_state: PowerState;
  last_heartbeat_at: string | null;
  // ---- Migration 002: mã thiết bị chung (liên kết logic sang webadmin.hardware_assets) ----
  asset_code: string | null;
  disconnect_count: number;
  created_at: string;
  updated_at: string;
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
  sent_at: string;
  expires_at: string;
  acked_at: string | null;
  ack_result: unknown;
  created_at: string;
}

export interface DeviceHeartbeatWindow {
  id: string;
  tenant_id: string;
  property_id: string;
  device_id: string;
  window_start: string;
  window_end: string;
  sample_count: number;
  online_count: number;
  offline_count: number;
  last_power_state: PowerState | null;
  updated_at: string;
}
