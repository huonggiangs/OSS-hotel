// ============================================================================
// Cơ chế đồng bộ 2 chiều Edge Node <-> Cloud property-web — trái tim của mô
// hình offline-first (CLAUDE.md mục 7 "Must work offline-first... real-time
// sync"). Cloud VẪN LÀ NGUỒN SỰ THẬT (RULES chung toàn hệ thống) — Edge Node
// chỉ là "executor + cache" tại chỗ:
//
//   PUSH: đẩy từng dòng outbox_events (PENDING) lên Cloud qua API property-web
//   sẵn có. Không throw ra ngoài khi mạng lỗi — pattern giống hệt
//   webadmin/apps/api/src/lib/iotSync.ts (best-effort, tự bắt lỗi, trả kết
//   quả có cờ reachable=false thay vì crash process).
//
//   PULL: sau khi push xong, kéo room_types/rooms/bookings/users mới nhất từ
//   Cloud, upsert cục bộ theo last-write-wins (so updated_at — xem các hàm
//   upsertFromCloud() trong từng repository).
//
// GIỚI HẠN CÓ CHỦ Ý (ghi chi tiết ở README.md mục "Giới hạn đồng bộ push"):
// property-web KHÔNG có endpoint "upsert theo ID do client tự sinh" — nên
// booking TẠO MỚI cục bộ lúc offline, khi push lên, Cloud sẽ tự sinh ID MỚI
// (không trùng ID cục bộ). Các sự kiện sau đó của CHÍNH booking đó (checkin/
// checkout) sẽ không map được sang đúng bản ghi Cloud nữa trong bản MVP này —
// đây là điểm cần một endpoint đồng bộ chuyên dụng ở property-web trong tương
// lai (không sửa property-web trong phạm vi nhiệm vụ này).
// ============================================================================

import { outboxRepo } from "../repositories/outbox.repo";
import { roomsRepo } from "../repositories/rooms.repo";
import { roomTypesRepo } from "../repositories/roomTypes.repo";
import { bookingsRepo } from "../repositories/bookings.repo";
import { propertyUsersRepo } from "../repositories/propertyUsers.repo";
import type { Room, RoomType, Booking } from "../types/domain";

const CLOUD_URL = (process.env.CLOUD_PROPERTY_API_URL ?? "http://localhost:4100").replace(/\/+$/, "");
const PROPERTY_ID = process.env.PROPERTY_ID ?? "00000000-0000-0000-0000-00000000d101";
// Tài khoản dùng bởi job đồng bộ để gọi API Cloud property-web thay mặt Edge
// Node (máy-tới-máy). QUYẾT ĐỊNH ĐƠN GIẢN HOÁ CHO MVP: dùng lại tài khoản
// property_user "reception" (đủ quyền tạo/sửa booking + bật tắt phòng/thiết
// bị — xem property-web/apps/api/src/middleware/rbac.ts) thay vì xây riêng cơ
// chế OAuth2 client-credentials máy-tới-máy (đúng chuẩn dài hạn theo
// hq-console/docs/PARTNER_API_STANDARDS.md, nhưng vượt phạm vi bản MVP này).
const CLOUD_SYNC_USERNAME = process.env.CLOUD_SYNC_USERNAME ?? "reception";
const CLOUD_SYNC_PASSWORD = process.env.CLOUD_SYNC_PASSWORD ?? "Anio2026@";

const FETCH_TIMEOUT_MS = 5000;

let cachedToken: string | null = null;
let lastSyncAt: Date | null = null;
let lastSyncError: string | null = null;
let lastSyncSummary: SyncSummary | null = null;

export interface SyncSummary {
  ranAt: string;
  cloudReachable: boolean;
  pushed: number;
  pushFailed: number;
  pulled: { roomTypes: number; rooms: number; bookings: number; users: number };
  error?: string;
}

