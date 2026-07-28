import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { authRouter } from "./routes/auth.routes";
import { roomTypesRouter } from "./routes/roomTypes.routes";
import { roomsRouter } from "./routes/rooms.routes";
import { customersRouter } from "./routes/customers.routes";
import { bookingsRouter } from "./routes/bookings.routes";
import { invoicesRouter } from "./routes/invoices.routes";
import { expensesRouter } from "./routes/expenses.routes";
import { devicesRouter } from "./routes/devices.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { settingsRouter } from "./routes/settings.routes";
import { branchesRouter } from "./routes/branches.routes";
import { usersRouter } from "./routes/users.routes";
import { auditLogRouter } from "./routes/auditLog.routes";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/auth";
import { pool, DB_MODE, embeddedDb } from "./lib/db";
import { bootstrapEmbeddedDb } from "./lib/embeddedBootstrap";
import { ensureDefaultSettings } from "./lib/settingsBootstrap";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.WEB_ORIGIN?.split(",") ?? "*",
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/v1/auth", authRouter);
app.get("/api/v1/me", requireAuth, (req, res) => res.json(req.user));
app.use("/api/v1/room-types", roomTypesRouter);
app.use("/api/v1/rooms", roomsRouter);
app.use("/api/v1/customers", customersRouter);
app.use("/api/v1/bookings", bookingsRouter);
app.use("/api/v1/payments", invoicesRouter);
app.use("/api/v1/expenses", expensesRouter);
app.use("/api/v1/devices", devicesRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/branches", branchesRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/audit-log", auditLogRouter);

app.use((_req, res) => {
  res.status(404).json({ error_code: "ROUTE_NOT_FOUND", message: "Không tìm thấy endpoint." });
});
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4100;

async function start() {
  // Chế độ embedded (PGlite, không cần Docker/PostgreSQL): tự chạy migration +
  // seed lần đầu TRƯỚC khi mở cổng lắng nghe, để `npm run dev` là có ngay dữ
  // liệu để đăng nhập, không phải chạy thêm lệnh migrate/seed thủ công nào.
  if (DB_MODE === "embedded" && embeddedDb) {
    await bootstrapEmbeddedDb(embeddedDb);
  }

  // Seed mặc định cho property_settings (21 nhóm cấu hình) — chạy cho cả 2
  // chế độ DB, idempotent (chỉ insert nhóm còn thiếu). Đặt sau bootstrap
  // embedded ở trên để chắc chắn bảng "properties" đã có dữ liệu.
  await ensureDefaultSettings();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Property Web API đang chạy tại http://localhost:${PORT} (DB_MODE=${DB_MODE})`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Khởi động API thất bại:", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  if (DB_MODE === "embedded" && embeddedDb) {
    await embeddedDb.close();
  } else {
    const maybePgPool = pool as unknown as { end?: () => Promise<void> };
    if (typeof maybePgPool.end === "function") await maybePgPool.end();
  }
  process.exit(0);
});
