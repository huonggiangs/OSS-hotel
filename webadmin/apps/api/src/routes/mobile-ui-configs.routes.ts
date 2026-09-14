import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { mobileUiConfigsRepo, type MobileUiConfigStatus } from "../repositories/mobileUiConfigs.repo";

export const mobileUiConfigsRouter = Router();
mobileUiConfigsRouter.use(requireAuth);

const appKey = z.enum(["OWNER_MOBILE", "HOUSEKEEPING_MOBILE"]);
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Màu cần ở dạng #RRGGBB.");
const configSchema = z.object({
  schemaVersion: z.literal(1),
  branding: z.object({ appName: z.string().trim().min(2).max(60), primaryColor: color, canvasColor: color }),
  dashboard: z.object({
    showSearch: z.boolean(),
    defaultFinancialDays: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(90)]),
    kpis: z.array(z.enum(["occupancy", "revenue", "occupied", "tasks"])).min(1).max(4),
    quickActions: z.array(z.enum(["checkin", "booking", "rooms", "maintenance"])).min(1).max(4),
  }),
  navigation: z.array(z.object({ key: z.enum(["DASHBOARD", "ROOMS", "BOOKINGS", "ALERTS", "ACCOUNT"]), label: z.string().trim().min(1).max(24) })).length(5),
}).superRefine((config, context) => {
  const keys = config.navigation.map((item) => item.key);
  if (new Set(keys).size !== 5) context.addIssue({ code: z.ZodIssueCode.custom, path: ["navigation"], message: "Mỗi mục điều hướng chỉ được xuất hiện một lần." });
});

const writeSchema = z.object({ appKey, name: z.string().trim().min(3).max(120), config: configSchema });
const statusSchema = z.enum(["DRAFT", "READY_FOR_RELEASE", "ARCHIVED"]);

mobileUiConfigsRouter.get("/", asyncHandler(async (req, res) => {
  const parsed = appKey.optional().safeParse(req.query.appKey);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const items = await mobileUiConfigsRepo.list(parsed.data);
  res.json({ items, total: items.length });
}));

mobileUiConfigsRouter.get("/:id", asyncHandler(async (req, res) => {
  const item = await mobileUiConfigsRepo.findById(req.params.id);
  if (!item) throw Errors.notFound("cấu hình giao diện");
  res.json(item);
}));

mobileUiConfigsRouter.get("/:id/export", asyncHandler(async (req, res) => {
  const item = await mobileUiConfigsRepo.findById(req.params.id);
  if (!item) throw Errors.notFound("cấu hình giao diện");
  res.json({ appKey: item.app_key, configurationId: item.id, name: item.name, config: item.config });
}));

mobileUiConfigsRouter.post("/", requireRole("RELEASE_MANAGER", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const parsed = writeSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const item = await mobileUiConfigsRepo.create({ ...parsed.data, actorId: req.user!.id });
  await writeAuditLog({ req, action: "CREATE_MOBILE_UI_CONFIG", entityType: "mobile_ui_configuration", entityId: item.id, afterData: item });
  res.status(201).json(item);
}));

mobileUiConfigsRouter.patch("/:id", requireRole("RELEASE_MANAGER", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const existing = await mobileUiConfigsRepo.findById(req.params.id);
  if (!existing) throw Errors.notFound("cấu hình giao diện");
  if (existing.status === "RELEASED") throw Errors.conflict("Cấu hình đã gắn với bản phát hành; hãy tạo bản nháp mới để chỉnh sửa.");
  const parsed = z.object({ name: z.string().trim().min(3).max(120).optional(), config: configSchema.optional(), status: statusSchema.optional() }).safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const item = await mobileUiConfigsRepo.update(existing.id, { ...parsed.data, actorId: req.user!.id });
  await writeAuditLog({ req, action: "UPDATE_MOBILE_UI_CONFIG", entityType: "mobile_ui_configuration", entityId: existing.id, beforeData: existing, afterData: item });
  res.json(item);
}));

mobileUiConfigsRouter.post("/:id/duplicate", requireRole("RELEASE_MANAGER", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const source = await mobileUiConfigsRepo.findById(req.params.id);
  if (!source) throw Errors.notFound("cấu hình giao diện");
  const item = await mobileUiConfigsRepo.create({ appKey: source.app_key, name: `${source.name} — bản nháp`, config: source.config, actorId: req.user!.id });
  await writeAuditLog({ req, action: "DUPLICATE_MOBILE_UI_CONFIG", entityType: "mobile_ui_configuration", entityId: item.id, afterData: item });
  res.status(201).json(item);
}));
