import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { devicesRepo } from "../repositories/devices.repo";
import { ENERGY_CONTROL_KINDS } from "../repositories/roomControl.repo";

const EDGE_NODE_URL = process.env.EDGE_NODE_URL ?? "http://localhost:4200";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

const createSchema = z.object({
  roomId: z.string().optional().nullable(),
  controlKind: z
    .enum(["POWER_METER", "POWER_SWITCH", "LIGHTING_CONTROLLER", "AC_CONTROLLER", "DOOR_LOCK", "CARD_DISPENSER", "ANNOUNCEMENT_SPEAKER", "SMART_TV", "OTHER"])
    .default("POWER_SWITCH"),
  name: z.string().min(1),
  externalId: z.string().optional(),
  assetCode: z.string().trim().regex(/^AST-\d+$/i, "assetCode phải có dạng AST-000001.").optional(),
  status: z.enum(["ONLINE", "OFFLINE", "ERROR"]).default("OFFLINE"),
  powerOn: z.boolean().default(false),
  locationScope: z.enum(["ROOM", "FLOOR", "ZONE", "PROPERTY"]).optional(),
  locationLabel: z.string().trim().max(120).optional().nullable(),
});

const powerSchema = z.object({ powerOn: z.boolean() });
const iotLinkSchema = z.object({ assetCode: z.string().trim().regex(/^AST-\d+$/i, "assetCode phải có dạng AST-000001.") });
const DEVICE_TYPE_BY_CONTROL_KIND = {
  POWER_METER: "OTHER",
  POWER_SWITCH: "POWER_SWITCH",
  LIGHTING_CONTROLLER: "POWER_SWITCH",
  AC_CONTROLLER: "AC_CONTROLLER",
  DOOR_LOCK: "DOOR_LOCK",
  CARD_DISPENSER: "OTHER",
  ANNOUNCEMENT_SPEAKER: "OTHER",
  SMART_TV: "OTHER",
  OTHER: "OTHER",
} as const;

async function linkToIot(input: { id: string; property_id: string; tenant_id: string; room_id: string | null; name: string; control_kind: string; assetCode: string }) {
  if (!INTERNAL_SERVICE_KEY) throw Errors.conflict("Thiếu khóa dịch vụ nội bộ; chưa thể ghép Edge/IoT.");
  if (!input.room_id) throw Errors.conflict("Chỉ thiết bị đã gán vào phòng mới có thể điều khiển qua IoT.");
  if (!ENERGY_CONTROL_KINDS.includes(input.control_kind as typeof ENERGY_CONTROL_KINDS[number])) {
    throw Errors.conflict("Loại thiết bị này chưa có adapter lệnh IoT. Chỉ ghép nguồn, đèn, điều hòa, TV hoặc loa ở bước này.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`${EDGE_NODE_URL}/api/v1/internal/device-bindings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
      signal: controller.signal,
      body: JSON.stringify({
        pmsDeviceId: input.id, propertyId: input.property_id, tenantId: input.tenant_id, roomId: input.room_id,
        name: input.name, assetCode: input.assetCode.toUpperCase(), iotDeviceType: input.control_kind === "AC_CONTROLLER" ? "AIRCON" : "SWITCH",
      }),
    });
    if (!response.ok) {
      const message = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 500);
      throw Errors.conflict(message || `Edge trả HTTP ${response.status} khi ghép thiết bị.`);
    }
    const body = (await response.json()) as { device?: { id?: string } };
    if (!body.device?.id) throw Errors.conflict("Edge không trả mã thiết bị IoT hợp lệ.");
    return body.device.id;
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) throw error;
    throw Errors.conflict(`Không kết nối được Edge để ghép thiết bị: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}

devicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await devicesRepo.list(req.user!.propertyId, req.query.roomId as string | undefined);
    res.json({ items, total: items.length });
  })
);

devicesRouter.post(
  "/",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const device = await devicesRepo.create(req.user!.propertyId, req.user!.tenantId, {
      ...parsed.data,
      deviceType: DEVICE_TYPE_BY_CONTROL_KIND[parsed.data.controlKind],
    });
    if (!device) throw Errors.notFound("phòng thuộc cơ sở");
    await writeAuditLog({ req, action: "CREATE_DEVICE", entityType: "device", entityId: device.id, afterData: device });
    res.status(201).json(device);
  })
);

// Ghép một thiết bị PMS với tài sản đã khai báo trên HQ và thiết bị vận hành
// tại IoT. Edge là điểm trung gian duy nhất: nó xác minh asset_code ở HQ rồi
// tạo/tái sử dụng IoT device idempotent theo mã PMS, tránh PMS gọi thẳng IoT.
devicesRouter.post(
  "/:id/iot-link",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const parsed = iotLinkSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const existing = (await devicesRepo.list(req.user!.propertyId)).find((device) => device.id === req.params.id);
    if (!existing) throw Errors.notFound("thiết bị");
    const iotDeviceId = await linkToIot({ ...existing, assetCode: parsed.data.assetCode });
    const device = await devicesRepo.setIotLink(req.user!.propertyId, existing.id, parsed.data.assetCode.toUpperCase(), iotDeviceId);
    if (!device) throw Errors.notFound("thiết bị");
    await writeAuditLog({ req, action: "LINK_DEVICE_TO_EDGE_IOT", entityType: "device", entityId: device.id, beforeData: existing, afterData: device });
    res.json(device);
  })
);

devicesRouter.delete(
  "/:id",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const devices = await devicesRepo.list(req.user!.propertyId);
    const existing = devices.find((device) => device.id === req.params.id);
    if (!existing) throw Errors.notFound("thiết bị");
    await devicesRepo.remove(req.user!.propertyId, existing.id);
    await writeAuditLog({ req, action: "DELETE_DEVICE", entityType: "device", entityId: existing.id, beforeData: existing });
    res.status(204).end();
  })
);

devicesRouter.patch(
  "/:id/power",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  asyncHandler(async (req, res) => {
    const parsed = powerSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const existing = (await devicesRepo.list(req.user!.propertyId)).find((item) => item.id === req.params.id);
    if (!existing) throw Errors.notFound("thiết bị");
    if (!ENERGY_CONTROL_KINDS.includes(existing.control_kind as typeof ENERGY_CONTROL_KINDS[number])) {
      throw Errors.conflict("Loại thiết bị này không dùng công tắc nguồn phòng. Công tơ chỉ đọc số liệu; khóa và bộ cấp thẻ có nghiệp vụ riêng.");
    }
    const device = await devicesRepo.setPower(req.user!.propertyId, req.params.id, parsed.data.powerOn);
    if (!device) throw Errors.notFound("thiết bị");
    await writeAuditLog({ req, action: "TOGGLE_DEVICE_POWER", entityType: "device", entityId: req.params.id, afterData: device });
    res.json(device);
  })
);
