import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { connectionsRepo } from "../repositories/connections.repo";
import { priceSyncRepo } from "../repositories/priceSync.repo";
import { getOtaAdapter } from "../adapters";

export const priceRouter = Router();

const syncSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  roomTypeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date phải theo định dạng YYYY-MM-DD"),
  price: z.number().positive(),
  provider: z.enum(["booking", "agoda", "airbnb"]).optional(),
});

// POST /price/sync — thường được gọi sau khi quản lý duyệt một đề xuất giá từ
// ai-pricing-service (MODULE_AI_PRICING.md mục 4: apply -> cập nhật PMS Core
// -> Channel Manager đồng bộ OTA). Service này KHÔNG tự quyết định giá.
priceRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { tenantId, propertyId, roomTypeId, date, price, provider } = parsed.data;

    const connections = provider
      ? [await connectionsRepo.findByPropertyAndProvider(propertyId, provider)].filter(Boolean)
      : await connectionsRepo.listConnectedForProperty(propertyId);

    const results = [];
    for (const connection of connections) {
      if (!connection) continue;
      const adapter = getOtaAdapter(connection.ota_provider);
      const requestPayload = { propertyId, roomTypeId, date, price };
      try {
        const result = await adapter.pushPrice({
          propertyId,
          roomTypeId,
          date,
          price,
          credentials: connection.credentials,
        });
        const log = await priceSyncRepo.createSyncLog({
          tenantId,
          propertyId,
          connectionId: connection.id,
          roomTypeId,
          date,
          price,
          status: result.success ? "SUCCESS" : "FAILED",
          requestPayload,
          responsePayload: result.raw,
          errorMessage: result.errorMessage ?? null,
        });
        results.push({ provider: connection.ota_provider, status: log.status, syncLogId: log.id });
      } catch (err) {
        const log = await priceSyncRepo.createSyncLog({
          tenantId,
          propertyId,
          connectionId: connection.id,
          roomTypeId,
          date,
          price,
          status: "FAILED",
          requestPayload,
          responsePayload: null,
          errorMessage: err instanceof Error ? err.message : "unknown error",
        });
        results.push({ provider: connection.ota_provider, status: log.status, syncLogId: log.id });
      }
    }

    res.status(200).json({ synced_to: results });
  })
);

priceRouter.get(
  "/sync-log",
  asyncHandler(async (req, res) => {
    const propertyId = req.query.propertyId as string | undefined;
    if (!propertyId) throw Errors.validation({ propertyId: "Bắt buộc truyền query propertyId" });
    const items = await priceSyncRepo.listSyncLogs(propertyId);
    res.json({ items, total: items.length });
  })
);
