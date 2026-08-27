import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { devicesRepo } from "../repositories/devices.repo";
import { ENERGY_CONTROL_KINDS } from "../repositories/roomControl.repo";

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

const createSchema = z.object({
  roomId: z.string().optional().nullable(),
  controlKind: z
    .enum(["POWER_METER", "POWER_SWITCH", "LIGHTING_CONTROLLER", "AC_CONTROLLER", "DOOR_LOCK", "CARD_DISPENSER", "ANNOUNCEMENT_SPEAKER", "SMART_TV", "OTHER"])
    .default("POWER_SWITCH"),
  name: z.string().min(1),
  externalId: z.string().optional(),
  status: z.enum(["ONLINE", "OFFLINE", "ERROR"]).default("OFFLINE"),
  powerOn: z.boolean().default(false),
  locationScope: z.enum(["ROOM", "FLOOR", "ZONE", "PROPERTY"]).optional(),
  locationLabel: z.string().trim().max(120).optional().nullable(),
});

const powerSchema = z.object({ powerOn: z.boolean() });
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
