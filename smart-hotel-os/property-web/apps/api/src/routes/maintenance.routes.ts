import express, { Router } from "express";
import { mkdirSync, unlinkSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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
  issues: z.array(z.object({
    category: z.string().trim().min(2).max(100),
    description: z.string().trim().min(3).max(2_000),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  })).min(1).max(20),
});
const statusSchema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });
const MAX_MEDIA_BYTES = 40 * 1024 * 1024;
const MEDIA_DIR = path.resolve(process.env.MAINTENANCE_UPLOAD_DIR ?? path.join(process.cwd(), "uploads", "maintenance"));
const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"]);

function safeOriginalName(value: string | undefined) {
  let decoded = value ?? "tep-dinh-kem";
  try { decoded = decodeURIComponent(decoded); } catch { /* giữ nguyên header lỗi mã hoá */ }
  const base = path.basename(decoded).replace(/[^\p{L}\p{N}._ -]/gu, "_");
  return base.slice(0, 180) || "tep-dinh-kem";
}

function extensionFor(mime: string, original: string) {
  const fromName = path.extname(original).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  return ({ "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" } as Record<string, string>)[mime] ?? "";
}

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
    const firstIssue = parsed.data.issues[0];
    const request = await maintenanceRepo.create(req.user!.propertyId, req.user!.tenantId, req.user!.id, {
      ...parsed.data,
      category: firstIssue.category,
      description: firstIssue.description,
    });
    await writeAuditLog({ req, action: "CREATE_MAINTENANCE_REQUEST", entityType: "maintenance_request", entityId: request.id, afterData: request });
    res.status(201).json(request);
  })
);

// File được ghi vào named volume ngoài source code/container layer, còn DB chỉ
// lưu metadata + khoá ngẫu nhiên. Không public static file: mọi lần xem/tải đều
// qua JWT và kiểm tra property_id.
maintenanceRouter.post(
  "/:id/issues/:issueId/media",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  express.raw({ type: () => true, limit: MAX_MEDIA_BYTES }),
  asyncHandler(async (req, res) => {
    const mime = req.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!ALLOWED_MEDIA.has(mime)) throw Errors.validation({ media: "Chỉ nhận JPG, PNG, WebP, MP4, WebM hoặc MOV." });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw Errors.validation({ media: "Tệp đính kèm trống." });
    const originalName = safeOriginalName(req.get("x-file-name"));
    const mediaKey = `${req.params.issueId}/${randomUUID()}${extensionFor(mime, originalName)}`;
    const absolute = path.join(MEDIA_DIR, mediaKey);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, req.body, { flag: "wx" });
    try {
      const media = await maintenanceRepo.addMedia(req.user!.propertyId, req.params.id, req.params.issueId, {
        media_key: mediaKey, original_name: originalName, mime_type: mime, byte_size: req.body.length,
      });
      await writeAuditLog({ req, action: "ADD_MAINTENANCE_MEDIA", entityType: "maintenance_media", entityId: media.id, afterData: { issue_id: req.params.issueId, mime_type: mime, byte_size: media.byte_size } });
      res.status(201).json(media);
    } catch (error) {
      if (existsSync(absolute)) unlinkSync(absolute);
      throw error;
    }
  })
);

maintenanceRouter.get(
  "/media/:mediaId",
  asyncHandler(async (req, res) => {
    const media = await maintenanceRepo.findMedia(req.user!.propertyId, req.params.mediaId);
    if (!media) throw Errors.notFound("tệp đính kèm bảo trì");
    const absolute = path.join(MEDIA_DIR, media.media_key);
    if (!existsSync(absolute)) throw Errors.notFound("tệp đính kèm bảo trì");
    res.type(media.mime_type);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(media.original_name)}`);
    res.sendFile(absolute);
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
