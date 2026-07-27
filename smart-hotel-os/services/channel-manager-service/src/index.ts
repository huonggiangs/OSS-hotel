import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { connectionsRouter } from "./routes/connections.routes";
import { inventoryRouter } from "./routes/inventory.routes";
import { priceRouter } from "./routes/price.routes";
import { webhooksRouter } from "./routes/webhooks.routes";
import { errorHandler } from "./middleware/errorHandler";
import { pool } from "./lib/db";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "channel-manager-service" }));

app.use("/api/v1/connections", connectionsRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/price", priceRouter);
app.use("/api/v1/webhooks", webhooksRouter);

app.use((_req, res) => {
  res.status(404).json({ error_code: "ROUTE_NOT_FOUND", message: "Không tìm thấy endpoint." });
});
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4101;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`channel-manager-service đang chạy tại http://localhost:${PORT}`);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
