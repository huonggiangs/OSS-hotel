// ============================================================================
// Đồng bộ trạng thái kết nối thiết bị từ `smart-hotel-os/services/iot-service`
// (nguồn dữ liệu vận hành THẬT — lệnh/ack/heartbeat) vào `hardware_assets` của
// webadmin, liên kết bằng `asset_code` (mã thiết bị chung — webadmin sinh ra,
// iot-service lưu lại khi "ghép nối"/pair — xem
// smart-hotel-os/services/iot-service/db/migrations/002_asset_code.sql).
//
// Đồng thời đánh giá + sinh `asset_alerts` tự động (sắp hết bảo hành, offline
// quá lâu, mất kết nối nhiều lần) — chạy chung 1 job cho đơn giản, không cần
// thêm worker/scheduler riêng (đủ dùng cho quy mô demo/MVP hiện tại).
// ============================================================================

import { pool } from "./db";
import { hardwareAssetsRepo } from "../repositories/hardwareAssets.repo";
import { assetAlertsRepo } from "../repositories/assetAlerts.repo";
import type { HardwareAsset } from "../types/domain";

const IOT_SERVICE_URL = process.env.IOT_SERVICE_URL ?? "http://localhost:4103";
const IOT_SERVICE_API_KEY = process.env.IOT_SERVICE_API_KEY;

// Ngưỡng sinh cảnh báo — hằng số đơn giản cho MVP, có thể chuyển thành cấu
// hình theo tenant/khách hàng ở phase sau.
const WARRANTY_EXPIRING_DAYS = 30;
const OFFLINE_TOO_LONG_HOURS = 24;
// GIỚI HẠN ĐÃ BIẾT: disconnect_count là số CỘNG DỒN TOÀN THỜI GIAN (không có
// timestamp từng lần mất kết nối riêng lẻ ở iot-service), nên "vượt ngưỡng
// trong 7 ngày" ở đây được xấp xỉ bằng "vượt ngưỡng tuyệt đối" — KHÔNG phải
// cửa sổ trượt 7 ngày đúng nghĩa. Muốn làm đúng cần thêm bảng log sự kiện
// disconnect có timestamp ở iot-service — ghi rõ trong PROGRESS.md.
const HIGH_DISCONNECT_THRESHOLD = 5;

interface IotDevice {
  id: string;
  status: "ONLINE" | "OFFLINE" | "ERROR" | "MAINTENANCE_MODE";
  asset_code: string | null;
  disconnect_count: number;
  last_heartbeat_at: string | null;
}

interface IotDevicesResponse {
  items: IotDevice[];
  total: number;
  server: string;
}

function mapIotStatusToConnectionStatus(status: IotDevice["status"]): "ONLINE" | "OFFLINE" | "UNKNOWN" {
  if (status === "ONLINE") return "ONLINE";
  if (status === "OFFLINE") return "OFFLINE";
  // ERROR/MAINTENANCE_MODE: không phải "đang kết nối tốt" nhưng cũng không hẳn
  // là "mất kết nối" theo đúng nghĩa — xếp vào UNKNOWN để không gây cảnh báo
  // offline sai lệch trong lúc bảo trì có chủ đích.
  return "UNKNOWN";
}

export interface SyncResult {
  fetchedDevices: number;
  matchedAssets: number;
  updatedAssets: number;
  alertsCreated: number;
  iotServiceReachable: boolean;
  error?: string;
}

/**
 * Gọi GET /api/v1/devices của iot-service, khớp theo asset_code, cập nhật
 * connection_status/disconnect_count/last_seen_at/connected_server tương ứng
 * trong hardware_assets. KHÔNG throw khi iot-service không chạy được — trả về
 * kết quả với iotServiceReachable=false để endpoint gọi vẫn trả 200 (đồng bộ
 * là best-effort, không phải điều kiện bắt buộc để webadmin hoạt động).
 */
