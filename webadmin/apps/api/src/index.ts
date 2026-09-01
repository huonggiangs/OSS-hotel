import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { authRouter } from "./routes/auth.routes";
import { partnersRouter } from "./routes/partners.routes";
import { suppliersRouter } from "./routes/suppliers.routes";
import { customersRouter } from "./routes/customers.routes";
import { hardwareAssetsRouter } from "./routes/hardware-assets.routes";
import { commissionsRouter } from "./routes/commissions.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { auditLogsRouter } from "./routes/audit-logs.routes";
import { usersRouter } from "./routes/users.routes";
import { releasesRouter } from "./routes/releases.routes";
import { purchaseOrdersRouter } from "./routes/purchase-orders.routes";
import { internalRouter } from "./routes/internal.routes";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/auth";
import { pool, DB_MODE, embeddedDb } from "./lib/db";
import { bootstrapEmbeddedDb } from "./lib/embeddedBootstrap";
import { syncConnectionStatusFromIot } from "./lib/iotSync";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.WEB_ORIGIN?.split(",") ?? "*",
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", db_mode: DB_MODE }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/internal", internalRouter);
app.get("/api/v1/me", requireAuth, (req, res) => res.json(req.user));
app.use("/api/v1/partners", partnersRouter);
app.use("/api/v1/suppliers", suppliersRouter);
app.use("/api/v1/customers", customersRouter);
app.use("/api/v1/hardware-assets", hardwareAssetsRouter);
app.use("/api/v1/commissions", commissionsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/audit-logs", auditLogsRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/releases", releasesRouter);
app.use("/api/v1/purchase-orders", purchaseOrdersRouter);

app.use((_req, res) => {
  res.status(404).json({ error_code: "ROUTE_NOT_FOUND", message: "Không tìm thấy endpoint." });
});
app.use(errorHandler);

// 14000 dành cho chế độ dev không Docker; Docker luôn truyền PORT=4000.
// Tách cổng này tránh việc start-all.ps1 tranh cổng với môi trường LAN Docker.
const PORT = Number(process.env.PORT) || 14000;

async function start() {
  // Chế độ embedded (PGlite, không cần Docker/PostgreSQL): tự chạy migration +
  // seed lần đầu TRƯỚC khi mở cổng lắng nghe, để `npm run dev` là có ngay dữ
  // liệu để đăng nhập, không phải chạy thêm lệnh migrate/seed thủ công nào.
  if (DB_MODE === "embedded" && embeddedDb) {
    await bootstrapEmbeddedDb(embeddedDb);
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`HQ Console API đang chạy tại http://localhost:${PORT} (DB_MODE=${DB_MODE})`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Không khởi động được API:", err);
  process.exit(1);
});

// --- Đồng bộ trạng thái kết nối thiết bị từ iot-service ---
// Chạy nền định kỳ trong CÙNG process (đủ đơn giản cho quy mô demo/MVP hiện
// tại, giống cách "timeout sweep" của iot-service đã làm) — KHÔNG throw/crash
// process khi iot-service chưa chạy (syncConnectionStatusFromIot tự bắt lỗi
// mạng, trả về iotServiceReachable=false). Có thể tắt bằng
// DISABLE_IOT_SYNC_JOB=1 (vd. khi test không cần job nền can thiệp).
if (process.env.DISABLE_IOT_SYNC_JOB !== "1") {
  const syncIntervalMs = Number(process.env.IOT_SYNC_INTERVAL_MS) || 30000;
  const syncTimer = setInterval(() => {
    syncConnectionStatusFromIot()
      .then((result) => {
        if (result.iotServiceReachable) {
          // eslint-disable-next-line no-console
          console.log(
            `[iot-sync] đã khớp ${result.matchedAssets}/${result.fetchedDevices} thiết bị, sinh ${result.alertsCreated} cảnh báo mới.`
          );
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[iot-sync] lỗi không mong muốn:", err);
      });
  }, syncIntervalMs);
  syncTimer.unref?.();
}

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
