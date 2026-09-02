// Kiểu dữ liệu TypeScript viết tay, khớp 1-1 với cột trong
// database/migrations/001_init.sql (không sinh tự động — xem ghi chú trong
// database/README.md về lựa chọn không dùng ORM code-gen).

export type UserRole = "SUPER_ADMIN" | "OPS_SUPPORT" | "SALES_MANAGER" | "ACCOUNTANT" | "SUPPLY_CHAIN" | "RELEASE_MANAGER";
export type UserStatus = "ACTIVE" | "DISABLED";
export type PartnerStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";
export type SupplierStatus = "ACTIVE" | "INACTIVE";
export type BillingStatus = "ACTIVE" | "OVERDUE" | "SUSPENDED";
export type CustomerOnboardingStatus = "NOT_STARTED" | "PROVISIONING" | "READY" | "EMAIL_SENT" | "EMAIL_NOT_CONFIGURED" | "EMAIL_FAILED";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type HardwareAssetType =
  | "KIOSK"
  | "PASSPORT_SCANNER"
  | "QR_SCANNER"
  | "CARD_DISPENSER"
  | "CASH_ACCEPTOR"
  | "IP_CAMERA"
  | "THERMAL_PRINTER"
  | "IOT_CONTROLLER"
  | "OTHER"
  | "DOOR_LOCK"
  | "POWER_SWITCH"
  | "ELECTRIC_METER"
  | "EDGE_NODE";
export type HardwareAssetStatus = "IN_STOCK" | "DEPLOYED" | "UNDER_WARRANTY_CLAIM" | "INACTIVE" | "RETIRED";
export type ConnectionStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";
export type SubscriptionCycle = "MONTHLY" | "YEARLY";
export type AssetAlertType = "WARRANTY_EXPIRING" | "OFFLINE_TOO_LONG" | "HIGH_DISCONNECT_RATE" | "MANUAL_FAULT";
export type AssetAlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type WarrantyClaimStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
export type ProductScope = "KIOSK" | "SMART_HOTEL_OS" | "BOTH";
export type CommissionStatus = "CALCULATED" | "PENDING_APPROVAL" | "APPROVED" | "PAID" | "REJECTED";
export type AppKey =
  | "KIOSK_APP"
  | "PROPERTY_WEB"
  | "PROPERTY_WINDOWS"
  | "OWNER_MOBILE"
  | "HOUSEKEEPING_MOBILE"
  | "SUPER_ADMIN_WEB";
export type ReleaseChannel = "STABLE" | "BETA";
export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Partner {
  id: string;
  name: string;
  territory: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  default_commission_pct: string; // NUMERIC trả về dạng string từ pg theo mặc định
  max_customers: number | null;
  status: PartnerStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Supplier {
  id: string;
  name: string;
  supplies_types: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  payment_terms: string | null;
  lead_time_days: number | null;
  status: SupplierStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerUnified {
  id: string;
  name: string;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  partner_id: string | null;
  uses_kiosk: boolean;
  uses_smart_hotel_os: boolean;
  sho_tenant_id: string | null;
  kiosk_customer_id: string | null;
  billing_status: BillingStatus;
  pms_property_id: string | null;
  onboarding_status: CustomerOnboardingStatus;
  onboarding_email_sent_at: Date | null;
  onboarding_last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SupportTicket {
  id: string;
  customer_id: string;
  subject: string;
  description: string | null;
  status: TicketStatus;
  created_at: Date;
  updated_at: Date;
}

export interface HardwareAsset {
  id: string;
  asset_type: HardwareAssetType;
  brand: string | null;
  model: string | null;
  serial_number: string;
  supplier_id: string | null;
  purchase_cost: string | null;
  purchased_at: Date | null;
  warranty_until: Date | null;
  status: HardwareAssetStatus;
  customer_id: string | null;
  device_id_external: string | null;
  // ---- Migration 004: giám sát thiết bị ----
  asset_code: string;
  activated_at: Date | null;
  connection_status: ConnectionStatus;
  disconnect_count: number;
  last_seen_at: Date | null;
  last_connection_check_at: Date | null;
  supporting_partner_id: string | null;
  connectivity_provider: string | null;
  subscription_fee: string | null;
  subscription_cycle: SubscriptionCycle | null;
  connected_server: string | null;
  property_id: string | null;
  property_name: string | null;
  parent_asset_id: string | null;
  installation_location: string | null;
  description: string | null;
  deactivated_at: Date | null;
  deactivation_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AssetAlert {
  id: string;
  asset_id: string;
  alert_type: AssetAlertType;
  message: string;
  severity: AssetAlertSeverity;
  created_at: Date;
  resolved_at: Date | null;
}

export interface WarrantyClaim {
  id: string;
  hardware_asset_id: string;
  issue_description: string;
  status: WarrantyClaimStatus;
  cost: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CommissionRule {
  id: string;
  partner_id: string | null;
  product_scope: ProductScope;
  rate_pct: string;
  is_recurring: boolean;
  effective_from: Date;
  effective_to: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CommissionRecord {
  id: string;
  partner_id: string;
  customer_id: string | null;
  rule_id: string | null;
  period: string;
  amount: string;
  status: CommissionStatus;
  approved_by_id: string | null;
  approved_at: Date | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
  partner_name?: string | null;
  customer_name?: string | null;
  rule_rate_pct?: string | null;
}

export interface AppRelease {
  id: string;
  app_key: AppKey;
  version: string;
  release_notes: string | null;
  channel: ReleaseChannel;
  published_at: Date | null;
  published_by: string | null;
  artifact_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  expected_at: Date | null;
  created_by: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_name: string;
  asset_type: HardwareAssetType | null;
  quantity: number;
  unit_price: string; // NUMERIC trả về dạng string từ pg theo mặc định
  received_quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  ip_address: string | null;
  created_at: Date;
}
