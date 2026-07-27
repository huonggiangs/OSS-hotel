import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { devicesRepo } from "../repositories/devices.repo";
import { commandsRepo } from "../repositories/commands.repo";

export const commandsRouter = Router();

const DEFAULT_TIMEOUT_SECONDS = Number(process.env.DEFAULT_COMMAND_TIMEOUT_SECONDS) || 30;

const createCommandSchema = z.object({
  tenantId: z.string().min(1),
  commandType: z.enum([
    "POWER_ON",
    "POWER_OFF",
    "AC_SET_TEMPERATURE",
    "AC_SET_MODE",
    "DEVICE_STATUS_CHECK",
    "DEVICE_RESTART",
  ]),
  payload: z.record(z.unknown()).default({}),
  // Caller tự cấp idempotencyKey nếu muốn retry an toàn (vd. rule engine gọi
  // lại do timeout mạng); nếu không truyền, mỗi lần gọi tạo 1 lệnh mới.
  idempotencyKey: z.string().min(1).optional(),
  timeoutSeconds: z.number().int().positive().max(3600).optional(),
});

// POST /devices/:id/commands — tạo lệnh, trả command id NGAY (async, không
// chờ thiết bị ack) — đúng mô hình bắt buộc RULES.md mục 10.
commandsRouter.post(
  "/:id/commands",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.params.id);
    if (!device) throw Errors.notFound("thiết bị");

    const parsed = createCommandSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const input = parsed.data;

    // --- Idempotency: nếu đã có lệnh với cùng idempotencyKey, trả về lệnh cũ
    //     thay vì tạo lệnh trùng (dù đang PENDING/ACKED/TIMEOUT/FAILED). ---
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
      tenantId: input.tenantId,
      propertyId: device.property_id,
      deviceId: device.id,
      commandType: input.commandType,
      payload: input.payload,
      idempotencyKey,
      expiresAt,
    });

    // Trả 202 Accepted: lệnh đã được ghi nhận, đang chờ thiết bị ack — đây là
    // luồng ASYNC, KHÔNG chờ thiết bị xử lý xong mới trả response.
    res.status(202).json({ command });
  })
);

commandsRouter.get(
  "/:id/commands",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.params.id);
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
    // Lazy timeout: mỗi lần tra cứu đều kiểm tra hạn, không cần chờ sweep job.
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

// POST /devices/:id/ack — endpoint GIẢ LẬP thiết bị thật gọi lên xác nhận đã
// thực thi lệnh (vì chưa có phần cứng/MQTT broker — xem README.md). Idempotent:
// gọi ack lại cho lệnh đã ACKED trả về đúng kết quả cũ, không lỗi.
commandsRouter.post(
  "/:id/ack",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.params.id);
    if (!device) throw Errors.notFound("thiết bị");

    const parsed = ackSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { commandId, result } = parsed.data;

    const command = await commandsRepo.findById(commandId);
    if (!command || command.device_id !== device.id) throw Errors.notFound("lệnh");

    if (command.status === "ACKED") {
      // Ack lặp lại (thiết bị gửi 2 lần do mất gói tin phản hồi) -> idempotent, không lỗi.
      return res.status(200).json({ idempotent_replay: true, command });
    }

    const checked = await commandsRepo.expireIfOverdue(command);
    if (checked.status === "TIMEOUT") {
      throw Errors.conflict(`Lệnh ${commandId} đã TIMEOUT (quá hạn ${checked.expires_at}) trước khi thiết bị kịp ack.`);
    }

    const acked = await commandsRepo.markAcked(commandId, result);
    if (!acked) throw Errors.conflict(`Lệnh ${commandId} không còn ở trạng thái PENDING.`);

    // Cập nhật trạng thái thiết bị theo loại lệnh vừa được ack thành công.
    if (result.success) {
      if (command.command_type === "POWER_ON") await devicesRepo.updatePowerState(device.id, "ON");
      if (command.command_type === "POWER_OFF") await devicesRepo.updatePowerState(device.id, "OFF");
    }

    res.status(200).json({ command: acked });
  })
);
