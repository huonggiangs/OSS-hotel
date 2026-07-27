import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { devicesRepo } from "../repositories/devices.repo";
import { heartbeatsRepo } from "../repositories/heartbeats.repo";

export const devicesRouter = Router();

devicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await devicesRepo.list(req.query.propertyId as string | undefined, req.query.roomId as string | undefined);
    res.json({ items, total: items.length });
  })
);

const createSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  roomId: z.string().min(1),
  deviceType: z.enum(["SWITCH", "AIRCON"]),
  name: z.string().min(1),
});

devicesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const device = await devicesRepo.create(parsed.data);
    res.status(201).json(device);
  })
);

devicesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.params.id);
    if (!device) throw Errors.notFound("thiết bị");
    res.json(device);
  })
);

// POST /devices/:id/heartbeat — mô phỏng thiết bị "gọi điện thoại" định kỳ báo
// còn sống. Ghi cộng dồn vào cửa sổ giờ hiện tại (device_heartbeats), KHÔNG
// lưu một dòng riêng cho từng lần gọi.
devicesRouter.post(
  "/:id/heartbeat",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.params.id);
    if (!device) throw Errors.notFound("thiết bị");
    await devicesRepo.touchHeartbeat(device.id);
    const window = await heartbeatsRepo.record({
      tenantId: device.tenant_id,
      propertyId: device.property_id,
      deviceId: device.id,
      online: true,
      powerState: device.power_state,
    });
    res.status(200).json({ recorded: true, window });
  })
);

devicesRouter.get(
  "/:id/heartbeats",
  asyncHandler(async (req, res) => {
    const items = await heartbeatsRepo.listByDevice(req.params.id);
    res.json({ items, total: items.length });
  })
);
