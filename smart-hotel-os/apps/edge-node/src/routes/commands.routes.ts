import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { devicesRepo } from "../repositories/devices.repo";
import { commandsRepo } from "../repositories/commands.repo";

// Mirror CHÍNH XÁC luồng idempotent + ack + timeout của
// smart-hotel-os/services/iot-service/src/routes/commands.routes.ts, chạy cục
// bộ trên PGlite (không phụ thuộc mạng) — xem repositories/commands.repo.ts.
export const commandsRouter = Router();
commandsRouter.use(requireAuth);

const DEFAULT_TIMEOUT_SECONDS = Number(process.env.DEFAULT_COMMAND_TIMEOUT_SECONDS) || 30;

const createCommandSchema = z.object({
  commandType: z.enum([
    "POWER_ON",
    "POWER_OFF",
    "AC_SET_TEMPERATURE",
    "AC_SET_MODE",
    "DEVICE_STATUS_CHECK",
    "DEVICE_RESTART",
  ]),
  payload: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().min(1).optional(),
  timeoutSeconds: z.number().int().positive().max(3600).optional(),
});

commandsRouter.post(
  "/:id/commands",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.user!.propertyId, req.params.id);
    if (!device) throw Errors.notFound("thiết bị");

    const parsed = createCommandSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const input = parsed.data;

    if (input.idempotencyKey) {
      const existing = await commandsRepo.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        const checked = await commandsRepo.expireIfOverdue(existing);
        return res.status(200).json({ idempotent_replay: true, command: checked });
      }
    }

    const id = randomUUID();
    const idempotencyKey = input.idempotencyKey ?? id;
    const timeoutSeconds = input.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
    const expiresAt = new Date(Date.now() + timeoutSeconds * 1000);

    const command = await commandsRepo.create({
      id,
      tenantId: req.user!.tenantId,
      propertyId: device.property_id,
      deviceId: device.id,
      commandType: input.commandType,
      payload: input.payload,
      idempotencyKey,
      expiresAt,
    });

    res.status(202).json({ command });
  })
);

commandsRouter.get(
  "/:id/commands",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.user!.propertyId, req.params.id);
    if (!device) throw Errors.notFound("thiết bị");
    const status = req.query.status as "PENDING" | "ACKED" | "TIMEOUT" | "FAILED" | undefined;
    const items = await commandsRepo.listByDevice(device.id, status);
    res.json({ items, total: items.length });
  })
);

commandsRouter.get(
  "/:id/commands/:commandId",
  asyncHandler(async (req, res) => {
    const command = await commandsRepo.findById(req.params.commandId);
    if (!command || command.device_id !== req.params.id) throw Errors.notFound("lệnh");
    const checked = await commandsRepo.expireIfOverdue(command);
    res.json(checked);
  })
);

const ackSchema = z.object({
  commandId: z.string().min(1),
  result: z
    .object({
      success: z.boolean(),
      message: z.string().optional(),
    })
    .default({ success: true }),
});

// POST /:id/ack — endpoint GIẢ LẬP thiết bị thật gọi lên xác nhận đã thực thi
// lệnh (chưa có phần cứng/MQTT thật tại đây — xem README.md). Idempotent.
commandsRouter.post(
  "/:id/ack",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.user!.propertyId, req.params.id);
    if (!device) throw Errors.notFound("thiết bị");

    const parsed = ackSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { commandId, result } = parsed.data;

    const command = await commandsRepo.findById(commandId);
    if (!command || command.device_id !== device.id) throw Errors.notFound("lệnh");

    if (command.status === "ACKED") {
      return res.status(200).json({ idempotent_replay: true, command });
    }

    const checked = await commandsRepo.expireIfOverdue(command);
    if (checked.status === "TIMEOUT") {
      throw Errors.conflict(`Lệnh ${commandId} đã TIMEOUT (quá hạn ${checked.expires_at}) trước khi thiết bị kịp ack.`);
    }

    const acked = await commandsRepo.markAcked(commandId, result);
    if (!acked) throw Errors.conflict(`Lệnh ${commandId} không còn ở trạng thái PENDING.`);

    if (result.success) {
      if (command.command_type === "POWER_ON") await devicesRepo.updatePowerState(device.id, true);
      if (command.command_type === "POWER_OFF") await devicesRepo.updatePowerState(device.id, false);
    }

    res.status(200).json({ command: acked });
  })
);
