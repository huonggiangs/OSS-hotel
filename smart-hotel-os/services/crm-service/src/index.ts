import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { customersRouter } from "./routes/customers.routes";
import { segmentsRouter } from "./routes/segments.routes";
import { campaignsRouter } from "./routes/campaigns.routes";
import { errorHandler } from "./middleware/errorHandler";
import { pool } from "./lib/db";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "crm-service" }));

app.use("/api/v1/customers", customersRouter);
app.use("/api/v1/segments", segmentsRouter);
app.use("/api/v1/campaigns", campaignsRouter);

app.use((_req, res) => {
  res.status(404).json({ error_code: "ROUTE_NOT_FOUND", message: "Không tìm thấy endpoint." });
});
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4104;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`crm-service đang chạy tại http://localhost:${PORT}`);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
