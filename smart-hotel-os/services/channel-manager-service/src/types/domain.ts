export type OtaProvider = "booking" | "agoda" | "airbnb";
export type OtaConnectionStatus = "DISCONNECTED" | "CONNECTED" | "ERROR";
export type SyncLogStatus = "PENDING" | "SUCCESS" | "FAILED";
export type BookingIngestionStatus = "RECEIVED" | "ACCEPTED" | "REJECTED_OVERBOOKING" | "ERROR";

export interface OtaConnection {
  id: string;
  tenant_id: string;
  property_id: string;
  ota_provider: OtaProvider;
  credentials: Record<string, unknown>;
  status: OtaConnectionStatus;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomTypeInventoryCache {
  id: string;
  tenant_id: string;
  property_id: string;
  room_type_id: string;
  date: string;
  available_rooms: number;
  updated_at: string;
}

export interface RoomInventorySyncLog {
  id: string;
  tenant_id: string;
  property_id: string;
  connection_id: string;
  room_type_id: string;
  date: string;
  available_rooms: number;
  status: SyncLogStatus;
  request_payload: unknown;
  response_payload: unknown;
  error_message: string | null;
  created_at: string;
}

export interface PriceSyncLog {
  id: string;
  tenant_id: string;
  property_id: string;
  connection_id: string;
  room_type_id: string;
  date: string;
  price: string;
  status: SyncLogStatus;
  request_payload: unknown;
  response_payload: unknown;
  error_message: string | null;
  created_at: string;
}

export interface BookingIngestionLog {
  id: string;
  tenant_id: string;
  property_id: string;
  connection_id: string | null;
  ota_provider: OtaProvider;
  ota_booking_id: string;
  idempotency_key: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  rooms_requested: number;
  guest_name: string | null;
  raw_payload: unknown;
  status: BookingIngestionStatus;
  created_at: string;
}

export interface OverbookingAlert {
  id: string;
  tenant_id: string;
  property_id: string;
  room_type_id: string;
  date: string;
  ota_provider: OtaProvider;
  booking_ingestion_log_id: string;
  message: string;
  resolved: boolean;
  created_at: string;
}
