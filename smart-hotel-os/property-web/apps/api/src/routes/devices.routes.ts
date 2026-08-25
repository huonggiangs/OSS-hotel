import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { devicesRepo } from "../repositories/devices.repo";

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

const createSchema = z.object({
  roomId: z.string().optional().nullable(),
  deviceType: z.enum(["POWER_SWITCH", "AC_CONTROLLER", "DOOR_LOCK", "OTHER"]).default("POWER_SWITCH"),
  name: z.string().min(1),
  externalId: z.string().optional(),
  status: z.enum(["ONLINE", "OFFLINE", "ERROR"]).default("OFFLINE"),
  powerOn: z.boolean().default(false),
});

const powerSchema = z.object({ powerOn: z.boolean() });

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
    const device = await devicesRepo.create(req.user!.propertyId, req.user!.tenantId, parsed.data);
    if (!device) throw Errors.notFound("phòng thuộc cơ sở");
    await writeAuditLog({ req, action: "CREATE_DEVICE", entityType: "device", entityId: device.id, afterData: device });
    res.status(201).json(device);
  })
);

devicesRouter.patch(
  "/:id/power",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  asyncHandler(async (req, res) => {
    const parsed = powerSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const device = await devicesRepo.setPower(req.user!.propertyId, req.params.id, parsed.data.powerOn);
    if (!device) throw Errors.notFound("thiết bị");
    await writeAuditLog({ req, action: "TOGGLE_DEVICE_POWER", entityType: "device", entityId: req.params.id, afterData: device });
    res.json(device);
  })
);
