import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { deviceGateway } from "../lib/deviceGateway";

export const deviceGatewayRouter = Router();

function keyFrom(req: { header(name: string): string | undefined }): string {
  return req.header("X-Device-Key") ?? "";
}

function mapGatewayError(error: unknown): { status: number; code: string; message: string } {
  const code = (error as Error).message;
  if (code === "DEVICE_AUTH_FAILED") return { status: 401, code, message: "Sai mã thiết bị hoặc khóa kết nối." };
  if (code === "COMMAND_NOT_FOUND") return { status: 404, code, message: "Không tìm thấy lệnh của thiết bị." };
  if (code === "COMMAND_TIMEOUT") return { status: 409, code, message: "Lệnh đã quá hạn trước khi thiết bị xác nhận." };
  return { status: 409, code: "DEVICE_GATEWAY_ERROR", message: "Không thể xử lý yêu cầu thiết bị." };
}

function wrap(handler: (req: any, res: any) => Promise<void>) {
  return asyncHandler(async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
      const mapped = mapGatewayError(error);
      res.status(mapped.status).json({ error_code: mapped.code, message: mapped.message });
    }
  });
}

deviceGatewayRouter.post("/:assetCode/heartbeat", wrap(async (req, res) => {
  const result = await deviceGateway.heartbeat(req.params.assetCode, keyFrom(req), "HTTP", req.body ?? {});
  res.json({ recorded: true, last_heartbeat_at: result.device?.last_heartbeat_at });
}));

deviceGatewayRouter.post("/:assetCode/telemetry", wrap(async (req, res) => {
  const parsed = z.object({ payload: z.record(z.unknown()) }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error_code: "VALIDATION_ERROR", message: "payload phải là một object." });
  const device = await deviceGateway.telemetry(req.params.assetCode, keyFrom(req), "HTTP", parsed.data.payload);
  res.json({ recorded: true, last_seen_at: device?.last_heartbeat_at });
}));

deviceGatewayRouter.get("/:assetCode/commands", wrap(async (req, res) => {
  const result = await deviceGateway.pendingCommands(req.params.assetCode, keyFrom(req));
  res.json({ items: result.commands, total: result.commands.length });
}));

deviceGatewayRouter.post("/:assetCode/commands/:commandId/ack", wrap(async (req, res) => {
  const parsed = z.object({ success: z.boolean(), message: z.string().optional(), data: z.unknown().optional() }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error_code: "VALIDATION_ERROR", message: "Thiếu kết quả thực thi lệnh." });
  const command = await deviceGateway.acknowledge(
    req.params.assetCode, keyFrom(req), req.params.commandId, "HTTP", parsed.data
  );
  res.json({ command });
}));
