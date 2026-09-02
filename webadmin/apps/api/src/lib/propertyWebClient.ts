// ============================================================================
// Client gọi API nội bộ của `smart-hotel-os/property-web/apps/api` để lấy
// danh sách cơ sở (property) thật — dùng cho dropdown "gán vào cơ sở" khi
// khai báo/sửa thiết bị trong webadmin.
//
// CƠ CHẾ XÁC THỰC (MVP TẠM THỜI — xem PROGRESS.md): vì đây là 2 hệ thống nội
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
  property: { id: string; tenant_id: string; name: string; address: string | null; phone: string | null };
  owner: { id: string; username: string; email: string; full_name: string; role: string };
  credentials_created: boolean;
  setup_steps: string[];
}

/** Tạo idempotent cơ sở + OWNER ở PMS; lỗi được throw để HQ lưu trạng thái retry. */
export async function provisionProperty(input: {
  tenantId: string;
  propertyName: string;
  address?: string | null;
  phone?: string | null;
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
