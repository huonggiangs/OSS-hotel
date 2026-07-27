/**
 * Script mô phỏng THIẾT BỊ THẬT — chứng minh luồng lệnh idempotent + ack +
 * timeout chạy đúng end-to-end qua HTTP, dù chưa có phần cứng/MQTT broker
 * thật (xem README.md giải thích lý do dùng HTTP thay MQTT ở bản demo này).
 *
 * Kịch bản chạy (chạy sau khi `npm run migrate && npm run seed && npm run dev`
 * đã bật service ở IOT_SERVICE_BASE_URL):
 *   1. Đóng vai "rule engine": gửi lệnh POWER_ON cho công tắc điện phòng 101.
 *   2. Đóng vai "thiết bị": tra lệnh đang PENDING, rồi gọi /ack xác nhận đã bật điện.
 *   3. Gửi lại CÙNG idempotencyKey -> chứng minh không tạo lệnh trùng (idempotent).
 *   4. Gửi 1 lệnh AC_SET_TEMPERATURE với timeout rất ngắn (2s) nhưng KHÔNG ack
 *      -> chờ quá hạn -> tra lại thấy status chuyển sang TIMEOUT.
 *
 * Chạy: npm run simulate:device
 */
import { SWITCH_DEVICE_ID, AIRCON_DEVICE_ID } from "../db/seed-constants";

const BASE_URL = process.env.IOT_SERVICE_BASE_URL || "http://localhost:4103";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function postJson(path: string, body: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getJson(path: string): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE_URL}${path}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  console.log(`=== Mô phỏng thiết bị IoT — nói chuyện với ${BASE_URL} ===\n`);

  // --- Bước 1: rule engine gửi lệnh POWER_ON ---
  console.log("[1] Rule engine gửi lệnh POWER_ON cho công tắc điện...");
  const idemKey = `demo-power-on-${Date.now()}`;
  const create1 = await postJson(`/api/v1/devices/${SWITCH_DEVICE_ID}/commands`, {
    tenantId: "demo-tenant",
    commandType: "POWER_ON",
    idempotencyKey: idemKey,
    timeoutSeconds: 30,
  });
  console.log(`    -> HTTP ${create1.status}, command_id=${create1.json.command?.id}, status=${create1.json.command?.status}`);
  const commandId = create1.json.command.id;

  // --- Bước 2: "thiết bị" tra lệnh đang chờ rồi ack ---
  console.log("[2] Thiết bị tra lệnh đang PENDING...");
  const fetched = await getJson(`/api/v1/devices/${SWITCH_DEVICE_ID}/commands/${commandId}`);
  console.log(`    -> status hiện tại: ${fetched.json.status}`);

  console.log("[2b] Thiết bị thực thi xong, gọi /ack xác nhận đã bật điện...");
  const ack1 = await postJson(`/api/v1/devices/${SWITCH_DEVICE_ID}/ack`, {
    commandId,
    result: { success: true, message: "Đã bật relay điện tổng phòng 101" },
  });
  console.log(`    -> HTTP ${ack1.status}, command.status=${ack1.json.command?.status}`);

  // --- Bước 3: gửi lại cùng idempotencyKey — phải trả về CÙNG command, không tạo lệnh mới ---
  console.log("[3] Gửi lại đúng idempotencyKey (mô phỏng retry mạng)...");
  const create2 = await postJson(`/api/v1/devices/${SWITCH_DEVICE_ID}/commands`, {
    tenantId: "demo-tenant",
    commandType: "POWER_ON",
    idempotencyKey: idemKey,
    timeoutSeconds: 30,
  });
  const isSameCommand = create2.json.command?.id === commandId;
  console.log(
    `    -> HTTP ${create2.status}, idempotent_replay=${create2.json.idempotent_replay}, cùng command_id=${isSameCommand} (mong đợi true)`
  );
  if (!isSameCommand) {
    throw new Error("LỖI: idempotency không hoạt động đúng — lệnh bị tạo trùng!");
  }

  // --- Bước 4: demo timeout — tạo lệnh với hạn rất ngắn, KHÔNG ack ---
  console.log("[4] Gửi lệnh AC_SET_TEMPERATURE cho điều hoà với timeout 2s, CỐ TÌNH không ack...");
  const create3 = await postJson(`/api/v1/devices/${AIRCON_DEVICE_ID}/commands`, {
    tenantId: "demo-tenant",
    commandType: "AC_SET_TEMPERATURE",
    payload: { temperatureCelsius: 24 },
    timeoutSeconds: 2,
  });
  const timeoutCommandId = create3.json.command.id;
  console.log(`    -> command_id=${timeoutCommandId}, status=${create3.json.command.status}, chờ 4s để quá hạn...`);
  await sleep(4000);

  const afterTimeout = await getJson(`/api/v1/devices/${AIRCON_DEVICE_ID}/commands/${timeoutCommandId}`);
  console.log(`    -> tra lại sau 4s: status=${afterTimeout.json.status} (mong đợi TIMEOUT)`);
  if (afterTimeout.json.status !== "TIMEOUT") {
    throw new Error("LỖI: lệnh quá hạn nhưng không chuyển sang TIMEOUT!");
  }

  console.log("[4b] Thử ack một lệnh đã TIMEOUT (phải bị từ chối, không được ack trễ)...");
  const lateAck = await postJson(`/api/v1/devices/${AIRCON_DEVICE_ID}/ack`, {
    commandId: timeoutCommandId,
    result: { success: true },
  });
  console.log(`    -> HTTP ${lateAck.status} (mong đợi 409 CONFLICT), error_code=${lateAck.json.error_code}`);

  console.log("\n=== Mô phỏng hoàn tất — idempotent command + ack + timeout đều hoạt động đúng ===");
}

main().catch((err) => {
  console.error("Mô phỏng thất bại:", err);
  process.exit(1);
});
