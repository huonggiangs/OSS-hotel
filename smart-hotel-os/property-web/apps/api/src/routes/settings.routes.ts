import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { settingsRepo } from "../repositories/settings.repo";
import { redactEmailSettings, secureEmailSettings } from "../lib/settingsSecrets";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// Danh sách nhóm hợp lệ — chặn client ghi vào group_key tuỳ ý ngoài dự kiến.
// Khớp đúng 21 nhóm đã seed ở database/migrations/003_property_settings.sql.
const VALID_GROUPS = new Set([
  "basic",
  "amenities",
  "images",
  "email",
  "security",
  "currency",
  "tax",
  "time",
  "printer",
  "channel",
  "sync",
  "db",
  "social",
  "modules",
  "utilities",
  "assets",
  "services",
  "marketing",
  "daily_entries",
  "payment",
  "roles",
]);

const putSchema = z.object({ data: z.unknown() });

const basicSettingsSchema = z.object({
  floorInputs: z.array(z.string().trim().min(1).max(64)).max(200),
  info: z.object({
    intro: z.string().max(4000),
    logoDataUrl: z.string().max(1_100_000).refine((value) => value === "" || /^data:image\/(png|jpeg|webp);base64,/.test(value), "Logo không đúng định dạng ảnh hợp lệ."),
    logoFileName: z.string().max(255),
    website: z.string().max(500),
    ctvCode: z.string().max(100),
    accommodationType: z.string().max(100),
    location: z.object({
      address: z.string().max(500),
      latitude: z.number().min(-90).max(90).nullable(),
      longitude: z.number().min(-180).max(180).nullable(),
      source: z.union([z.literal("ip"), z.literal("")]),
    }),
  }),
  owner: z.object({ fullName: z.string().max(255), idNumber: z.string().max(100), phone: z.string().max(50), email: z.string().max(320) }),
  payment: z.object({ bankName: z.string().max(255), accountNumber: z.string().max(100), accountHolder: z.string().max(255) }),
});

function redactBasicLogoForAudit(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const basic = data as { info?: Record<string, unknown> };
  if (!basic.info?.logoDataUrl) return data;
  return { ...basic, info: { ...basic.info, logoDataUrl: "[IMAGE_DATA_OMITTED]" } };
}

settingsRouter.get(
  "/:group",
  asyncHandler(async (req, res) => {
    const group = req.params.group;
    if (!VALID_GROUPS.has(group)) throw Errors.notFound("nhóm cấu hình");
    if (group === "email" && !["OWNER", "MANAGER"].includes(req.user!.role)) throw Errors.forbidden();
    const data = await settingsRepo.get(req.user!.propertyId, group);
    res.json({ group, data: group === "email" ? redactEmailSettings(data) : data ?? {} });
  })
);

// Ghi cấu hình — chỉ OWNER/MANAGER được sửa cấu hình hệ thống cấp cơ sở (đối
// chiếu docs/PERMISSION_MATRIX.md: RECEPTIONIST/HOUSEKEEPING không được sửa
// cấu hình hệ thống, chỉ được thao tác nghiệp vụ hàng ngày).
settingsRouter.put(
  "/:group",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const group = req.params.group;
    if (!VALID_GROUPS.has(group)) throw Errors.notFound("nhóm cấu hình");
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const previous = group === "email" ? await settingsRepo.get(req.user!.propertyId, group) : undefined;
    const basicParsed = group === "basic" ? basicSettingsSchema.safeParse(parsed.data.data) : undefined;
    if (basicParsed && !basicParsed.success) throw Errors.validation(basicParsed.error.flatten());
    const inputData = basicParsed?.data ?? parsed.data.data;
    const storedData = group === "email" ? secureEmailSettings(inputData, previous) : inputData;
    const data = await settingsRepo.upsert(req.user!.propertyId, req.user!.tenantId, group, storedData);
    const responseData = group === "email" ? redactEmailSettings(data) : data;
    const auditData = group === "basic" ? redactBasicLogoForAudit(responseData) : responseData;
    await writeAuditLog({ req, action: "UPDATE_SETTINGS", entityType: "property_settings", entityId: group, afterData: auditData });
    res.json({ group, data: responseData });
  })
);
