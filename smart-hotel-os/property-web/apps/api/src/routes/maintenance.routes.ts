import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { maintenanceRepo } from "../repositories/maintenance.repo";

export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth);

const createSchema = z.object({
  roomId: z.string().min(1),
  bookingId: z.string().optional().nullable(),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(2_000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  partnerName: z.string().trim().max(255).optional().nullable(),
  partnerPhone: z.string().trim().max(100).optional().nullable(),
  guestVisible: z.boolean().default(true),
  markRoomMaintenance: z.boolean().default(false),
});
const statusSchema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });

maintenanceRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const roomId = typeof req.query.roomId === "string" ? req.query.roomId : undefined;
    const items = await maintenanceRepo.list(req.user!.propertyId, roomId);
    res.json({ items, total: items.length });
  })
);

maintenanceRouter.post(
  "/",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const request = await maintenanceRepo.create(req.user!.propertyId, req.user!.tenantId, req.user!.id, parsed.data);
    await writeAuditLog({ req, action: "CREATE_MAINTENANCE_REQUEST", entityType: "maintenance_request", entityId: request.id, afterData: request });
    res.status(201).json(request);
  })
);

maintenanceRouter.patch(
  "/:id/status",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const request = await maintenanceRepo.updateStatus(req.user!.propertyId, req.params.id, parsed.data.status);
    if (!request) throw Errors.notFound("phiếu bảo trì");
    await writeAuditLog({ req, action: "UPDATE_MAINTENANCE_REQUEST", entityType: "maintenance_request", entityId: request.id, afterData: { status: request.status } });
    res.json(request);
  })
);
