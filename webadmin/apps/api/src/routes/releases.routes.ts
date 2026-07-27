import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { releasesRepo } from "../repositories/releases.repo";

// Release Console — theo PERMISSION_MATRIX.md: "Release Console: Xem (EXEC,
// OPS_SUPPORT) | ✓ (RELEASE_MANAGER)". Xem (GET) mở cho mọi role đăng nhập
// (đúng convention các module khác trong webadmin — không role nào bị chặn
// đọc); ghi (POST/PATCH — phát hành/rollback) chỉ RELEASE_MANAGER + SUPER_ADMIN.
export const releasesRouter = Router();
releasesRouter.use(requireAuth);

const appKeyEnum = z.enum([
  "KIOSK_APP",
  "PROPERTY_WEB",
  "PROPERTY_WINDOWS",
  "OWNER_MOBILE",
  "HOUSEKEEPING_MOBILE",
  "SUPER_ADMIN_WEB",
]);
const channelEnum = z.enum(["STABLE", "BETA"]);

releasesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await releasesRepo.list({
      appKey: req.query.appKey as string | undefined,
      channel: req.query.channel as string | undefined,
    });
    res.json({ items, total: items.length });
  })
);

releasesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await releasesRepo.findById(req.params.id);
    if (!item) throw Errors.notFound("bản phát hành");
    res.json(item);
  })
);

const createSchema = z.object({
  appKey: appKeyEnum,
  version: z.string().min(1),
  releaseNotes: z.string().optional(),
  channel: channelEnum.default("STABLE"),
  artifactUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

releasesRouter.post(
  "/",
  requireRole("RELEASE_MANAGER", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const release = await releasesRepo.create(parsed.data, req.user!.id);
    await writeAuditLog({ req, action: "PUBLISH_APP_RELEASE", entityType: "app_release", entityId: release.id, afterData: release });
    res.status(201).json(release);
  })
);

const patchSchema = z.object({ isActive: z.boolean() });

releasesRouter.patch(
  "/:id",
  requireRole("RELEASE_MANAGER", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await releasesRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("bản phát hành");

    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const release = await releasesRepo.setActive(req.params.id, parsed.data.isActive, req.user!.id);
    await writeAuditLog({
      req,
      action: parsed.data.isActive ? "ROLLBACK_ACTIVATE_APP_RELEASE" : "DEACTIVATE_APP_RELEASE",
      entityType: "app_release",
      entityId: req.params.id,
      beforeData: existing,
      afterData: release,
    });
    res.json(release);
  })
);
