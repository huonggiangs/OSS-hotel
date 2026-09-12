import { Router } from "express";
import type { Request } from "express";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, signAccessToken } from "../middleware/auth";
import { propertiesRepo } from "../repositories/properties.repo";
import { dashboardRepo } from "../repositories/dashboard.repo";
import { roomsRepo } from "../repositories/rooms.repo";
import { devicesRepo } from "../repositories/devices.repo";
import { maintenanceRepo } from "../repositories/maintenance.repo";
import type { PropertyUserRole } from "../types/domain";
import { ApiError, Errors } from "../utils/errors";
import { mobileConnectionsRepo } from "../repositories/mobileConnections.repo";
import { isRequestIpAllowed, requestIp } from "../middleware/ipAllowlist";
import { assertLoginAllowed, recordLoginAttempt } from "../lib/loginProtection";

// API hợp đồng cho Android/iOS. Các app mobile không đọc DB trực tiếp và không
// cần biết cấu trúc bảng; chúng gọi bootstrap/overview/work-queue rồi dùng các
// endpoint nghiệp vụ hiện có với cùng access token.
export const mobileRouter = Router();

// Endpoint không chứa dữ liệu tenant, chỉ dùng để app xác minh đúng dịch vụ
// trước khi gửi thông tin đăng nhập tới endpoint vừa tự phát hiện.
mobileRouter.get("/discovery", (_req, res) => {
  res.json({ service: "ANIO_PMS", api_version: 1, transports: ["HTTPS", "LAN_DISCOVERY"], server_time: new Date().toISOString() });
});

const deviceLoginSchema = z.object({
  propertyCode: z.string().trim().regex(/^\d{6}$/, "Mã cơ sở phải gồm đúng 6 chữ số."),
  username: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(128),
  platform: z.enum(["ANDROID", "IOS"]),
  deviceId: z.string().trim().min(8).max(255),
  deviceName: z.string().trim().min(1).max(255),
  appVersion: z.string().trim().max(40).optional(),
  isEmulator: z.boolean().default(false),
});
const deviceCredentialSchema = z.object({
  connectionId: z.string().trim().min(1).max(120),
  deviceSecret: z.string().trim().min(32).max(255),
});
const secretHash = (secret: string) => createHash("sha256").update(secret).digest("hex");
function secretMatches(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(secretHash(secret));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Không còn bước HQ duyệt. Lần đầu phải xác thực mã cơ sở + username + mật
// khẩu; sau đó app dùng secret riêng của thiết bị để tự đăng nhập. Android/iOS
// không được truy cập MAC thật nên deviceId là định danh ổn định trong vùng bảo
// mật của hệ điều hành, không giả danh là địa chỉ MAC.
mobileRouter.post("/device-login", asyncHandler(async (req, res) => {
  const parsed = deviceLoginSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const input = parsed.data;
  const ip = requestIp(req) || "unknown";
  const obviousEmulator = /emulator|sdk[_ -]?gphone|generic|goldfish|ranchu|genymotion|bluestacks/i.test(input.deviceName);
  if (input.isEmulator || obviousEmulator) {
    throw new ApiError(403, "EMULATOR_BLOCKED", "Thiết bị giả lập không được phép đăng nhập ứng dụng vận hành.");
  }
  await assertLoginAllowed({ propertyCode: input.propertyCode, identifier: input.username, ip });
  const user = await mobileConnectionsRepo.findUserForLogin(input.propertyCode, input.username);
  const passwordOk = user?.status === "ACTIVE" && await bcrypt.compare(input.password, user.password_hash);
  if (!user || !passwordOk) {
    await recordLoginAttempt({ propertyCode: input.propertyCode, identifier: input.username, ip,
      clientType: input.platform, deviceId: input.deviceId, succeeded: false });
    throw Errors.invalidCredentials();
  }
  if (!(await isRequestIpAllowed(req, user.property_id))) throw Errors.forbidden();
  await recordLoginAttempt({ propertyCode: input.propertyCode, identifier: input.username, ip,
    clientType: input.platform, deviceId: input.deviceId, succeeded: true });
  const deviceSecret = randomBytes(32).toString("base64url");
  const connection = await mobileConnectionsRepo.authorize({
    userId: user.id, propertyId: user.property_id, tenantId: user.tenant_id, username: user.username,
    platform: input.platform, deviceId: input.deviceId, deviceName: input.deviceName,
    appVersion: input.appVersion, pairingCode: randomInt(100000, 1000000).toString(),
    requestSecretHash: secretHash(deviceSecret), isEmulator: false,
    attestationProvider: "CLIENT_HEURISTIC", attestationVerdict: "BASIC_CHECK_PASSED",
  });
  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role as PropertyUserRole,
    propertyId: user.property_id, tenantId: user.tenant_id, mobileConnectionId: connection.id });
  res.json({
    connection_id: connection.id, device_secret: deviceSecret, access_token: accessToken,
    status: connection.status, property_name: user.property_name,
    user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name,
      role: user.role, property_id: user.property_id, tenant_id: user.tenant_id, property_code: input.propertyCode },
  });
}));

async function deviceSession(input: z.infer<typeof deviceCredentialSchema>) {
  const connection = await mobileConnectionsRepo.findById(input.connectionId);
  if (!connection || !secretMatches(input.deviceSecret, connection.request_secret_hash)) throw Errors.unauthorized();
  if (connection.status !== "APPROVED" || connection.user_status !== "ACTIVE") throw Errors.unauthorized();
  const token = signAccessToken({
    id: connection.user_id, email: "mobile-session", role: connection.role as PropertyUserRole,
    propertyId: connection.property_id, tenantId: connection.tenant_id, mobileConnectionId: connection.id,
  });
  await mobileConnectionsRepo.touch(connection.id);
  return {
    status: connection.status, access_token: token,
    user: { id: connection.user_id, username: connection.username, full_name: connection.full_name,
      role: connection.role, property_id: connection.property_id, tenant_id: connection.tenant_id },
  };
}

mobileRouter.post("/device-refresh", asyncHandler(async (req, res) => {
  const parsed = deviceCredentialSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  res.json(await deviceSession(parsed.data));
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
