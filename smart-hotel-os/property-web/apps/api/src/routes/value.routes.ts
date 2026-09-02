import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { pool } from "../lib/db";
import { valueRepo } from "../repositories/value.repo";

export const valueRouter = Router();
valueRouter.use(requireAuth);

const dateString = z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "Ngày/giờ không hợp lệ.");
const energySchema = z.object({
  roomId: z.string().min(1).optional().nullable(),
  deviceId: z.string().min(1).optional().nullable(),
  assetCode: z.string().trim().max(120).optional().nullable(),
  measuredAt: dateString,
  kwh: z.coerce.number().min(0).max(1_000_000),
  costVnd: z.coerce.number().min(0).max(10_000_000_000).optional(),
  source: z.enum(["MANUAL", "IOT", "IMPORT"]).default("MANUAL"),
  idempotencyKey: z.string().trim().min(3).max(180),
  note: z.string().trim().max(500).optional().nullable(),
});
const valueEventSchema = z.object({
  eventType: z.enum(["ENERGY_SAVED", "LABOR_SAVED", "LOSS_PREVENTED", "ADDITIONAL_REVENUE"]),
  amountVnd: z.coerce.number().min(0).max(100_000_000_000),
  sourceType: z.string().trim().min(2).max(80),
  sourceId: z.string().trim().max(180).optional().nullable(),
  occurredAt: dateString.optional(),
  idempotencyKey: z.string().trim().min(3).max(180),
  note: z.string().trim().max(500).optional().nullable(),
});
const alertSchema = z.object({
  alertType: z.string().trim().min(2).max(80),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  title: z.string().trim().min(3).max(180),
  message: z.string().trim().min(3).max(2_000),
  sourceType: z.string().trim().min(2).max(80),
  sourceId: z.string().trim().max(180).optional().nullable(),
  assetCode: z.string().trim().max(120).optional().nullable(),
  dueAt: dateString.optional().nullable(),
  idempotencyKey: z.string().trim().max(180).optional().nullable(),
});
const alertStatusSchema = z.object({ status: z.enum(["ACKNOWLEDGED", "RESOLVED", "DISMISSED"]) });

valueRouter.get("/dashboard", asyncHandler(async (req, res) => {
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  res.json(await valueRepo.dashboard(req.user!.propertyId, from, to));
}));

valueRouter.get("/energy-readings", asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const { rows } = await pool.query(
    `SELECT er.*, r.number AS room_number, d.name AS device_name
     FROM energy_readings er
     LEFT JOIN rooms r ON r.id = er.room_id
     LEFT JOIN devices d ON d.id = er.device_id
     WHERE er.property_id = $1 ORDER BY er.measured_at DESC LIMIT $2`,
    [req.user!.propertyId, limit]
  );
  res.json({ items: rows });
}));

valueRouter.post("/energy-readings", requireRole("OWNER", "MANAGER", "RECEPTIONIST"), asyncHandler(async (req, res) => {
  const parsed = energySchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  if (parsed.data.roomId) {
    const room = await pool.query(`SELECT id FROM rooms WHERE property_id = $1 AND id = $2`, [req.user!.propertyId, parsed.data.roomId]);
    if (!room.rows[0]) throw Errors.notFound("phòng");
  }
  const reading = await valueRepo.createEnergyReading({ propertyId: req.user!.propertyId, tenantId: req.user!.tenantId, ...parsed.data });
  await writeAuditLog({ req, action: "CREATE_ENERGY_READING", entityType: "energy_reading", entityId: reading.id, afterData: reading });
  res.status(201).json(reading);
}));

valueRouter.post("/events", requireRole("OWNER", "MANAGER"), asyncHandler(async (req, res) => {
  const parsed = valueEventSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const event = await valueRepo.createValueEvent({ propertyId: req.user!.propertyId, tenantId: req.user!.tenantId, createdBy: req.user!.id, ...parsed.data });
  await writeAuditLog({ req, action: "CREATE_VALUE_EVENT", entityType: "value_ledger", entityId: event.id, afterData: event });
  res.status(201).json(event);
}));

valueRouter.get("/alerts", asyncHandler(async (req, res) => {
  const status = typeof req.query.status === "string" && ["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"].includes(req.query.status)
    ? req.query.status as "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED" : undefined;
  const items = await valueRepo.listAlerts(req.user!.propertyId, status);
  res.json({ items, total: items.length });
}));

valueRouter.post("/alerts", requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"), asyncHandler(async (req, res) => {
  const parsed = alertSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const alert = await valueRepo.createAlert({ propertyId: req.user!.propertyId, tenantId: req.user!.tenantId, ...parsed.data });
  await writeAuditLog({ req, action: "CREATE_OPERATIONAL_ALERT", entityType: "operational_alert", entityId: alert.id, afterData: alert });
  res.status(201).json(alert);
}));

valueRouter.patch("/alerts/:id", requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"), asyncHandler(async (req, res) => {
  const parsed = alertStatusSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const alert = await valueRepo.updateAlert(req.user!.propertyId, req.params.id, parsed.data.status);
  if (!alert) throw Errors.notFound("cảnh báo");
  await writeAuditLog({ req, action: "UPDATE_OPERATIONAL_ALERT", entityType: "operational_alert", entityId: alert.id, afterData: { status: alert.status } });
  res.json(alert);
}));