export function getLastSyncAt(): Date | null {
  return lastSyncAt;
}
export function getLastSyncSummary(): SyncSummary | null {
  return lastSyncSummary;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkCloudReachable(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${CLOUD_URL}/health`, {}, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

async function getCloudToken(forceRefresh = false): Promise<string | null> {
  if (cachedToken && !forceRefresh) return cachedToken;
  try {
    const res = await fetchWithTimeout(`${CLOUD_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: CLOUD_SYNC_USERNAME, password: CLOUD_SYNC_PASSWORD }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { access_token: string };
    cachedToken = body.access_token;
    return cachedToken;
  } catch {
    return null;
  }
}

async function cloudFetch(path: string, init: RequestInit = {}, retryOn401 = true): Promise<Response | null> {
  const token = await getCloudToken();
  if (!token) return null;
  try {
    const res = await fetchWithTimeout(`${CLOUD_URL}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (res.status === 401 && retryOn401) {
      cachedToken = null;
      return cloudFetch(path, init, false);
    }
    return res;
  } catch {
    return null;
  }
}

// ---- PUSH: đẩy 1 outbox event lên Cloud, trả về true nếu coi là đã đồng bộ
// xong (2xx HOẶC loại sự kiện không có endpoint Cloud tương ứng — xem ghi chú
// đầu file/README.md) ----
async function pushOutboxEvent(entityType: string, eventType: string, payload: any): Promise<{ ok: boolean; error?: string }> {
  try {
    let res: Response | null = null;
    switch (entityType) {
      case "room": {
        if (eventType === "ROOM_POWER_CHANGED") {
          res = await cloudFetch(`/api/v1/rooms/${payload.id}/power`, {
            method: "PATCH",
            body: JSON.stringify({ powerOn: payload.power_on }),
          });
        } else {
          res = await cloudFetch(`/api/v1/rooms/${payload.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: payload.status }),
          });
        }
        break;
      }
      case "device": {
        res = await cloudFetch(`/api/v1/devices/${payload.id}/power`, {
          method: "PATCH",
          body: JSON.stringify({ powerOn: payload.power_on }),
        });
        break;
      }
      case "booking": {
        if (eventType === "BOOKING_CREATED") {
          res = await cloudFetch(`/api/v1/bookings`, {
            method: "POST",
            body: JSON.stringify({
              roomId: payload.room_id,
              channel: payload.channel,
              status: payload.status,
              checkinDate: payload.checkin_date,
              checkoutDate: payload.checkout_date,
              totalPrice: Number(payload.total_price ?? 0),
              deposit: Number(payload.deposit ?? 0),
              notes: `[Edge Node ${process.env.EDGE_NODE_ID ?? "unknown"}] Khách: ${payload.guest_name ?? "?"} (${payload.guest_phone ?? "?"}). ${payload.notes ?? ""}`.trim(),
            }),
          });
          // Xem ghi chú đầu file: Cloud tự sinh ID mới cho booking, không map
          // ngược lại được ID cục bộ trong bản MVP này — vẫn coi 2xx là "đã
          // đẩy thành công" (dữ liệu đã tới Cloud), chỉ là các event sau của
          // ĐÚNG booking này (checkin/checkout) sẽ không tìm thấy bản ghi
          // tương ứng ở Cloud (404) và được ghi log lỗi, không crash.
        } else {
          res = await cloudFetch(`/api/v1/bookings/${payload.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: payload.status }),
          });
        }
        break;
      }
      case "device_command": {
        // property-web không có khái niệm device_commands (chỉ có power_on
        // đơn giản) — không có endpoint Cloud tương ứng để đẩy lên. Coi như
        // đã "đồng bộ" (không có gì để làm) thay vì treo PENDING vĩnh viễn.
        // Theo dõi: kết nối thật với services/iot-service hoặc mở rộng
        // property-web là bước tiếp theo hợp lý (xem README.md).
        return { ok: true };
      }
      default:
        return { ok: true };
    }

    if (!res) return { ok: false, error: "Không gọi được Cloud (mất mạng hoặc không đăng nhập được)." };
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Cloud trả về HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function pushPendingOutbox(): Promise<{ pushed: number; failed: number }> {
  const pending = await outboxRepo.listRetryable(50);
  let pushed = 0;
  let failed = 0;
  for (const event of pending) {
    const result = await pushOutboxEvent(event.entity_type, event.event_type, event.payload);
    if (result.ok) {
      await outboxRepo.markSynced(event.id);
      pushed += 1;
    } else {
      await outboxRepo.markFailed(event.id, result.error ?? "Lỗi không xác định");
      failed += 1;
    }
  }
  return { pushed, failed };
}

// ---- PULL: Cloud là nguồn sự thật. Không dùng đồng hồ Edge để từ chối bản
// ghi Cloud, vì clock drift ở Edge sẽ phá vỡ nguyên tắc single source of truth.
async function pullFromCloud(): Promise<{ roomTypes: number; rooms: number; bookings: number; users: number }> {
  const counts = { roomTypes: 0, rooms: 0, bookings: 0, users: 0 };

  const roomTypesRes = await cloudFetch(`/api/v1/room-types`);
  if (roomTypesRes?.ok) {
    const body = (await roomTypesRes.json()) as { items: RoomType[] };
    for (const rt of body.items) {
      await roomTypesRepo.upsertFromCloud(rt);
      counts.roomTypes += 1;
    }
  }

  const roomsRes = await cloudFetch(`/api/v1/rooms`);
  if (roomsRes?.ok) {
    const body = (await roomsRes.json()) as { items: Room[] };
    for (const room of body.items) {
      await roomsRepo.upsertFromCloud(room);
      counts.rooms += 1;
    }
  }

  const bookingsRes = await cloudFetch(`/api/v1/bookings`);
  if (bookingsRes?.ok) {
    const body = (await bookingsRes.json()) as { items: (Booking & { guest_name?: string | null })[] };
    for (const b of body.items) {
      await bookingsRepo.upsertFromCloud({ ...b, guest_phone: b.guest_phone ?? null } as Booking);
      counts.bookings += 1;
    }
  }

  // property_users — CHỈ đồng bộ hồ sơ (KHÔNG có password_hash, xem
  // propertyUsers.repo.ts updateProfileFromCloud()).
  const usersRes = await cloudFetch(`/api/v1/users`);
  if (usersRes?.ok) {
    const body = (await usersRes.json()) as {
      items: { username: string; email: string; full_name: string; role: string; status: string }[];
    };
    for (const u of body.items) {
      const updated = await propertyUsersRepo.updateProfileFromCloud(u);
      if (updated) counts.users += 1;
    }
  }

  return counts;
}

/**
 * Chạy 1 chu kỳ đồng bộ đầy đủ (push rồi pull). KHÔNG BAO GIỜ throw — mọi lỗi
 * mạng được bắt và trả về trong SyncSummary, để job nền ở index.ts gọi lại an
 * toàn mỗi SYNC_INTERVAL_MS mà không làm crash process khi Cloud offline.
 */
export async function runSyncCycle(): Promise<SyncSummary> {
  const reachable = await checkCloudReachable();
  if (!reachable) {
    const summary: SyncSummary = {
      ranAt: new Date().toISOString(),
      cloudReachable: false,
      pushed: 0,
      pushFailed: 0,
      pulled: { roomTypes: 0, rooms: 0, bookings: 0, users: 0 },
      error: `Không kết nối được Cloud tại ${CLOUD_URL}`,
    };
    lastSyncSummary = summary;
    lastSyncError = summary.error ?? null;
    return summary;
  }

  try {
    const { pushed, failed } = await pushPendingOutbox();
    const pulled = await pullFromCloud();
    const summary: SyncSummary = { ranAt: new Date().toISOString(), cloudReachable: true, pushed, pushFailed: failed, pulled };
    lastSyncAt = new Date();
    lastSyncSummary = summary;
    lastSyncError = null;
    return summary;
  } catch (err) {
    const summary: SyncSummary = {
      ranAt: new Date().toISOString(),
      cloudReachable: true,
      pushed: 0,
      pushFailed: 0,
      pulled: { roomTypes: 0, rooms: 0, bookings: 0, users: 0 },
      error: (err as Error).message,
    };
    lastSyncSummary = summary;
    lastSyncError = summary.error ?? null;
    return summary;
  }
}

export function getLastSyncError(): string | null {
  return lastSyncError;
}

export { PROPERTY_ID as SYNC_PROPERTY_ID };
