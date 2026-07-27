// Kiểu dữ liệu TypeScript viết tay, khớp 1-1 với cột trong
// database/migrations/001_init.sql (không sinh tự động — xem ghi chú trong
// database/README.md về lựa chọn không dùng ORM code-gen).

export type UserRole = "SUPER_ADMIN" | "OPS_SUPPORT" | "SALES_MANAGER" | "ACCOUNTANT" | "SUPPLY_CHAIN" | "RELEASE_MANAGER";
export type UserStatus = "ACTIVE" | "DISABLED";
export type PartnerStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";
export type SupplierStatus = "ACTIVE" | "INACTIVE";
export type BillingStatus = "ACTIVE" | "OVERDUE" | "SUSPENDED";
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
  | "OTHER";
export type HardwareAssetStatus = "IN_STOCK" | "DEPLOYED" | "UNDER_WARRANTY_CLAIM" | "RETIRED";
export type WarrantyClaimStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
export type ProductScope = "KIOSK" | "SMART_HOTEL_OS" | "BOTH";
export type CommissionStatus = "CALCULATED" | "PENDING_APPROVAL" | "APPROVED" | "PAID" | "REJECTED";

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
  created_at: Date;
  updated_at: Date;
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
