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
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/auth";
import { pool } from "./lib/db";

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

app.use((_req, res) => {
  res.status(404).json({ error_code: "ROUTE_NOT_FOUND", message: "Không tìm thấy endpoint." });
});
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4100;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Property Web API đang chạy tại http://localhost:${PORT}`);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
