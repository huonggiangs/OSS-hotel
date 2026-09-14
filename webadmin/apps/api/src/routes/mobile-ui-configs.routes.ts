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

const appKey = z.enum(["OWNER_MOBILE", "HOUSEKEEPING_MOBILE", "TECHNICIAN_MOBILE"]);
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Màu cần ở dạng #RRGGBB.");
const iconId = z.enum([
  "home", "home-filled", "bed", "bed-filled", "calendar", "calendar-filled",
  "bell", "bell-filled", "user", "user-filled", "clipboard", "clipboard-filled",
  "wrench", "wrench-filled", "wallet", "wallet-filled", "search", "search-filled",
]);
const navigationSchema = z.object({
  key: z.enum(["DASHBOARD", "ROOMS", "BOOKINGS", "ALERTS", "ACCOUNT"]),
  label: z.string().trim().min(1).max(24),
  description: z.string().trim().min(3).max(120),
  iconId,
  activeIconId: iconId,
}).strict();
const configSchema = z.object({
  schemaVersion: z.literal(2),
  branding: z.object({ appName: z.string().trim().min(2).max(60), primaryColor: color, canvasColor: color }).strict(),
  dashboard: z.object({
    showSearch: z.boolean(),
    defaultFinancialDays: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(90)]),
    kpis: z.array(z.enum(["occupancy", "revenue", "occupied", "tasks", "dirty", "clean", "broken"])).min(1).max(7),
    quickActions: z.array(z.enum(["checkin", "booking", "rooms", "maintenance"])).min(1).max(4),
    quickActionLayout: z.enum(["GRID_4", "GRID_2X2", "LIST"]),
  }).strict(),
  navigation: z.array(navigationSchema).length(5),
}).strict().superRefine((config, context) => {
  const keys = config.navigation.map((item) => item.key);
  if (new Set(keys).size !== 5) context.addIssue({ code: z.ZodIssueCode.custom, path: ["navigation"], message: "Mỗi mục điều hướng chỉ được xuất hiện một lần." });
});
type UiConfigInput = z.infer<typeof configSchema>;

function normalizeConfig(input: unknown): UiConfigInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Errors.validation({ config: "JSON giao diện phải là một đối tượng." });
  const source = structuredClone(input) as Record<string, unknown>;
  const dashboard = source.dashboard && typeof source.dashboard === "object" && !Array.isArray(source.dashboard)
    ? { ...(source.dashboard as Record<string, unknown>) } : source.dashboard;
  if (dashboard && typeof dashboard === "object") {
    const value = dashboard as Record<string, unknown>;
    if (value.layout_id !== undefined) { value.quickActionLayout ??= value.layout_id; delete value.layout_id; }
  }
  const navigation = Array.isArray(source.navigation) ? source.navigation.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const nav = { ...(item as Record<string, unknown>) };
    if (nav.icon_id !== undefined) { nav.iconId ??= nav.icon_id; delete nav.icon_id; }
    if (nav.active_icon_id !== undefined) { nav.activeIconId ??= nav.active_icon_id; delete nav.active_icon_id; }
    return nav;
  }) : source.navigation;
  const parsed = configSchema.safeParse({ ...source, dashboard, navigation });
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  return parsed.data;
}

const writeSchema = z.object({ appKey, name: z.string().trim().min(3).max(120), config: z.unknown() });
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

// Accept only the published declarative schema. Aliases icon_id/layout_id are
// normalized here; HTML, scripts, remote URLs and arbitrary SVG are rejected
// because strict schemas do not contain fields for them.
mobileUiConfigsRouter.post("/validate", requireRole("RELEASE_MANAGER", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  res.json({ config: normalizeConfig(req.body?.config ?? req.body) });
}));

mobileUiConfigsRouter.post("/", requireRole("RELEASE_MANAGER", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const parsed = writeSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const item = await mobileUiConfigsRepo.create({ ...parsed.data, config: normalizeConfig(parsed.data.config), actorId: req.user!.id });
  await writeAuditLog({ req, action: "CREATE_MOBILE_UI_CONFIG", entityType: "mobile_ui_configuration", entityId: item.id, afterData: item });
  res.status(201).json(item);
}));

mobileUiConfigsRouter.patch("/:id", requireRole("RELEASE_MANAGER", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const existing = await mobileUiConfigsRepo.findById(req.params.id);
  if (!existing) throw Errors.notFound("cấu hình giao diện");
  if (existing.status === "RELEASED") throw Errors.conflict("Cấu hình đã gắn với bản phát hành; hãy tạo bản nháp mới để chỉnh sửa.");
  const parsed = z.object({ name: z.string().trim().min(3).max(120).optional(), config: z.unknown().optional(), status: statusSchema.optional() }).strict().safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const item = await mobileUiConfigsRepo.update(existing.id, { ...parsed.data, ...(parsed.data.config === undefined ? {} : { config: normalizeConfig(parsed.data.config) }), actorId: req.user!.id });
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
