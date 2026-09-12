import { Router } from "express";
import type { Request } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { propertiesRepo } from "../repositories/properties.repo";
import { dashboardRepo } from "../repositories/dashboard.repo";
import { roomsRepo } from "../repositories/rooms.repo";
import { devicesRepo } from "../repositories/devices.repo";
import { maintenanceRepo } from "../repositories/maintenance.repo";
import type { PropertyUserRole } from "../types/domain";
import { Errors } from "../utils/errors";

// API hợp đồng cho Android/iOS. Các app mobile không đọc DB trực tiếp và không
// cần biết cấu trúc bảng; chúng gọi bootstrap/overview/work-queue rồi dùng các
// endpoint nghiệp vụ hiện có với cùng access token.
export const mobileRouter = Router();
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
  res.json({
    api_version: "mobile-v1",
    user: req.user,
    current_property_id: current.id,
    properties,
    capabilities: roleCapabilities[req.user!.role],
    summary,
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
  res.json({ property_id: current.id, summary, counts: { rooms: roomCounts, devices: deviceCounts, open_maintenance: maintenance.filter((item) => item.status === "OPEN" || item.status === "IN_PROGRESS").length }, updated_at: new Date().toISOString() });
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
