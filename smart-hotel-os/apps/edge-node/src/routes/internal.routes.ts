import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";

export const internalRouter = Router();

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;
const IOT_SERVICE_URL = process.env.IOT_SERVICE_URL ?? "http://localhost:4103";
const IOT_SERVICE_API_KEY = process.env.SERVICE_API_KEY;
const HQ_CONSOLE_API_URL = process.env.HQ_CONSOLE_API_URL ?? "http://localhost:4000";

function requireInternalServiceKey(req: any, res: any, next: any) {
  const supplied = req.header("X-Internal-Service-Key");
  if (!INTERNAL_SERVICE_KEY || !supplied || supplied.length !== INTERNAL_SERVICE_KEY.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(INTERNAL_SERVICE_KEY))) {
    return res.status(401).json({ error_code: "UNAUTHORIZED", message: "Thiếu hoặc sai X-Internal-Service-Key." });
  }
  next();
}

function iotHeaders() {
  return { "Content-Type": "application/json", ...(IOT_SERVICE_API_KEY ? { "X-Service-Api-Key": IOT_SERVICE_API_KEY } : {}) };
}

async function readError(response: Response) {
  return (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 500) || `HTTP ${response.status}`;
}

async function iotFetch(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    return await fetch(`${IOT_SERVICE_URL}${path}`, { ...init, headers: { ...iotHeaders(), ...(init.headers ?? {}) }, signal: controller.signal });
  } finally { clearTimeout(timeout); }
}

const bindingSchema = z.object({
  pmsDeviceId: z.string().min(1), propertyId: z.string().min(1), tenantId: z.string().min(1), roomId: z.string().min(1),
  name: z.string().trim().min(1).max(200), assetCode: z.string().trim().regex(/^AST-\d+$/i), iotDeviceType: z.enum(["SWITCH", "AIRCON"]),
});
const eventSchema = z.object({
  eventId: z.string().min(1), propertyId: z.string().min(1), tenantId: z.string().min(1), roomId: z.string().nullable(), bookingId: z.string().nullable(),
  pmsDeviceId: z.string().min(1), iotDeviceId: z.string().min(1), assetCode: z.string().trim().regex(/^AST-\d+$/i),
  action: z.enum(["POWER_ON", "POWER_OFF"]), payload: z.record(z.unknown()).default({}),
});

internalRouter.post(
  "/device-bindings",
  requireInternalServiceKey,
  asyncHandler(async (req, res) => {
    const parsed = bindingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ error_code: "VALIDATION_ERROR", message: "Dữ liệu ghép thiết bị không hợp lệ.", details: parsed.error.flatten() });
    const input = parsed.data;
    const assetCode = input.assetCode.toUpperCase();
    const assetResponse = await fetch(`${HQ_CONSOLE_API_URL}/api/v1/internal/hardware-assets/${encodeURIComponent(assetCode)}`, { headers: { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY! } });
    if (!assetResponse.ok) return res.status(assetResponse.status === 404 ? 409 : 502).json({ error_code: "ASSET_NOT_VALID", message: `Không xác thực được ${assetCode} tại HQ: ${await readError(assetResponse)}` });
    const asset = (await assetResponse.json()) as { property_id: string | null; asset_type: string };
    if (asset.property_id !== input.propertyId) return res.status(409).json({ error_code: "ASSET_PROPERTY_MISMATCH", message: "asset_code thuộc cơ sở khác hoặc chưa được gán cơ sở trên HQ." });
    if (!["POWER_SWITCH", "IOT_CONTROLLER", "OTHER"].includes(asset.asset_type)) return res.status(409).json({ error_code: "ASSET_TYPE_MISMATCH", message: `Tài sản HQ loại ${asset.asset_type} không thể ghép làm thiết bị điều khiển điện.` });

    let deviceResponse = await iotFetch(`/api/v1/devices/by-asset-code/${encodeURIComponent(assetCode)}`);
    if (deviceResponse.status === 404) {
      deviceResponse = await iotFetch("/api/v1/devices", { method: "POST", body: JSON.stringify({ id: input.pmsDeviceId, tenantId: input.tenantId, propertyId: input.propertyId, roomId: input.roomId, deviceType: input.iotDeviceType, name: input.name, assetCode }) });
    }
    if (!deviceResponse.ok) return res.status(502).json({ error_code: "IOT_BINDING_FAILED", message: `IoT không ghép được thiết bị: ${await readError(deviceResponse)}` });
    const device = (await deviceResponse.json()) as { id: string; tenant_id: string; property_id: string; asset_code: string | null };
    if (device.tenant_id !== input.tenantId || device.property_id !== input.propertyId || device.asset_code !== assetCode) return res.status(409).json({ error_code: "IOT_DEVICE_MISMATCH", message: "Thiết bị IoT cùng asset_code không thuộc đúng cơ sở/tenant." });
    res.json({ device });
  })
);

internalRouter.post(
  "/device-events",
  requireInternalServiceKey,
  asyncHandler(async (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ error_code: "VALIDATION_ERROR", message: "Dữ liệu lệnh không hợp lệ.", details: parsed.error.flatten() });
    const input = parsed.data;
    const deviceResponse = await iotFetch(`/api/v1/devices/by-asset-code/${encodeURIComponent(input.assetCode.toUpperCase())}`);
    if (!deviceResponse.ok) return res.status(409).json({ error_code: "IOT_DEVICE_NOT_FOUND", message: "Không tìm thấy thiết bị IoT đã ghép theo asset_code." });
    const device = (await deviceResponse.json()) as { id: string; tenant_id: string; property_id: string };
    if (device.id !== input.iotDeviceId || device.tenant_id !== input.tenantId || device.property_id !== input.propertyId) return res.status(409).json({ error_code: "IOT_DEVICE_MISMATCH", message: "Thiết bị IoT không khớp liên kết PMS/HQ." });
    const commandResponse = await iotFetch(`/api/v1/devices/${encodeURIComponent(device.id)}/commands`, { method: "POST", body: JSON.stringify({ tenantId: input.tenantId, commandType: input.action, payload: { ...input.payload, eventId: input.eventId, pmsDeviceId: input.pmsDeviceId, roomId: input.roomId, bookingId: input.bookingId }, idempotencyKey: input.eventId }) });
    if (!commandResponse.ok) return res.status(502).json({ error_code: "IOT_COMMAND_FAILED", message: `IoT không nhận lệnh: ${await readError(commandResponse)}` });
    const result = (await commandResponse.json()) as { command: unknown };
    res.status(202).json({ device, command: result.command });
  })
);

internalRouter.get(
  "/device-commands/:deviceId/:commandId",
  requireInternalServiceKey,
  asyncHandler(async (req, res) => {
    const response = await iotFetch(`/api/v1/devices/${encodeURIComponent(req.params.deviceId)}/commands/${encodeURIComponent(req.params.commandId)}`);
    if (!response.ok) return res.status(response.status === 404 ? 404 : 502).json({ error_code: "IOT_COMMAND_LOOKUP_FAILED", message: await readError(response) });
    res.json(await response.json());
  })
);
