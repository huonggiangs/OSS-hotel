import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { rulesRouter } from "./routes/rules.routes";
import { pricingRouter } from "./routes/pricing.routes";
import { errorHandler } from "./middleware/errorHandler";
import { requireServiceAuth } from "./middleware/serviceAuth";
import { pool } from "./lib/db";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? false }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "ai-pricing-service" }));

app.use("/api/v1", requireServiceAuth);
app.use("/api/v1/pricing/rules", rulesRouter);
app.use("/api/v1/pricing", pricingRouter);

app.use((_req, res) => {
  res.status(404).json({ error_code: "ROUTE_NOT_FOUND", message: "Không tìm thấy endpoint." });
});
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4102;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ai-pricing-service đang chạy tại http://localhost:${PORT}`);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
