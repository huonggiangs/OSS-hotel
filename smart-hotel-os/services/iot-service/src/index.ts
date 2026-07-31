import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { devicesRouter } from "./routes/devices.routes";
import { commandsRouter } from "./routes/commands.routes";
import { errorHandler } from "./middleware/errorHandler";
import { pool } from "./lib/db";
import { commandsRepo } from "./repositories/commands.repo";
import { devicesRepo } from "./repositories/devices.repo";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "iot-service" }));

app.use("/api/v1/devices", devicesRouter);
// commandsRouter cùng tiếp đầu ngữ /devices/:id vì lệnh luôn gắn với 1 thiết bị.
app.use("/api/v1/devices", commandsRouter);

app.use((_req, res) => {
  res.status(404).json({ error_code: "ROUTE_NOT_FOUND", message: "Không tìm thấy endpoint." });
});
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4103;
const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`iot-service đang chạy tại http://localhost:${PORT}`);
});

// --- Timeout sweep ---
// Mô phỏng một background job đơn giản trong cùng process: quét định kỳ mọi
// lệnh PENDING đã quá `expires_at` và chuyển sang TIMEOUT (RULES.md mục 10:
// mọi lệnh phải có timeout). Ở production thật, việc này nên tách thành một
// worker/scheduler riêng (hoặc broker MQTT tự có cơ chế QoS/timeout), KHÔNG
// chạy trong cùng process với API — ghi rõ ở PROGRESS.md.
const sweepIntervalMs = Number(process.env.TIMEOUT_SWEEP_INTERVAL_MS) || 5000;
const sweepTimer = setInterval(() => {
  commandsRepo.sweepExpired().then((count) => {
    if (count > 0) {
      // eslint-disable-next-line no-console
      console.log(`[timeout-sweep] đã chuyển ${count} lệnh PENDING quá hạn sang TIMEOUT`);
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[timeout-sweep] lỗi:", err);
  });
}, sweepIntervalMs);

// --- Offline sweep ---
// Quét định kỳ các thiết bị ONLINE quá lâu không có heartbeat mới -> chuyển
// OFFLINE + cộng dồn disconnect_count (dữ liệu "số lần mất kết nối" THẬT,
// không phải giả lập cứng) — webadmin đọc lại số này qua GET /devices để hiện
// thị "số lần mất kết nối" ở hardware_assets. Ngưỡng mặc định 2 phút (đủ ngắn
// để demo/test thấy hiệu ứng nhanh) — chỉnh qua HEARTBEAT_TIMEOUT_MS.
const heartbeatTimeoutMs = Number(process.env.HEARTBEAT_TIMEOUT_MS) || 120000;
const offlineSweepIntervalMs = Number(process.env.OFFLINE_SWEEP_INTERVAL_MS) || 15000;
const offlineSweepTimer = setInterval(() => {
  devicesRepo.sweepOfflineDevices(heartbeatTimeoutMs).then((count) => {
    if (count > 0) {
      // eslint-disable-next-line no-console
      console.log(`[offline-sweep] đã chuyển ${count} thiết bị sang OFFLINE (quá hạn heartbeat ${heartbeatTimeoutMs}ms)`);
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[offline-sweep] lỗi:", err);
  });
}, offlineSweepIntervalMs);

process.on("SIGTERM", async () => {
  clearInterval(sweepTimer);
  clearInterval(offlineSweepTimer);
  server.close();
  await pool.end();
  process.exit(0);
});