export async function syncConnectionStatusFromIot(): Promise<SyncResult> {
  let devices: IotDevice[] = [];
  let server = "";
  let iotServiceReachable = true;
  let error: string | undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${IOT_SERVICE_URL}/api/v1/devices`, {
      signal: controller.signal,
      headers: IOT_SERVICE_API_KEY ? { "X-Service-Api-Key": IOT_SERVICE_API_KEY } : {},
    });
    clearTimeout(timeout);
    if (!res.ok) {
      iotServiceReachable = false;
      error = `iot-service trả về ${res.status}`;
    } else {
      const body = (await res.json()) as IotDevicesResponse;
      devices = body.items;
      server = body.server;
    }
  } catch (err) {
    iotServiceReachable = false;
    error = `Không gọi được iot-service (${IOT_SERVICE_URL}): ${(err as Error).message}`;
  }

  let matched = 0;
  let updated = 0;
  for (const device of devices) {
    if (!device.asset_code) continue;
    const asset = await hardwareAssetsRepo.findByAssetCode(device.asset_code);
    if (!asset) continue;
    matched += 1;
    await hardwareAssetsRepo.updateConnectionState(asset.id, {
      connectionStatus: mapIotStatusToConnectionStatus(device.status),
      disconnectCount: device.disconnect_count,
      lastSeenAt: device.last_heartbeat_at,
      connectedServer: server || null,
    });
    updated += 1;
  }

  // QUAN TRỌNG: đánh giá cảnh báo LUÔN chạy, bất kể iot-service có sống hay
  // không — WARRANTY_EXPIRING là dữ liệu nội bộ webadmin (warranty_until),
  // không phụ thuộc IoT. Trước đây hàm này nằm TRONG nhánh try nên khi
  // iot-service chưa chạy (rất thường gặp ở môi trường dev/demo), cảnh báo bảo
  // hành không bao giờ được sinh ra — đã sửa lỗi này (phát hiện lúc kiểm thử
  // thật, xem PROGRESS.md).
  const alertsCreated = await evaluateAssetAlerts();

  return { fetchedDevices: devices.length, matchedAssets: matched, updatedAssets: updated, alertsCreated, iotServiceReachable, error };
}

/**
 * Quét TOÀN BỘ hardware_assets, sinh/khử cảnh báo theo 3 quy tắc:
 * - WARRANTY_EXPIRING: warranty_until trong vòng 30 ngày tới (chưa hết hạn hẳn).
 * - OFFLINE_TOO_LONG: connection_status=OFFLINE và last_seen_at quá 24h (hoặc chưa từng thấy).
 * - HIGH_DISCONNECT_RATE: disconnect_count vượt ngưỡng (xem giới hạn ghi ở trên).
 * Idempotent: không tạo trùng cảnh báo CHƯA resolve cùng loại cho cùng thiết
 * bị; tự động resolve khi điều kiện không còn đúng nữa.
 */
export async function evaluateAssetAlerts(): Promise<number> {
  const { rows: assets } = await pool.query<HardwareAsset>(`SELECT * FROM hardware_assets`);
  let created = 0;
  const now = Date.now();

  for (const asset of assets) {
    // ---- WARRANTY_EXPIRING ----
    if (asset.warranty_until) {
      const warrantyMs = new Date(asset.warranty_until).getTime();
      const daysLeft = (warrantyMs - now) / (1000 * 60 * 60 * 24);
      const expiringSoon = daysLeft >= 0 && daysLeft <= WARRANTY_EXPIRING_DAYS;
      if (expiringSoon) {
        if (!(await assetAlertsRepo.hasUnresolvedOfType(asset.id, "WARRANTY_EXPIRING"))) {
          await assetAlertsRepo.create({
            assetId: asset.id,
            alertType: "WARRANTY_EXPIRING",
            message: `Thiết bị ${asset.asset_code} sắp hết bảo hành trong ${Math.ceil(daysLeft)} ngày (hạn: ${new Date(asset.warranty_until).toLocaleDateString("vi-VN")}).`,
            severity: daysLeft <= 7 ? "CRITICAL" : "WARNING",
          });
          created += 1;
        }
      } else {
        await assetAlertsRepo.resolveOpenOfType(asset.id, "WARRANTY_EXPIRING");
      }
    }

    // ---- OFFLINE_TOO_LONG ----
    const offlineTooLong =
      asset.connection_status === "OFFLINE" &&
      (!asset.last_seen_at || now - new Date(asset.last_seen_at).getTime() > OFFLINE_TOO_LONG_HOURS * 60 * 60 * 1000);
    if (offlineTooLong) {
      if (!(await assetAlertsRepo.hasUnresolvedOfType(asset.id, "OFFLINE_TOO_LONG"))) {
        await assetAlertsRepo.create({
          assetId: asset.id,
          alertType: "OFFLINE_TOO_LONG",
          message: `Thiết bị ${asset.asset_code} mất kết nối liên tục hơn ${OFFLINE_TOO_LONG_HOURS}h (lần cuối thấy: ${asset.last_seen_at ? new Date(asset.last_seen_at).toLocaleString("vi-VN") : "chưa từng"}).`,
          severity: "CRITICAL",
        });
        created += 1;
      }
    } else if (asset.connection_status === "ONLINE") {
      await assetAlertsRepo.resolveOpenOfType(asset.id, "OFFLINE_TOO_LONG");
    }

    // ---- HIGH_DISCONNECT_RATE ----
    if (asset.disconnect_count >= HIGH_DISCONNECT_THRESHOLD) {
      if (!(await assetAlertsRepo.hasUnresolvedOfType(asset.id, "HIGH_DISCONNECT_RATE"))) {
        await assetAlertsRepo.create({
          assetId: asset.id,
          alertType: "HIGH_DISCONNECT_RATE",
          message: `Thiết bị ${asset.asset_code} đã mất kết nối ${asset.disconnect_count} lần (ngưỡng cảnh báo: ${HIGH_DISCONNECT_THRESHOLD}) — cần kiểm tra đường truyền/nguồn điện.`,
          severity: "WARNING",
        });
        created += 1;
      }
    }
  }

  return created;
}
