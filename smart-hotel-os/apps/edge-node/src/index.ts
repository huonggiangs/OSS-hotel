import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { authRouter } from "./routes/auth.routes";
import { roomTypesRouter } from "./routes/roomTypes.routes";
import { roomsRouter } from "./routes/rooms.routes";
import { bookingsRouter } from "./routes/bookings.routes";
import { devicesRouter } from "./routes/devices.routes";
import { commandsRouter } from "./routes/commands.routes";
import { syncRouter } from "./routes/sync.routes";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/auth";
import { pool, DB_MODE, embeddedDb } from "./lib/db";
import { bootstrapEmbeddedDb } from "./lib/embeddedBootstrap";
import { commandsRepo } from "./repositories/commands.repo";
import { outboxRepo } from "./repositories/outbox.repo";
import { checkCloudReachable, getLastSyncAt, runSyncCycle } from "./lib/sync";
import { getLastEdgeHeartbeatAt, sendEdgeHeartbeat } from "./lib/edgeHeartbeat";
import { internalRouter } from "./routes/internal.routes";

const app = express();

// helmet mặc định bật "Cross-Origin-Resource-Policy: same-origin" — sẽ chặn
// UI khẩn cấp (public/index.html) tải chính JS/CSS của nó khi truy cập từ
// thiết bị khác trong LAN qua địa chỉ IP (khác origin "same-site" nghiêm ngặt
// trong vài trình duyệt di động) -> tắt riêng policy này, giữ nguyên các
// header bảo mật khác của helmet.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.WEB_ORIGIN?.split(",") ?? "*",
    credentials: true,
  })
);
app.use(express.json());

// UI khẩn cấp — public/index.html, KHÔNG build step (xem README.md mục "UI
// khẩn cấp"). express.static tự phục vụ GET "/" -> index.html.
app.use(express.static(path.join(__dirname, "..", "public")));

const EDGE_NODE_ID = process.env.EDGE_NODE_ID ?? "edge-node-local";

app.get("/health", async (_req, res) => {
  const [cloudReachable, pendingOutboxCount] = await Promise.all([checkCloudReachable(), outboxRepo.countPending()]);
  res.json({
    status: "ok",
    db_mode: DB_MODE,
    cloud_reachable: cloudReachable,
    pending_outbox_count: pendingOutboxCount,
    last_sync_at: getLastSyncAt()?.toISOString() ?? null,
    last_heartbeat_sent_at: getLastEdgeHeartbeatAt()?.toISOString() ?? null,
    edge_node_id: EDGE_NODE_ID,
  });
});

app.use("/api/v1/auth", authRouter);
app.get("/api/v1/me", requireAuth, (req, res) => res.json(req.user));
app.use("/api/v1/room-types", roomTypesRouter);
app.use("/api/v1/rooms", roomsRouter);
app.use("/api/v1/bookings", bookingsRouter);
app.use("/api/v1/devices", devicesRouter);
// commandsRouter cùng tiếp đầu ngữ /devices/:id vì lệnh luôn gắn với 1 thiết bị.
app.use("/api/v1/devices", commandsRouter);
app.use("/api/v1/internal", internalRouter);
app.use("/api/v1/sync", syncRouter);

app.use((_req, res) => {
  res.status(404).json({ error_code: "ROUTE_NOT_FOUND", message: "Không tìm thấy endpoint." });
});
app.use(errorHandler);

// 14200 dành cho chế độ dev không Docker; Docker luôn truyền PORT=4200.
const PORT = Number(process.env.PORT) || 14200;

async function start() {
  if (DB_MODE === "embedded" && embeddedDb) {
    await bootstrapEmbeddedDb(embeddedDb);
  }

  // BẮT BUỘC bind "0.0.0.0" (KHÔNG phải "127.0.0.1"/mặc định localhost) — để
  // bất kỳ thiết bị nào trong cùng mạng LAN khách sạn (máy tính khác, điện
  // thoại nhân viên) truy cập được thẳng qua http://<ip-lan>:PORT, đúng yêu
  // cầu "hỏng máy tính vẫn dùng ngay máy khác/điện thoại được" — trạng thái
  // sống trên chính Edge Node, không phụ thuộc máy tính cụ thể nào.
  app.listen(PORT, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(`Edge Node (${EDGE_NODE_ID}) đang chạy tại http://0.0.0.0:${PORT} (DB_MODE=${DB_MODE})`);
    // eslint-disable-next-line no-console
    console.log(`  -> Truy cập từ máy khác trong cùng mạng LAN qua http://<ip-lan-cua-may-nay>:${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Khởi động Edge Node thất bại:", err);
  process.exit(1);
});

// --- Timeout sweep (device_commands) — cùng khái niệm với iot-service ---
const sweepIntervalMs = Number(process.env.TIMEOUT_SWEEP_INTERVAL_MS) || 5000;
const sweepTimer = setInterval(() => {
  commandsRepo
    .sweepExpired()
    .then((count) => {
      if (count > 0) {
        // eslint-disable-next-line no-console
        console.log(`[timeout-sweep] đã chuyển ${count} lệnh PENDING quá hạn sang TIMEOUT`);
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[timeout-sweep] lỗi:", err);
    });
}, sweepIntervalMs);
sweepTimer.unref?.();

// --- Job đồng bộ nền (outbox push + pull Cloud) ---
// Mirror pattern webadmin/apps/api/src/index.ts (job nền trong CÙNG process,
// setInterval + unref(), KHÔNG throw/crash khi Cloud chưa chạy — xem
// src/lib/sync.ts runSyncCycle(), luôn tự bắt lỗi mạng). Có thể tắt bằng
// DISABLE_SYNC_JOB=1 (vd. khi test không muốn job nền can thiệp).
if (process.env.DISABLE_SYNC_JOB !== "1") {
  const syncIntervalMs = Number(process.env.SYNC_INTERVAL_MS) || 15000;
  const syncTimer = setInterval(() => {
    runSyncCycle()
      .then((summary) => {
        if (summary.cloudReachable) {
          // eslint-disable-next-line no-console
          console.log(
            `[sync] đẩy ${summary.pushed} sự kiện (${summary.pushFailed} lỗi), kéo về ${summary.pulled.rooms} phòng/${summary.pulled.bookings} đặt phòng/${summary.pulled.users} người dùng.`
          );
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[sync] lỗi không mong muốn:", err);
      });
  }, syncIntervalMs);
  syncTimer.unref?.();
}

const heartbeatIntervalMs = Number(process.env.EDGE_HEARTBEAT_INTERVAL_MS) || 30_000;
const heartbeatTimer = setInterval(() => {
  sendEdgeHeartbeat().catch((err) => console.error("[edge-heartbeat] lỗi:", err));
}, heartbeatIntervalMs);
heartbeatTimer.unref?.();
void sendEdgeHeartbeat();

process.on("SIGTERM", async () => {
  clearInterval(heartbeatTimer);
  if (DB_MODE === "embedded" && embeddedDb) {
    await embeddedDb.close();
  } else {
    const maybePgPool = pool as unknown as { end?: () => Promise<void> };
    if (typeof maybePgPool.end === "function") await maybePgPool.end();
  }
  process.exit(0);
});
