import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { devicesRepo } from "../repositories/devices.repo";

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

const createSchema = z.object({
  roomId: z.string().optional().nullable(),
  deviceType: z.enum(["POWER_SWITCH", "AC_CONTROLLER", "DOOR_LOCK", "OTHER"]).default("POWER_SWITCH"),
  name: z.string().min(1),
  externalId: z.string().optional().nullable(),
  status: z.enum(["ONLINE", "OFFLINE", "ERROR"]).default("OFFLINE"),
  powerOn: z.boolean().default(false),
});

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
    res.status(201).json(device);
  })
);

devicesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.user!.propertyId, req.params.id);
    if (!device) throw Errors.notFound("thiết bị");
    res.json(device);
  })
);
