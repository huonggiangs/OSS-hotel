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
app.use("/api/v1/partners", partnersRouter);
app.use("/api/v1/suppliers", suppliersRouter);
app.use("/api/v1/customers", customersRouter);
app.use("/api/v1/hardware-assets", hardwareAssetsRouter);
app.use("/api/v1/commissions", commissionsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/audit-logs", auditLogsRouter);

app.use((_req, res) => {
  res.status(404).json({ error_code: "ROUTE_NOT_FOUND", message: "Không tìm thấy endpoint." });
});
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`HQ Console API đang chạy tại http://localhost:${PORT}`);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
