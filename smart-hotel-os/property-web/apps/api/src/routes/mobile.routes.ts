import { Router } from "express";
import type { Request } from "express";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, signAccessToken } from "../middleware/auth";
import { propertiesRepo } from "../repositories/properties.repo";
import { dashboardRepo } from "../repositories/dashboard.repo";
import { roomsRepo } from "../repositories/rooms.repo";
import { devicesRepo } from "../repositories/devices.repo";
import { maintenanceRepo } from "../repositories/maintenance.repo";
import type { PropertyUserRole } from "../types/domain";
import { Errors } from "../utils/errors";
import { mobileConnectionsRepo } from "../repositories/mobileConnections.repo";
import { isRequestIpAllowed } from "../middleware/ipAllowlist";

// API hợp đồng cho Android/iOS. Các app mobile không đọc DB trực tiếp và không
// cần biết cấu trúc bảng; chúng gọi bootstrap/overview/work-queue rồi dùng các
// endpoint nghiệp vụ hiện có với cùng access token.
export const mobileRouter = Router();

const pairingRequestSchema = z.object({
  username: z.string().trim().min(1).max(320),
  platform: z.enum(["ANDROID", "IOS"]),
  deviceId: z.string().trim().min(8).max(255),
  deviceName: z.string().trim().min(1).max(255),
  appVersion: z.string().trim().max(40).optional(),
});
const pairingCredentialSchema = z.object({
  pairingId: z.string().trim().min(1).max(120),
  pairingSecret: z.string().trim().min(32).max(255),
});
const secretHash = (secret: string) => createHash("sha256").update(secret).digest("hex");
function secretMatches(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(secretHash(secret));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Người dùng chỉ nhập username. Thiết bị vẫn phải được HQ duyệt bằng mã 6 số;
// không bao giờ coi username là bằng chứng xác thực.
mobileRouter.post("/pairing/request", asyncHandler(async (req, res) => {
  const parsed = pairingRequestSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const user = await mobileConnectionsRepo.findUser(parsed.data.username);
  if (!user || user.status !== "ACTIVE") throw Errors.notFound("tài khoản đang hoạt động");
  if (!(await isRequestIpAllowed(req, user.property_id))) throw Errors.forbidden();
  const pairingSecret = randomBytes(32).toString("base64url");
  const pairingCode = randomInt(100000, 1000000).toString();
  const connection = await mobileConnectionsRepo.request({
    userId: user.id, propertyId: user.property_id, tenantId: user.tenant_id, username: user.username,
    platform: parsed.data.platform, deviceId: parsed.data.deviceId, deviceName: parsed.data.deviceName,
    appVersion: parsed.data.appVersion, pairingCode, requestSecretHash: secretHash(pairingSecret),
  });
  res.status(202).json({
    pairing_id: connection.id, pairing_secret: pairingSecret, pairing_code: pairingCode,
    status: connection.status, username: user.username, property_name: user.property_name,
    message: "Yêu cầu đã gửi tới HQ. Đối chiếu mã ghép nối trước khi duyệt.",
  });
}));

async function pairingSession(input: z.infer<typeof pairingCredentialSchema>) {
  const connection = await mobileConnectionsRepo.findById(input.pairingId);
  if (!connection || !secretMatches(input.pairingSecret, connection.request_secret_hash)) throw Errors.unauthorized();
  if (connection.status !== "APPROVED" || connection.user_status !== "ACTIVE") {
    return { status: connection.status, pairing_code: connection.pairing_code, message: connection.approval_note };
  }
  const token = signAccessToken({
    id: connection.user_id, email: "mobile-session", role: connection.role as PropertyUserRole,
    propertyId: connection.property_id, tenantId: connection.tenant_id, mobileConnectionId: connection.id,
  });
  await mobileConnectionsRepo.touch(connection.id);
  return {
    status: connection.status, access_token: token, refresh_token: input.pairingSecret,
    user: { id: connection.user_id, username: connection.username, full_name: connection.full_name,
      role: connection.role, property_id: connection.property_id, tenant_id: connection.tenant_id },
  };
}

mobileRouter.post("/pairing/status", asyncHandler(async (req, res) => {
  const parsed = pairingCredentialSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  res.json(await pairingSession(parsed.data));
}));

mobileRouter.post("/pairing/refresh", asyncHandler(async (req, res) => {
  const parsed = pairingCredentialSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const session = await pairingSession(parsed.data);
  if (session.status !== "APPROVED") throw Errors.unauthorized();
  res.json(session);
}));

mobileRouter.use(requireAuth);

const roleCapabilities: Record<PropertyUserRole, string[]> = {
  OWNER: ["overview", "properties", "rooms", "bookings", "devices", "maintenance", "finance", "users"],
  MANAGER: ["overview", "properties", "rooms", "bookings", "devices", "maintenance", "finance"],
  RECEPTIONIST: ["overview", "rooms", "bookings", "maintenance"],
  HOUSEKEEPING: ["overview", "rooms", "maintenance", "housekeeping"],
  TECHNICIAN: ["overview", "rooms", "devices", "maintenance", "device-setup"],
};

async function resolveProperty(req: Request): Promise<{ id: string; tenantId: string }> {
  const requested = typeof req.query.propertyId === "string" ? req.query.propertyId : req.user!.propertyId;
  const canSwitch = req.user!.role === "OWNER" || req.user!.role === "MANAGER";
  if (!canSwitch && requested !== req.user!.propertyId) throw Errors.forbidden();
  const property = await propertiesRepo.findByIdForTenant(requested, req.user!.tenantId);
  if (!property) throw Errors.notFound("cơ sở");
  return { id: property.id, tenantId: property.tenant_id };
}

mobileRouter.get("/bootstrap", asyncHandler(async (req, res) => {
  const current = await resolveProperty(req);
  const properties = req.user!.role === "OWNER" || req.user!.role === "MANAGER"
    ? await propertiesRepo.listByTenant(req.user!.tenantId)
    : await propertiesRepo.findByIdForTenant(req.user!.propertyId, req.user!.tenantId).then((item) => item ? [item] : []);
  const summary = await dashboardRepo.summary(current.id);
  const visibleSummary = roleCapabilities[req.user!.role].includes("finance")
    ? summary
    : { ...summary, financial_daily: [] };
  res.json({
    api_version: "mobile-v1",
    user: req.user,
    current_property_id: current.id,
    properties,
    capabilities: roleCapabilities[req.user!.role],
    summary: visibleSummary,
  });
}));

mobileRouter.get("/overview", asyncHandler(async (req, res) => {
  const current = await resolveProperty(req);
  const [summary, rooms, devices, maintenance] = await Promise.all([
    dashboardRepo.summary(current.id),
    roomsRepo.list(current.id),
    devicesRepo.list(current.id),
    maintenanceRepo.list(current.id),
  ]);
  const roomCounts = rooms.reduce<Record<string, number>>((result, room) => { result[room.status] = (result[room.status] ?? 0) + 1; return result; }, {});
  const deviceCounts = devices.reduce<Record<string, number>>((result, device) => { result[device.status] = (result[device.status] ?? 0) + 1; return result; }, {});
  const visibleSummary = roleCapabilities[req.user!.role].includes("finance")
    ? summary
    : { ...summary, financial_daily: [] };
  res.json({ property_id: current.id, summary: visibleSummary, counts: { rooms: roomCounts, devices: deviceCounts, open_maintenance: maintenance.filter((item) => item.status === "OPEN" || item.status === "IN_PROGRESS").length }, updated_at: new Date().toISOString() });
}));

mobileRouter.get("/work-queue", asyncHandler(async (req, res) => {
  const current = await resolveProperty(req);
  const [rooms, devices, maintenance] = await Promise.all([roomsRepo.list(current.id), devicesRepo.list(current.id), maintenanceRepo.list(current.id)]);
  const role = req.user!.role;
  res.json({
    property_id: current.id,
    role,
    housekeeping: role === "HOUSEKEEPING" || role === "OWNER" || role === "MANAGER" ? rooms.filter((room) => room.status === "DIRTY") : [],
    device_alerts: role === "TECHNICIAN" || role === "OWNER" || role === "MANAGER" ? devices.filter((device) => device.status !== "ONLINE") : [],
    maintenance: role === "TECHNICIAN" || role === "HOUSEKEEPING" || role === "OWNER" || role === "MANAGER" ? maintenance.filter((item) => ["OPEN", "IN_PROGRESS"].includes(item.status)) : [],
  });
}));
