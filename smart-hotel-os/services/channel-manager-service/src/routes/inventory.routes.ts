import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { connectionsRepo } from "../repositories/connections.repo";
import { inventoryRepo } from "../repositories/inventory.repo";
import { getOtaAdapter } from "../adapters";

export const inventoryRouter = Router();

// POST /inventory/sync — PMS Core gọi endpoint này mỗi khi tồn phòng thay đổi
// (mô phỏng sự kiện `inventory.changed`, MODULE_CHANNEL_MANAGER_BOOKING.md
// mục A.2). PMS Core là nguồn sự thật — request này GHI ĐÈ bản sao cục bộ rồi
// đẩy sang mọi kênh OTA đang CONNECTED của property (hoặc chỉ 1 kênh nếu
// `provider` được chỉ định).
const syncSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  roomTypeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date phải theo định dạng YYYY-MM-DD"),
  availableRooms: z.number().int().min(0),
  provider: z.enum(["booking", "agoda", "airbnb"]).optional(),
});

inventoryRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { tenantId, propertyId, roomTypeId, date, availableRooms, provider } = parsed.data;

    // 1. Cập nhật bản sao cục bộ trước (source of truth phía PMS đã xác nhận).
    await inventoryRepo.upsertCache({ tenantId, propertyId, roomTypeId, date, availableRooms });

    // 2. Xác định các kết nối cần đẩy sang.
    const connections = provider
      ? [await connectionsRepo.findByPropertyAndProvider(propertyId, provider)].filter(Boolean)
      : await connectionsRepo.listConnectedForProperty(propertyId);

    const results = [];
    for (const connection of connections) {
      if (!connection) continue;
      const adapter = getOtaAdapter(connection.ota_provider);
      const requestPayload = { propertyId, roomTypeId, date, availableRooms };
      try {
        const result = await adapter.pushInventory({
          propertyId,
          roomTypeId,
          date,
          availableRooms,
          credentials: connection.credentials,
        });
        const log = await inventoryRepo.createSyncLog({
          tenantId,
          propertyId,
          connectionId: connection.id,
          roomTypeId,
          date,
          availableRooms,
          status: result.success ? "SUCCESS" : "FAILED",
          requestPayload,
          responsePayload: result.raw,
          errorMessage: result.errorMessage ?? null,
        });
        results.push({ provider: connection.ota_provider, status: log.status, syncLogId: log.id });
      } catch (err) {
        const log = await inventoryRepo.createSyncLog({
          tenantId,
          propertyId,
          connectionId: connection.id,
          roomTypeId,
          date,
          availableRooms,
          status: "FAILED",
          requestPayload,
          responsePayload: null,
          errorMessage: err instanceof Error ? err.message : "unknown error",
        });
        results.push({ provider: connection.ota_provider, status: log.status, syncLogId: log.id });
      }
    }

    res.status(200).json({ cached: true, synced_to: results });
  })
);

inventoryRouter.get(
  "/sync-log",
  asyncHandler(async (req, res) => {
    const propertyId = req.query.propertyId as string | undefined;
    if (!propertyId) throw Errors.validation({ propertyId: "Bắt buộc truyền query propertyId" });
    const items = await inventoryRepo.listSyncLogs(propertyId);
    res.json({ items, total: items.length });
  })
);
