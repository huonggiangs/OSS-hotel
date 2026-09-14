import express, { Router } from "express";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { repairWorkOrdersRepo } from "../repositories/repairWorkOrders.repo";

export const repairWorkOrdersRouter = Router();
repairWorkOrdersRouter.use(requireAuth);

const decisionSchema = z.object({ action: z.enum(["DISPATCH_TO_APP", "CONTACT_PARTNER", "REJECT"]), technicianId: z.string().optional(), partnerName: z.string().trim().min(2).max(255).optional(), partnerPhone: z.string().trim().max(100).optional(), note: z.string().trim().max(2000).optional() }).strict();
const technicianSchema = z.object({ action: z.enum(["ACCEPT", "DECLINE", "START", "QUOTE", "HANDOVER"]), reason: z.string().trim().max(2000).optional(), note: z.string().trim().max(4000).optional(), quoteAmount: z.number().min(0).max(999_999_999).optional() }).strict();
const MAX_EVIDENCE_BYTES = 40 * 1024 * 1024;
const EVIDENCE_DIR = path.resolve(process.env.REPAIR_EVIDENCE_UPLOAD_DIR ?? path.join(process.cwd(), "uploads", "repair-work-orders"));
const ALLOWED_EVIDENCE = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"]);

function safeName(value: string | undefined) { const raw = value ?? "bang-chung"; const name = path.basename(raw).replace(/[^\p{L}\p{N}._ -]/gu, "_"); return name.slice(0, 180) || "bang-chung"; }
function extension(mime: string) { return ({ "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" } as Record<string, string>)[mime] ?? ""; }

repairWorkOrdersRouter.get("/", asyncHandler(async (req, res) => {
  const items = await repairWorkOrdersRepo.list(req.user!.propertyId, { role: req.user!.role, userId: req.user!.id });
  res.json({ items, total: items.length });
}));

repairWorkOrdersRouter.post("/:id/owner-decision", requireRole("OWNER"), asyncHandler(async (req, res) => {
  const parsed = decisionSchema.safeParse(req.body); if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const item = await repairWorkOrdersRepo.ownerDecision({ propertyId: req.user!.propertyId, id: req.params.id, ownerId: req.user!.id, ...parsed.data });
  await writeAuditLog({ req, action: "OWNER_DECIDE_REPAIR_WORK_ORDER", entityType: "repair_work_order", entityId: item.id, afterData: { action: parsed.data.action, status: item.status, route: item.route } });
  res.json(item);
}));

repairWorkOrdersRouter.post("/:id/technician-update", requireRole("TECHNICIAN"), asyncHandler(async (req, res) => {
  const parsed = technicianSchema.safeParse(req.body); if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const item = await repairWorkOrdersRepo.technicianUpdate({ propertyId: req.user!.propertyId, id: req.params.id, technicianId: req.user!.id, ...parsed.data });
  await writeAuditLog({ req, action: "TECHNICIAN_UPDATE_REPAIR_WORK_ORDER", entityType: "repair_work_order", entityId: item.id, afterData: { action: parsed.data.action, status: item.status } });
  res.json(item);
}));

repairWorkOrdersRouter.post("/:id/approve-quote", requireRole("OWNER"), asyncHandler(async (req, res) => {
  const item = await repairWorkOrdersRepo.approveQuote({ propertyId: req.user!.propertyId, id: req.params.id, ownerId: req.user!.id });
  await writeAuditLog({ req, action: "OWNER_APPROVE_REPAIR_QUOTE", entityType: "repair_work_order", entityId: item.id, afterData: { status: item.status, quote_amount: item.quote_amount } });
  res.json(item);
}));

repairWorkOrdersRouter.post("/:id/accept-handover", requireRole("OWNER"), asyncHandler(async (req, res) => {
  const item = await repairWorkOrdersRepo.acceptHandover({ propertyId: req.user!.propertyId, tenantId: req.user!.tenantId, id: req.params.id, ownerId: req.user!.id });
  await writeAuditLog({ req, action: "OWNER_ACCEPT_REPAIR_HANDOVER", entityType: "repair_work_order", entityId: item.id, afterData: { status: item.status, room_status: "DIRTY" } });
  res.json(item);
}));

repairWorkOrdersRouter.post("/:id/evidence", requireRole("TECHNICIAN"), express.raw({ type: () => true, limit: MAX_EVIDENCE_BYTES }), asyncHandler(async (req, res) => {
  const mime = req.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_EVIDENCE.has(mime)) throw Errors.validation({ evidence: "Chỉ nhận JPG, PNG, WebP, MP4, WebM hoặc MOV." });
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw Errors.validation({ evidence: "Tệp bằng chứng trống." });
  const originalName = safeName(req.get("x-file-name")); const mediaKey = `${req.params.id}/${randomUUID()}${extension(mime)}`; const absolute = path.join(EVIDENCE_DIR, mediaKey);
  mkdirSync(path.dirname(absolute), { recursive: true }); writeFileSync(absolute, req.body, { flag: "wx" });
  try {
    const item = await repairWorkOrdersRepo.addEvidence({ propertyId: req.user!.propertyId, workOrderId: req.params.id, actorId: req.user!.id, mediaKey, originalName, mimeType: mime, byteSize: req.body.length });
    await writeAuditLog({ req, action: "UPLOAD_REPAIR_EVIDENCE", entityType: "repair_work_order_evidence", entityId: item.id, afterData: { work_order_id: req.params.id, mime_type: mime, byte_size: item.byte_size } });
    res.status(201).json(item);
  } catch (error) { if (existsSync(absolute)) unlinkSync(absolute); throw error; }
}));

repairWorkOrdersRouter.get("/evidence/:evidenceId", asyncHandler(async (req, res) => {
  const item = await repairWorkOrdersRepo.findEvidence(req.user!.propertyId, req.params.evidenceId); if (!item) throw Errors.notFound("bằng chứng sửa chữa");
  const absolute = path.join(EVIDENCE_DIR, item.media_key); if (!existsSync(absolute)) throw Errors.notFound("tệp bằng chứng sửa chữa");
  res.type(item.mime_type); res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(item.original_name)}`); res.sendFile(absolute);
}));
