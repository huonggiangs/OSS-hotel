import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { connectionsRepo } from "../repositories/connections.repo";
import { SUPPORTED_PROVIDERS } from "../adapters";

export const connectionsRouter = Router();

// Endpoint hỗ trợ thiết lập demo/test: tạo hoặc cập nhật kết nối OTA cho một
// property. Ở sản phẩm thật, credentials phải được mã hoá trước khi lưu
// (xem PROGRESS.md mục "Giới hạn/chưa làm").
const upsertSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  provider: z.enum(["booking", "agoda", "airbnb"]),
  credentials: z.record(z.unknown()).default({}),
});

connectionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await connectionsRepo.list(req.query.propertyId as string | undefined);
    res.json({ items, total: items.length, supported_providers: SUPPORTED_PROVIDERS });
  })
);

connectionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const connection = await connectionsRepo.upsert(parsed.data);
    res.status(201).json(connection);
  })
);
