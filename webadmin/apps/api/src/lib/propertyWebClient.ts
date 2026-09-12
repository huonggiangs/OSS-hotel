// ============================================================================
// Client gọi API nội bộ của `smart-hotel-os/property-web/apps/api` để lấy
// danh sách cơ sở (property) thật — dùng cho dropdown "gán vào cơ sở" khi
// khai báo/sửa thiết bị trong webadmin.
//
// CƠ CHẾ XÁC THỰC (GO-LIVE — xem PROGRESS.md): vì đây là 2 hệ thống nội
// bộ công ty tự làm (KHÔNG PHẢI đối tác ngoài), dùng header
// `X-Internal-Service-Key` đơn giản thay vì OAuth2 client credentials đầy đủ
// như `hq-console/docs/PARTNER_API_STANDARDS.md` mô tả cho đối tác thật.
// Production PHẢI đổi sang OAuth2 client credentials trước khi expose ra
// ngoài mạng nội bộ công ty.
// ============================================================================

const PROPERTY_WEB_API_URL = process.env.PROPERTY_WEB_API_URL ?? "http://localhost:4100";
const INTERNAL_SERVICE_KEY =
  process.env.INTERNAL_SERVICE_KEY ??
  (process.env.NODE_ENV === "production" ? undefined : "dev-internal-service-key-change-me");

export interface PropertyWebBranch {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  status: string;
  room_count?: number;
}

/**
 * Gọi GET /api/v1/branches của property-web. Trả về `null` (KHÔNG throw) nếu
 * property-web không chạy/không có mạng — để UI/route gọi hàm này luôn fallback
 * được về nhập tay tên cơ sở, không bao giờ crash vì phụ thuộc hệ thống ngoài.
 */
export async function fetchPropertyWebBranches(): Promise<PropertyWebBranch[] | null> {
  if (!INTERNAL_SERVICE_KEY) {
    // eslint-disable-next-line no-console
    console.warn("[propertyWebClient] INTERNAL_SERVICE_KEY chưa cấu hình; bỏ qua lời gọi nội bộ.");
    return null;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${PROPERTY_WEB_API_URL}/api/v1/branches`, {
      method: "GET",
      headers: { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[propertyWebClient] property-web trả về ${res.status} — fallback sang nhập tay ở UI.`);
      return null;
    }
    const body = (await res.json()) as { items: PropertyWebBranch[] };
    return body.items;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[propertyWebClient] Không gọi được property-web (có thể chưa chạy/không có mạng):", (err as Error).message);
    return null;
  }
}

export interface ProvisionedProperty {
  property: { id: string; tenant_id: string; name: string; address: string | null; phone: string; login_code: string };
  owner: { id: string; username: string; email: string; full_name: string; role: string };
  credentials_created: boolean;
  setup_steps: string[];
}

export type MobileConnectionStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";

export interface MobileConnection {
  id: string;
  user_id: string;
  property_id: string;
  tenant_id: string;
  username: string;
  platform: "ANDROID" | "IOS";
  device_id: string;
  device_name: string | null;
  app_version: string | null;
  status: MobileConnectionStatus;
  pairing_code: string;
  auth_method: string;
  is_emulator: boolean;
  attestation_provider: string | null;
  attestation_verdict: string | null;
  approval_note: string | null;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  revoked_at: string | null;
  last_seen_at: string | null;
  full_name: string;
  role: string;
  user_status: string;
  property_name: string;
}

async function propertyWebJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!INTERNAL_SERVICE_KEY) throw new Error("INTERNAL_SERVICE_KEY chưa cấu hình.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${PROPERTY_WEB_API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Service-Key": INTERNAL_SERVICE_KEY,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as { message?: unknown };
    if (!res.ok) {
      throw new Error(typeof body.message === "string" ? body.message : `property-web trả về ${res.status}`);
    }
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchMobileConnections(filters: { status?: string; search?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const query = params.toString();
  return propertyWebJson<{ items: MobileConnection[]; total: number; pending: number }>(
    `/api/v1/internal/mobile-connections${query ? `?${query}` : ""}`
  );
}

export async function updateMobileConnection(
  id: string,
  input: { hqUserId: string; note?: string }
) {
  return propertyWebJson<MobileConnection>(`/api/v1/internal/mobile-connections/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Tạo idempotent cơ sở + OWNER ở PMS; lỗi được throw để HQ lưu trạng thái retry. */
export async function provisionProperty(input: {
  tenantId: string;
  propertyName: string;
  address?: string | null;
  phone: string;
  owner: { username: string; email: string; fullName: string; password: string; phone?: string | null };
}): Promise<ProvisionedProperty> {
  if (!INTERNAL_SERVICE_KEY) throw new Error("INTERNAL_SERVICE_KEY chưa cấu hình.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${PROPERTY_WEB_API_URL}/api/v1/internal/provisioning/property`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as { message?: unknown };
    if (!res.ok) throw new Error(typeof body.message === "string" ? body.message : `property-web trả về ${res.status}`);
    return body as ProvisionedProperty;
  } finally {
    clearTimeout(timeout);
  }
}
